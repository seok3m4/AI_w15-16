import { SUPPORTED_LOCALES, type LocaleCode } from "./i18n";
import { useI18n } from "./I18nProvider";

interface LanguageControlProps {
  onChangeComplete?: () => void;
}

export default function LanguageControl({ onChangeComplete }: LanguageControlProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="language-control">
      <span>{t("language.label")}</span>
      <select
        aria-label={t("language.aria")}
        value={locale}
        onChange={(event) => {
          setLocale(event.target.value as LocaleCode);
          onChangeComplete?.();
        }}
      >
        {SUPPORTED_LOCALES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
