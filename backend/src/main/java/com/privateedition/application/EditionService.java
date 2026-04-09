package com.privateedition.application;

import com.privateedition.domain.AppUser;
import com.privateedition.domain.AppUserRole;
import com.privateedition.config.SweetbookProperties;
import com.privateedition.domain.CreatorProfile;
import com.privateedition.domain.CreatorProfileRepository;
import com.privateedition.domain.CuratedAsset;
import com.privateedition.domain.CuratedAssetRepository;
import com.privateedition.domain.Edition;
import com.privateedition.domain.EditionRepository;
import com.privateedition.domain.EditionStatus;
import com.privateedition.domain.EditionVersion;
import com.privateedition.domain.EditionVersionRepository;
import com.privateedition.domain.PersonalizationSchema;
import com.privateedition.domain.PersonalizationSchemaRepository;
import com.privateedition.security.CurrentUserService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EditionService {

	private final CreatorProfileRepository creatorProfileRepository;
	private final EditionRepository editionRepository;
	private final EditionVersionRepository editionVersionRepository;
	private final CuratedAssetRepository curatedAssetRepository;
	private final PersonalizationSchemaRepository personalizationSchemaRepository;
	private final SweetbookProperties sweetbookProperties;
	private final CurrentUserService currentUserService;

	public List<EditionViews.Summary> listPublishedEditions() {
		return editionRepository.findByStatusOrderByUpdatedAtDesc(EditionStatus.PUBLISHED).stream()
			.map(edition -> toSummary(edition, requirePublishedVersion(edition.getId())))
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
					clonedDraft.setOfficialIntro(new LinkedHashMap<>(latestPublished.getOfficialIntro()));
					clonedDraft.setOfficialClosing(new LinkedHashMap<>(latestPublished.getOfficialClosing()));
				} else {
					clonedDraft.setBookSpecUid(sweetbookProperties.getDefaultBookSpecUid());
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
		version.setOfficialIntro(command.officialIntro() == null || command.officialIntro().isEmpty()
			? defaultIntro(version.getEdition())
			: new LinkedHashMap<>(command.officialIntro()));
		version.setOfficialClosing(command.officialClosing() == null || command.officialClosing().isEmpty()
			? defaultClosing(version.getEdition())
			: new LinkedHashMap<>(command.officialClosing()));
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
			PersonalizationSchema field = new PersonalizationSchema();
			field.setEditionVersion(version);
			field.setFieldKey(fieldInput.fieldKey());
			field.setLabel(fieldInput.label());
			field.setInputType(fieldInput.inputType());
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
			.map(original -> {
				PersonalizationSchema field = new PersonalizationSchema();
				field.setEditionVersion(target);
				field.setFieldKey(original.getFieldKey());
				field.setLabel(original.getLabel());
				field.setInputType(original.getInputType());
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
			edition.getCoverImageUrl(),
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
			edition.getCoverImageUrl(),
			edition.getStatus().name(),
			toCreatorView(edition.getCreator()),
			toSnapshotView(version),
			edition.getCreatedAt(),
			edition.getUpdatedAt()
		);
	}

	private EditionViews.Creator toCreatorView(CreatorProfile creator) {
		return new EditionViews.Creator(
			creator.getId(),
			creator.getDisplayName(),
			creator.getChannelHandle(),
			creator.getAvatarUrl(),
			creator.isVerified()
		);
	}

	private EditionViews.Snapshot toSnapshotView(EditionVersion version) {
		List<EditionViews.CuratedAsset> assets = curatedAssetRepository.findByEditionVersionIdOrderBySortOrderAsc(version.getId()).stream()
			.map(asset -> new EditionViews.CuratedAsset(
				asset.getId(),
				asset.getAssetType().name(),
				asset.getTitle(),
				asset.getContent(),
				asset.getSortOrder()
			))
			.toList();
		List<EditionViews.PersonalizationField> fields = personalizationSchemaRepository.findByEditionVersionIdOrderBySortOrderAsc(version.getId()).stream()
			.map(field -> new EditionViews.PersonalizationField(
				field.getId(),
				field.getFieldKey(),
				field.getLabel(),
				field.getInputType(),
				field.isRequired(),
				field.getMaxLength(),
				field.getSortOrder()
			))
			.toList();

		return new EditionViews.Snapshot(
			version.getId(),
			version.getVersionNumber(),
			version.getBookSpecUid(),
			new LinkedHashMap<>(version.getOfficialIntro()),
			new LinkedHashMap<>(version.getOfficialClosing()),
			version.getApprovedAt(),
			assets,
			fields
		);
	}

	private Map<String, Object> defaultIntro(Edition edition) {
		Map<String, Object> intro = new LinkedHashMap<>();
		intro.put("title", "Official intro");
		intro.put("message", edition == null ? "Creator approved message" : edition.getTitle() + "의 공식 인사말을 여기에 담습니다.");
		return intro;
	}

	private Map<String, Object> defaultClosing(Edition edition) {
		Map<String, Object> closing = new LinkedHashMap<>();
		closing.put("title", "Official closing");
		closing.put("message", edition == null ? "Creator closing note" : edition.getTitle() + "의 마지막 인사를 여기에 담습니다.");
		return closing;
	}
}
