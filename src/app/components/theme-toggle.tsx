import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        aria-hidden
        style={{ width: 36, height: 36, flexShrink: 0 }}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="flex items-center justify-center rounded-lg shrink-0"
      style={{
        width: 36,
        height: 36,
        padding: 0,
        background: "transparent",
        border: "1px solid var(--app-border-strong)",
        color: "var(--app-text-muted)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "var(--app-shell-bg-hover)";
        e.currentTarget.style.borderColor = "var(--app-border-strong)";
        e.currentTarget.style.color = "var(--app-text-primary)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "var(--app-border-strong)";
        e.currentTarget.style.color = "var(--app-text-muted)";
      }}
    >
      {isDark ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
    </button>
  );
}
