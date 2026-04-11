package com.playpick.application;

import com.playpick.config.AppProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Base64;
import java.util.EnumSet;
import java.util.Locale;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PublicAssetPublishingService {

	private final AppProperties appProperties;

	public boolean isConfigured() {
		return appProperties.getPublicAssetScpTarget() != null
			&& !appProperties.getPublicAssetScpTarget().isBlank()
			&& appProperties.getPublicAssetBaseUrl() != null
			&& !appProperties.getPublicAssetBaseUrl().isBlank();
	}

	public String publishFile(Path localFile, String fileName) {
		if (!isConfigured()) {
			throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "공개 자산 업로드 설정이 비어 있습니다.");
		}

		Path tempPrivateKey = null;
		try {
			tempPrivateKey = preparePrivateKeyFile();
			ProcessBuilder processBuilder = new ProcessBuilder(scpCommand(localFile, fileName, tempPrivateKey));
			processBuilder.redirectErrorStream(true);
			Process process = processBuilder.start();
			boolean finished = process.waitFor(30, TimeUnit.SECONDS);
			String output = new String(process.getInputStream().readAllBytes());
			if (!finished) {
				process.destroyForcibly();
				throw new AppException(HttpStatus.BAD_GATEWAY, "공개 이미지 서버 업로드가 시간 초과로 실패했습니다.");
			}
			if (process.exitValue() != 0) {
				throw new AppException(
					HttpStatus.BAD_GATEWAY,
					"공개 이미지 서버 업로드에 실패했습니다." + (output.isBlank() ? "" : " " + output.trim())
				);
			}
			return publicAssetUrl(fileName);
		} catch (IOException exception) {
			throw new AppException(HttpStatus.BAD_GATEWAY, "scp 실행에 실패했습니다. OpenSSH가 필요합니다.", exception);
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw new AppException(HttpStatus.BAD_GATEWAY, "공개 이미지 서버 업로드가 중단되었습니다.", exception);
		} finally {
			if (tempPrivateKey != null) {
				try {
					Files.deleteIfExists(tempPrivateKey);
				} catch (IOException ignored) {
				}
			}
		}
	}

	public String publishDataUrl(String dataUrl) {
		if (!isConfigured()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "data:image 자산을 공개 URL로 바꾸려면 공개 자산 업로드 설정이 필요합니다.");
		}
		if (dataUrl == null || !dataUrl.startsWith("data:image/")) {
			throw new AppException(HttpStatus.BAD_REQUEST, "지원하지 않는 data URL 형식입니다.");
		}

		int separator = dataUrl.indexOf(',');
		if (separator < 0) {
			throw new AppException(HttpStatus.BAD_REQUEST, "data URL 형식이 올바르지 않습니다.");
		}

		String metadata = dataUrl.substring(5, separator);
		String payload = dataUrl.substring(separator + 1);
		if (!metadata.contains(";base64")) {
			throw new AppException(HttpStatus.BAD_REQUEST, "base64 data URL만 지원합니다.");
		}

		String mimeType = metadata.substring(0, metadata.indexOf(';')).toLowerCase(Locale.ROOT);
		String extension = extensionForMimeType(mimeType);
		byte[] bytes;
		try {
			bytes = Base64.getDecoder().decode(payload);
		} catch (IllegalArgumentException exception) {
			throw new AppException(HttpStatus.BAD_REQUEST, "data URL base64를 해석하지 못했습니다.", exception);
		}

		String fileName = UUID.randomUUID() + extension;
		try {
			Path tempFile = Files.createTempFile("playpick-public-", extension);
			try {
				Files.write(tempFile, bytes);
				return publishFile(tempFile, fileName);
			} finally {
				Files.deleteIfExists(tempFile);
			}
		} catch (IOException exception) {
			throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "임시 공개 이미지를 만들지 못했습니다.", exception);
		}
	}

	private String extensionForMimeType(String mimeType) {
		return switch (mimeType) {
			case "image/png" -> ".png";
			case "image/webp" -> ".webp";
			case "image/gif" -> ".gif";
			default -> ".jpg";
		};
	}

	private String buildRemoteTarget(String fileName) {
		String target = appProperties.getPublicAssetScpTarget().trim();
		if (target.endsWith("/") || target.endsWith("\\")) {
			return target + fileName;
		}
		return target + "/" + fileName;
	}

	private List<String> scpCommand(Path localFile, String fileName, Path privateKeyPath) {
		List<String> command = new ArrayList<>();
		command.add("scp");

		if (privateKeyPath != null) {
			command.add("-F");
			command.add("/dev/null");
			command.add("-o");
			command.add("IdentitiesOnly=yes");
			command.add("-o");
			command.add("StrictHostKeyChecking=no");
			command.add("-o");
			command.add("UserKnownHostsFile=/dev/null");
			command.add("-i");
			command.add(privateKeyPath.toString());
		}

		command.add(localFile.toAbsolutePath().toString());
		command.add(buildRemoteTarget(fileName));
		return command;
	}

	private Path preparePrivateKeyFile() throws IOException {
		String sshKeyPath = appProperties.getPublicAssetSshKeyPath();
		if (sshKeyPath == null || sshKeyPath.isBlank()) {
			return null;
		}

		Path sourceKey = Path.of(sshKeyPath);
		Path tempKey = Files.createTempFile("playpick-ssh-key-", ".pem");
		Files.write(tempKey, Files.readAllBytes(sourceKey));
		try {
			Files.setPosixFilePermissions(tempKey, EnumSet.of(
				PosixFilePermission.OWNER_READ,
				PosixFilePermission.OWNER_WRITE
			));
		} catch (UnsupportedOperationException ignored) {
		}
		return tempKey;
	}

	private String publicAssetUrl(String fileName) {
		String baseUrl = appProperties.getPublicAssetBaseUrl();
		return baseUrl.endsWith("/") ? baseUrl + fileName : baseUrl + "/" + fileName;
	}
}
