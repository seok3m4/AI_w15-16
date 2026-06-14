import { IonIcon } from "@ionic/react";
import { contrastOutline, moonOutline, sunnyOutline } from "ionicons/icons";

import { THEME_MODES, type ThemeMode } from "./themeMode";
import { useThemePreference } from "./ThemeProvider";
import { useI18n } from "../i18n/I18nProvider";

const icons: Record<ThemeMode, string> = {
  system: contrastOutline,
  light: sunnyOutline,
  dark: moonOutline,
};

interface ThemeControlProps {
  onChangeComplete?: () => void;
}

export default function ThemeControl({ onChangeComplete }: ThemeControlProps) {
  const { mode, setMode } = useThemePreference();
  const { t } = useI18n();
  const labels: Record<ThemeMode, string> = {
    system: t("theme.system"),
    light: t("theme.light"),
    dark: t("theme.dark"),
  };

  return (
    <div className="theme-control" aria-label={t("theme.aria")} role="group">
      {THEME_MODES.map((item) => (
        <button
          aria-pressed={mode === item}
          className={mode === item ? "theme-control__item is-active" : "theme-control__item"}
          key={item}
          type="button"
          onClick={() => {
            setMode(item);
            onChangeComplete?.();
          }}
        >
          <IonIcon icon={icons[item]} />
          <span>{labels[item]}</span>
        </button>
      ))}
    </div>
  );
}
