package com.junglecamp.backend.controller;

import java.security.Principal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ApiController {

	@GetMapping("/status")
	public BackendStatus status() {
		return new BackendStatus(
				"Jungle AI Backend",
				"running",
				"Backend API is connected.");
	}

	@GetMapping("/me")
	public CurrentUser me(Principal principal) {
		return new CurrentUser(principal.getName());
	}

	public record BackendStatus(String service, String status, String message) {
	}

	public record CurrentUser(String username) {
	}
}
