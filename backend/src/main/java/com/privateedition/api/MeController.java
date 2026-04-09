package com.privateedition.api;

import com.privateedition.application.ProjectService;
import com.privateedition.application.ProjectViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Me")
@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

	private final ProjectService projectService;

	@Operation(summary = "List the current user's projects")
	@GetMapping("/projects")
	public List<ProjectViews.MyProjectSummary> getMyProjects() {
		return projectService.listMyProjects();
	}
}
