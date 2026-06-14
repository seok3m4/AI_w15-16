package com.junglecamp.backend.system.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class StatusController {

	@GetMapping("/status")
	public BackendStatus status() {
		return new BackendStatus(
				"Jungle AI Backend",
				"running",
				"Backend API is connected.");
	}

	public record BackendStatus(String service, String status, String message) {
	}
}
