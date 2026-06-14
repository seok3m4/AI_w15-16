package com.junglecamp.backend.i18n;

import java.util.Arrays;

public enum SupportedLocale {
	KO("ko"),
	EN("en"),
	ZH_HANS("zh-Hans"),
	ZH_HANT("zh-Hant"),
	JA("ja");

	private final String tag;

	SupportedLocale(String tag) {
		this.tag = tag;
	}

	public String tag() {
		return tag;
	}

	public static SupportedLocale fromTag(String value) {
		if (value == null || value.isBlank()) {
			return KO;
		}
		String normalized = value.trim();
		return Arrays.stream(values())
				.filter(locale -> locale.tag.equalsIgnoreCase(normalized))
				.findFirst()
				.orElseGet(() -> fromLanguagePrefix(normalized));
	}

	public static SupportedLocale fromAcceptLanguage(String value) {
		if (value == null || value.isBlank()) {
			return KO;
		}
		String firstLanguage = value.split(",", 2)[0].trim();
		return fromLanguagePrefix(firstLanguage);
	}

	private static SupportedLocale fromLanguagePrefix(String value) {
		String normalized = value.toLowerCase();
		if (normalized.startsWith("ko")) {
			return KO;
		}
		if (normalized.startsWith("en")) {
			return EN;
		}
		if (normalized.startsWith("ja")) {
			return JA;
		}
		if (normalized.startsWith("zh")) {
			if (normalized.contains("hant")
					|| normalized.contains("tw")
					|| normalized.contains("hk")
					|| normalized.contains("mo")) {
				return ZH_HANT;
			}
			return ZH_HANS;
		}
		return KO;
	}
}
