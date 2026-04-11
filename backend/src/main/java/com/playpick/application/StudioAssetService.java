package com.playpick.application;

import com.playpick.config.AppProperties;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class StudioAssetService {

	private static final long MAX_UPLOAD_BYTES = 10L * 1024L * 1024L;

	private final AppProperties appProperties;
	private final PublicAssetUrlResolver publicAssetUrlResolver;
	private final PublicAssetPublishingService publicAssetPublishingService;

	public String uploadCover(MultipartFile file) {
		return uploadImage(file);
	}

	public String uploadImage(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "업로드할 이미지를 선택해 주세요.");
		}
		if (file.getSize() > MAX_UPLOAD_BYTES) {
			throw new AppException(HttpStatus.BAD_REQUEST, "이미지는 10MB 이하만 업로드할 수 있습니다.");
		}

		String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
		if (!contentType.startsWith("image/")) {
			throw new AppException(HttpStatus.BAD_REQUEST, "이미지 파일만 업로드할 수 있습니다.");
		}

		String extension = resolveExtension(file.getOriginalFilename(), contentType);
		String fileName = UUID.randomUUID() + extension;
		Path root = assetRoot();

		try {
			Files.createDirectories(root);
			try (InputStream inputStream = file.getInputStream()) {
				Files.copy(inputStream, root.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);
			}
		} catch (IOException exception) {
			throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "이미지를 저장하지 못했습니다.");
		}

		if (publicAssetPublishingService.isConfigured()) {
			return publicAssetPublishingService.publishFile(root.resolve(fileName), fileName);
		}

		return publicAssetUrlResolver.resolve("/api/assets/" + fileName);
	}

	public Path resolveAsset(String fileName) {
		if (fileName == null || fileName.isBlank() || fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
			throw new AppException(HttpStatus.NOT_FOUND, "요청한 자산을 찾을 수 없습니다.");
		}

		Path asset = assetRoot().resolve(fileName).normalize();
		if (!asset.startsWith(assetRoot()) || !Files.exists(asset) || !Files.isRegularFile(asset)) {
			throw new AppException(HttpStatus.NOT_FOUND, "요청한 자산을 찾을 수 없습니다.");
		}
		return asset;
	}

	private Path assetRoot() {
		return Path.of(appProperties.getStudioAssetDir()).toAbsolutePath().normalize();
	}

	private String resolveExtension(String originalFilename, String contentType) {
		if (originalFilename != null) {
			int extensionIndex = originalFilename.lastIndexOf('.');
			if (extensionIndex >= 0 && extensionIndex < originalFilename.length() - 1) {
				return originalFilename.substring(extensionIndex).toLowerCase(Locale.ROOT);
			}
		}

		return switch (contentType) {
			case "image/png" -> ".png";
			case "image/webp" -> ".webp";
			case "image/gif" -> ".gif";
			default -> ".jpg";
		};
	}
}
