package com.junglecamp.backend.i18n;

import org.springframework.stereotype.Component;

@Component("appLocaleResolver")
public class LocaleResolver {

	public SupportedLocale resolve(String localeParam, String acceptLanguage) {
		if (localeParam != null && !localeParam.isBlank()) {
			return SupportedLocale.fromTag(localeParam);
		}
		return SupportedLocale.fromAcceptLanguage(acceptLanguage);
	}

	public SupportedLocale resolve(String localeParam) {
		return resolve(localeParam, null);
	}
}
