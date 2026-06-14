import { useEffect, useRef, useState } from "react";
import { IonIcon } from "@ionic/react";
import { globeOutline } from "ionicons/icons";

import { type LocaleCode } from "../i18n/i18n";
import LanguageControl from "../i18n/LanguageControl";
import { useI18n } from "../i18n/I18nProvider";
import ThemeControl from "./ThemeControl";

const localeBadges: Record<LocaleCode, string> = {
  ko: "KO",
  en: "EN",
  "zh-Hans": "简",
  "zh-Hant": "繁",
  ja: "日",
};

export default function DisplaySettingsControl() {
  const { locale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="display-settings" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`${t("language.aria")} / ${t("theme.aria")}`}
        className="display-settings__trigger"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <IonIcon icon={globeOutline} />
        <span>{localeBadges[locale]}</span>
      </button>

      {isOpen && (
        <div className="display-settings__panel" role="dialog">
          <section className="display-settings__section">
            <strong>{t("language.label")}</strong>
            <LanguageControl onChangeComplete={() => setIsOpen(false)} />
          </section>
          <section className="display-settings__section">
            <strong>{t("theme.aria")}</strong>
            <ThemeControl onChangeComplete={() => setIsOpen(false)} />
          </section>
        </div>
      )}
    </div>
  );
}
