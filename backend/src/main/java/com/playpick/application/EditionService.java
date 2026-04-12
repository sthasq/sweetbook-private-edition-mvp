package com.playpick.application;

import com.playpick.domain.AppUser;
import com.playpick.domain.AppUserRole;
import com.playpick.config.SweetbookProperties;
import com.playpick.domain.CreatorProfile;
import com.playpick.domain.CreatorProfileRepository;
import com.playpick.domain.CuratedAsset;
import com.playpick.domain.CuratedAssetRepository;
import com.playpick.domain.Edition;
import com.playpick.domain.EditionRepository;
import com.playpick.domain.EditionStatus;
import com.playpick.domain.EditionVersion;
import com.playpick.domain.EditionVersionRepository;
import com.playpick.domain.PersonalizationSchema;
import com.playpick.domain.PersonalizationSchemaRepository;
import com.playpick.security.CurrentUserService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EditionService {

	private static final Set<String> SUPPORTED_PERSONALIZATION_INPUT_TYPES = Set.of(
		"TEXT",
		"TEXTAREA",
		"DATE"
	);

	private final CreatorProfileRepository creatorProfileRepository;
	private final EditionRepository editionRepository;
	private final EditionVersionRepository editionVersionRepository;
	private final CuratedAssetRepository curatedAssetRepository;
	private final PersonalizationSchemaRepository personalizationSchemaRepository;
	private final SweetbookProperties sweetbookProperties;
	private final CurrentUserService currentUserService;
	private final PublicAssetUrlResolver publicAssetUrlResolver;

	public List<EditionViews.Summary> listPublishedEditions() {
		return editionRepository.findByStatusOrderByUpdatedAtDesc(EditionStatus.PUBLISHED).stream()
			.map(edition -> toSummary(edition, requirePublishedVersion(edition.getId())))
			.toList();
	}

	public List<EditionViews.Summary> listOwnedEditions() {
		AppUser currentUser = currentUserService.requireCurrentAppUser(AppUserRole.CREATOR);
		return editionRepository.findByCreatorUserIdOrderByUpdatedAtDesc(currentUser.getId()).stream()
			.map(edition -> toSummary(edition, resolveOwnedSnapshot(edition)))
			.toList();
	}

	public Long getDefaultPublishedEditionId() {
		return editionRepository.findByStatusOrderByUpdatedAtDesc(EditionStatus.PUBLISHED).stream()
			.findFirst()
			.map(Edition::getId)
			.orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "No published edition available"));
	}

	public EditionViews.Detail getEdition(Long editionId) {
		Edition edition = requireEdition(editionId);
		EditionVersion snapshot = edition.getStatus() == EditionStatus.PUBLISHED
			? requirePublishedVersion(editionId)
			: editionVersionRepository.findTopByEditionIdAndApprovedAtIsNullOrderByIdDesc(editionId)
				.orElseGet(() -> editionVersionRepository.findTopByEditionIdOrderByVersionNumberDesc(editionId)
					.orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Edition version not found for edition " + editionId)));
		return toDetail(edition, snapshot);
	}

	public EditionViews.Detail getOwnedEdition(Long editionId) {
		Edition edition = requireOwnedEdition(editionId);
		return toDetail(edition, resolveOwnedSnapshot(edition));
	}

	public EditionVersion requirePublishedVersion(Long editionId) {
		return editionVersionRepository.findTopByEditionIdAndApprovedAtIsNotNullOrderByVersionNumberDesc(editionId)
			.orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Published snapshot not found for edition " + editionId));
	}

	@Transactional
	public EditionViews.Detail createEdition(EditionCommands.StudioEdition command) {
		CreatorProfile creator = resolveCreator(currentUserService.requireCurrentAppUser(AppUserRole.CREATOR));

		Edition edition = new Edition();
		edition.setCreator(creator);
		edition.setTitle(command.title());
		edition.setSubtitle(command.subtitle());
		edition.setCoverImageUrl(command.coverImageUrl());
		edition.setStatus(EditionStatus.DRAFT);
		edition = editionRepository.save(edition);

		EditionVersion draftVersion = new EditionVersion();
		draftVersion.setEdition(edition);
		draftVersion.setVersionNumber(0);
		applyVersionPayload(draftVersion, command);
		draftVersion = editionVersionRepository.save(draftVersion);
		replaceChildCollections(draftVersion, command);

		return toDetail(edition, draftVersion);
	}

	@Transactional
	public EditionViews.Detail updateEdition(Long editionId, EditionCommands.StudioEdition command) {
		Edition edition = requireOwnedEdition(editionId);
		EditionVersion draftVersion = loadOrCreateDraftVersion(edition);

		edition.setTitle(command.title());
		edition.setSubtitle(command.subtitle());
		edition.setCoverImageUrl(command.coverImageUrl());
		if (edition.getStatus() == null) {
			edition.setStatus(EditionStatus.DRAFT);
		}

		applyVersionPayload(draftVersion, command);
		editionRepository.save(edition);
		draftVersion = editionVersionRepository.save(draftVersion);
		replaceChildCollections(draftVersion, command);

		return toDetail(edition, draftVersion);
	}

	@Transactional
	public EditionViews.Detail publishEdition(Long editionId) {
		Edition edition = requireOwnedEdition(editionId);
		EditionVersion draftVersion = loadOrCreateDraftVersion(edition);
		int nextVersionNumber = editionVersionRepository.findTopByEditionIdAndApprovedAtIsNotNullOrderByVersionNumberDesc(editionId)
			.map(version -> version.getVersionNumber() + 1)
			.orElse(1);

		EditionVersion publishedVersion = new EditionVersion();
		publishedVersion.setEdition(edition);
		publishedVersion.setVersionNumber(nextVersionNumber);
		publishedVersion.setBookSpecUid(draftVersion.getBookSpecUid());
		publishedVersion.setSweetbookCoverTemplateUid(draftVersion.getSweetbookCoverTemplateUid());
		publishedVersion.setSweetbookPublishTemplateUid(draftVersion.getSweetbookPublishTemplateUid());
		publishedVersion.setSweetbookContentTemplateUid(draftVersion.getSweetbookContentTemplateUid());
		publishedVersion.setOfficialIntro(new LinkedHashMap<>(draftVersion.getOfficialIntro()));
		publishedVersion.setOfficialClosing(new LinkedHashMap<>(draftVersion.getOfficialClosing()));
		publishedVersion.setApprovedAt(Instant.now());
		publishedVersion = editionVersionRepository.save(publishedVersion);
		copyChildCollections(draftVersion, publishedVersion);

		edition.setStatus(EditionStatus.PUBLISHED);
		editionRepository.save(edition);

		return toDetail(edition, publishedVersion);
	}

	private CreatorProfile resolveCreator(AppUser currentUser) {
		return creatorProfileRepository.findByUserId(currentUser.getId())
			.orElseThrow(() -> new AppException(HttpStatus.FORBIDDEN, "Creator profile not linked to the current user"));
	}

	private Edition requireEdition(Long editionId) {
		return editionRepository.findById(editionId)
			.orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Edition not found: " + editionId));
	}

	private Edition requireOwnedEdition(Long editionId) {
		AppUser currentUser = currentUserService.requireCurrentAppUser(AppUserRole.CREATOR);
		Edition edition = requireEdition(editionId);
		CreatorProfile creator = edition.getCreator();
		if (creator.getUser() == null || !creator.getUser().getId().equals(currentUser.getId())) {
			throw new AppException(HttpStatus.FORBIDDEN, "You do not have access to this edition");
		}
		return edition;
	}

	private EditionVersion loadOrCreateDraftVersion(Edition edition) {
		return editionVersionRepository.findTopByEditionIdAndApprovedAtIsNullOrderByIdDesc(edition.getId())
			.orElseGet(() -> {
				EditionVersion clonedDraft = new EditionVersion();
				clonedDraft.setEdition(edition);
				clonedDraft.setVersionNumber(0);
				EditionVersion latestPublished = editionVersionRepository.findTopByEditionIdAndApprovedAtIsNotNullOrderByVersionNumberDesc(edition.getId())
					.orElse(null);
				if (latestPublished != null) {
					clonedDraft.setBookSpecUid(latestPublished.getBookSpecUid());
					clonedDraft.setSweetbookCoverTemplateUid(latestPublished.getSweetbookCoverTemplateUid());
					clonedDraft.setSweetbookPublishTemplateUid(latestPublished.getSweetbookPublishTemplateUid());
					clonedDraft.setSweetbookContentTemplateUid(latestPublished.getSweetbookContentTemplateUid());
					clonedDraft.setOfficialIntro(new LinkedHashMap<>(latestPublished.getOfficialIntro()));
					clonedDraft.setOfficialClosing(new LinkedHashMap<>(latestPublished.getOfficialClosing()));
				} else {
					clonedDraft.setBookSpecUid(sweetbookProperties.getDefaultBookSpecUid());
					clonedDraft.setSweetbookCoverTemplateUid(sweetbookProperties.getDefaultCoverTemplateUid());
					clonedDraft.setSweetbookPublishTemplateUid(sweetbookProperties.getDefaultPublishTemplateUid());
					clonedDraft.setSweetbookContentTemplateUid(sweetbookProperties.getDefaultContentTemplateUid());
					clonedDraft.setOfficialIntro(defaultIntro(edition));
					clonedDraft.setOfficialClosing(defaultClosing(edition));
				}
				EditionVersion savedDraft = editionVersionRepository.save(clonedDraft);
				if (latestPublished != null) {
					copyChildCollections(latestPublished, savedDraft);
				}
				return savedDraft;
			});
	}

	private void applyVersionPayload(EditionVersion version, EditionCommands.StudioEdition command) {
		version.setBookSpecUid(command.bookSpecUid() == null || command.bookSpecUid().isBlank()
			? sweetbookProperties.getDefaultBookSpecUid()
			: command.bookSpecUid());
		version.setSweetbookCoverTemplateUid(firstNonBlank(
			command.sweetbookCoverTemplateUid(),
			sweetbookProperties.getDefaultCoverTemplateUid()
		).toString());
		version.setSweetbookPublishTemplateUid(firstNonBlank(
			command.sweetbookPublishTemplateUid(),
			sweetbookProperties.getDefaultPublishTemplateUid()
		).toString());
		version.setSweetbookContentTemplateUid(firstNonBlank(
			command.sweetbookContentTemplateUid(),
			sweetbookProperties.getDefaultContentTemplateUid()
		).toString());
		version.setOfficialIntro(normalizeCopyBlock(command.officialIntro(), defaultIntro(version.getEdition())));
		version.setOfficialClosing(normalizeCopyBlock(command.officialClosing(), defaultClosing(version.getEdition())));
	}

	private Map<String, Object> normalizeCopyBlock(Map<String, Object> source, Map<String, Object> fallback) {
		if (source == null || source.isEmpty()) {
			return fallback;
		}

		Map<String, Object> normalized = new LinkedHashMap<>();
		normalized.put("title", firstNonBlank(source.get("title"), source.get("heading"), fallback.get("title")));
		normalized.put("message", firstNonBlank(source.get("message"), source.get("body"), fallback.get("message")));
		source.forEach((key, value) -> {
			String textKey = String.valueOf(key);
			if (!normalized.containsKey(textKey)) {
				normalized.put(textKey, value);
			}
		});
		return normalized;
	}

	private void replaceChildCollections(EditionVersion version, EditionCommands.StudioEdition command) {
		curatedAssetRepository.deleteByEditionVersionId(version.getId());
		personalizationSchemaRepository.deleteByEditionVersionId(version.getId());

		List<CuratedAsset> assets = new ArrayList<>();
		List<EditionCommands.CuratedAssetInput> assetInputs = command.curatedAssets() == null ? List.of() : command.curatedAssets();
		for (EditionCommands.CuratedAssetInput assetInput : assetInputs) {
			CuratedAsset asset = new CuratedAsset();
			asset.setEditionVersion(version);
			asset.setAssetType(assetInput.assetType());
			asset.setTitle(assetInput.title());
			asset.setContent(assetInput.content());
			asset.setSortOrder(assetInput.sortOrder());
			assets.add(asset);
		}
		curatedAssetRepository.saveAll(assets);

		List<PersonalizationSchema> fields = new ArrayList<>();
		List<EditionCommands.PersonalizationFieldInput> fieldInputs = command.personalizationFields() == null ? List.of() : command.personalizationFields();
		for (EditionCommands.PersonalizationFieldInput fieldInput : fieldInputs) {
			String inputType = normalizeSupportedInputType(fieldInput.inputType());
			PersonalizationSchema field = new PersonalizationSchema();
			field.setEditionVersion(version);
			field.setFieldKey(fieldInput.fieldKey());
			field.setLabel(fieldInput.label());
			field.setInputType(inputType);
			field.setRequired(fieldInput.required());
			field.setMaxLength(fieldInput.maxLength());
			field.setSortOrder(fieldInput.sortOrder());
			fields.add(field);
		}
		personalizationSchemaRepository.saveAll(fields);
	}

	private void copyChildCollections(EditionVersion source, EditionVersion target) {
		List<CuratedAsset> assets = curatedAssetRepository.findByEditionVersionIdOrderBySortOrderAsc(source.getId()).stream()
			.map(original -> {
				CuratedAsset asset = new CuratedAsset();
				asset.setEditionVersion(target);
				asset.setAssetType(original.getAssetType());
				asset.setTitle(original.getTitle());
				asset.setContent(original.getContent());
				asset.setSortOrder(original.getSortOrder());
				return asset;
			})
			.toList();
		curatedAssetRepository.saveAll(assets);

		List<PersonalizationSchema> fields = personalizationSchemaRepository.findByEditionVersionIdOrderBySortOrderAsc(source.getId()).stream()
			.filter(original -> isSupportedInputType(original.getInputType()))
			.map(original -> {
				PersonalizationSchema field = new PersonalizationSchema();
				field.setEditionVersion(target);
				field.setFieldKey(original.getFieldKey());
				field.setLabel(original.getLabel());
				field.setInputType(normalizeSupportedInputType(original.getInputType()));
				field.setRequired(original.isRequired());
				field.setMaxLength(original.getMaxLength());
				field.setSortOrder(original.getSortOrder());
				return field;
			})
			.toList();
		personalizationSchemaRepository.saveAll(fields);
	}

	private EditionViews.Summary toSummary(Edition edition, EditionVersion version) {
		return new EditionViews.Summary(
			edition.getId(),
			edition.getTitle(),
			edition.getSubtitle(),
			publicAssetUrlResolver.resolve(edition.getCoverImageUrl()),
			edition.getStatus().name(),
			toCreatorView(edition.getCreator()),
			edition.getUpdatedAt(),
			toSnapshotView(version)
		);
	}

	private EditionViews.Detail toDetail(Edition edition, EditionVersion version) {
		return new EditionViews.Detail(
			edition.getId(),
			edition.getTitle(),
			edition.getSubtitle(),
			publicAssetUrlResolver.resolve(edition.getCoverImageUrl()),
			edition.getStatus().name(),
			toCreatorView(edition.getCreator()),
			toSnapshotView(version),
			edition.getCreatedAt(),
			edition.getUpdatedAt()
		);
	}

	private EditionVersion resolveOwnedSnapshot(Edition edition) {
		if (edition.getStatus() == EditionStatus.PUBLISHED) {
			return requirePublishedVersion(edition.getId());
		}

		return editionVersionRepository.findTopByEditionIdAndApprovedAtIsNullOrderByIdDesc(edition.getId())
			.orElseGet(() -> editionVersionRepository.findTopByEditionIdOrderByVersionNumberDesc(edition.getId())
				.orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Edition version not found for edition " + edition.getId())));
	}

	private EditionViews.Creator toCreatorView(CreatorProfile creator) {
		return new EditionViews.Creator(
			creator.getId(),
			creator.getDisplayName(),
			creator.getChannelHandle(),
			publicAssetUrlResolver.resolve(creator.getAvatarUrl()),
			creator.isVerified()
		);
	}

	private EditionViews.Snapshot toSnapshotView(EditionVersion version) {
		List<EditionViews.CuratedAsset> assets = curatedAssetRepository.findByEditionVersionIdOrderBySortOrderAsc(version.getId()).stream()
			.map(asset -> new EditionViews.CuratedAsset(
				asset.getId(),
				asset.getAssetType().name(),
				asset.getTitle(),
				asset.getAssetType() == com.playpick.domain.CuratedAssetType.IMAGE
					? publicAssetUrlResolver.resolve(asset.getContent())
					: asset.getContent(),
				asset.getSortOrder()
			))
			.toList();
		List<EditionViews.PersonalizationField> fields = personalizationSchemaRepository.findByEditionVersionIdOrderBySortOrderAsc(version.getId()).stream()
			.filter(field -> isSupportedInputType(field.getInputType()))
			.map(field -> new EditionViews.PersonalizationField(
				field.getId(),
				field.getFieldKey(),
				field.getLabel(),
				normalizeSupportedInputType(field.getInputType()),
				field.isRequired(),
				field.getMaxLength(),
				field.getSortOrder()
			))
			.toList();

		return new EditionViews.Snapshot(
			version.getId(),
			version.getVersionNumber(),
			version.getBookSpecUid(),
			version.getSweetbookCoverTemplateUid(),
			version.getSweetbookPublishTemplateUid(),
			version.getSweetbookContentTemplateUid(),
			new LinkedHashMap<>(version.getOfficialIntro()),
			new LinkedHashMap<>(version.getOfficialClosing()),
			version.getApprovedAt(),
			assets,
			fields
		);
	}

	private Map<String, Object> defaultIntro(Edition edition) {
		Map<String, Object> intro = new LinkedHashMap<>();
		intro.put("title", "크리에이터 인사");
		intro.put("message", edition == null ? "크리에이터의 첫 인사를 여기에 적어 보세요." : edition.getTitle() + "의 첫 인사를 여기에 적어 보세요.");
		return intro;
	}

	private Map<String, Object> defaultClosing(Edition edition) {
		Map<String, Object> closing = new LinkedHashMap<>();
		closing.put("title", "마지막 인사");
		closing.put("message", edition == null ? "마지막에 남길 한마디를 여기에 적어 보세요." : edition.getTitle() + "의 마지막 한마디를 여기에 적어 보세요.");
		return closing;
	}

	private boolean isSupportedInputType(String inputType) {
		String normalized = normalizeInputType(inputType);
		return !normalized.isBlank() && SUPPORTED_PERSONALIZATION_INPUT_TYPES.contains(normalized);
	}

	private String normalizeSupportedInputType(String inputType) {
		String normalized = normalizeInputType(inputType);
		if (!SUPPORTED_PERSONALIZATION_INPUT_TYPES.contains(normalized)) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Unsupported personalization field input type: " + normalized);
		}
		return normalized;
	}

	private String normalizeInputType(String inputType) {
		return inputType == null ? "" : inputType.trim().toUpperCase(Locale.ROOT);
	}

	private Object firstNonBlank(Object... candidates) {
		for (Object candidate : candidates) {
			if (candidate instanceof String text && !text.isBlank()) {
				return text;
			}
		}
		return "";
	}
}
