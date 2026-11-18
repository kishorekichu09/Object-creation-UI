/** Read a CSS custom property from :root (respects .dark). */
export function readThemeVar(name: string, fallback = ""): string {
  if (typeof document === "undefined") return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

export function isLightTheme(resolvedTheme?: string | null): boolean {
  return resolvedTheme === "light";
}
