package com.playpick.api;

import com.playpick.application.StudioAssetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Studio Assets")
@RestController
@RequiredArgsConstructor
public class StudioAssetController {

	private final StudioAssetService studioAssetService;

	@Operation(summary = "Upload a studio cover image")
	@PostMapping("/api/studio/assets/cover")
	public AssetUploadResponse uploadCover(@RequestPart("file") MultipartFile file) {
		return new AssetUploadResponse(studioAssetService.uploadCover(file));
	}

	@Operation(summary = "Read a public studio asset")
	@GetMapping("/api/assets/{fileName}")
	public ResponseEntity<InputStreamResource> getAsset(@PathVariable String fileName) throws IOException {
		Path asset = studioAssetService.resolveAsset(fileName);
		String contentType = Files.probeContentType(asset);
		return ResponseEntity.ok()
			.contentType(contentType == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(contentType))
			.body(new InputStreamResource(Files.newInputStream(asset)));
	}
}

record AssetUploadResponse(String url) {
}
