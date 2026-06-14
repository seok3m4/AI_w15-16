package com.junglecamp.backend.web.controller;

import java.security.Principal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class PageController {

	@GetMapping("/")
	public String home(Principal principal, Model model) {
		model.addAttribute("username", principal.getName());
		return "home";
	}

	@GetMapping("/login")
	public String login(
			@RequestParam(value = "error", required = false) String error,
			@RequestParam(value = "logout", required = false) String logout,
			Model model) {
		model.addAttribute("hasError", error != null);
		model.addAttribute("hasLogout", logout != null);
		return "login";
	}
}
