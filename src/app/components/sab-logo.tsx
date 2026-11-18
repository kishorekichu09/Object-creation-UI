import React from "react";
import { useTheme } from "next-themes";
import sdpLogoDark from "../../assets/smart-data-platform-logo-dark.png";
import sdpLogoLight from "../../assets/smart-data-platform-logo.png";

const LOGO_HEIGHT = 32;

export function SabLogo() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isLight = mounted && resolvedTheme === "light";

  return (
    <img
      src={isLight ? sdpLogoLight : sdpLogoDark}
      alt="Smart Data Platform logo"
      className="shrink-0"
      style={{
        height: LOGO_HEIGHT,
        width: "auto",
        display: "block",
        objectFit: "contain",
      }}
    />
  );
}
