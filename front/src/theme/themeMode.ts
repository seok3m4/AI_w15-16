export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "jungle-ai-theme";
export const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function readStoredThemeMode(storage: Storage | undefined = window.localStorage): ThemeMode {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY) ?? null;
    return isThemeMode(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function resolveThemeMode(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === "system") {
    return prefersDark ? "dark" : "light";
  }
  return mode;
}

export function writeStoredThemeMode(mode: ThemeMode, storage: Storage | undefined = window.localStorage) {
  try {
    storage?.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Storage may be unavailable in private or embedded contexts.
  }
}

export function applyThemeAttributes(mode: ThemeMode, resolvedTheme: ResolvedTheme, element = document.documentElement) {
  element.dataset.themeMode = mode;
  element.dataset.theme = resolvedTheme;
  element.style.colorScheme = resolvedTheme;
}
