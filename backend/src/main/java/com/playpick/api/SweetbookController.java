package com.playpick.api;

import com.playpick.application.SweetbookService;
import com.playpick.application.SweetbookViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Sweetbook")
@RestController
@RequestMapping("/api/sweetbook")
@RequiredArgsConstructor
public class SweetbookController {

	private final SweetbookService sweetbookService;

	@Operation(summary = "List Sweetbook book specs")
	@GetMapping("/book-specs")
	public List<SweetbookViews.BookSpec> getBookSpecs() {
		return sweetbookService.getBookSpecs();
	}

	@Operation(summary = "List Sweetbook templates")
	@GetMapping("/templates")
	public List<SweetbookViews.Template> getTemplates(@RequestParam(defaultValue = "SQUAREBOOK_HC") String bookSpecUid) {
		return sweetbookService.getTemplates(bookSpecUid);
	}

	@Operation(summary = "Get Sweetbook integration mode")
	@GetMapping("/status")
	public SweetbookViews.IntegrationStatus getIntegrationStatus() {
		return sweetbookService.getIntegrationStatus();
	}
}
