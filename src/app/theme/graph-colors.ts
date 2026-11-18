/** Graph node/link palette — resolved hex values for Three.js and DOM. */

export interface GraphColorPalette {
  object: string;
  objectDim: string;
  objectBright: string;
  field: string;
  fieldLookup: string;
  fieldDim: string;
  layout: string;
  layoutDim: string;
  layoutBright: string;
}

export const GRAPH_COLORS_DARK: GraphColorPalette = {
  object: "#6366F1",
  objectDim: "#3B3E8A",
  objectBright: "#A5B4FC",
  field: "#10B981",
  fieldLookup: "#34D399",
  fieldDim: "#065F46",
  layout: "#F59E0B",
  layoutDim: "#78350F",
  layoutBright: "#FCD34D",
};

export const GRAPH_COLORS_LIGHT: GraphColorPalette = {
  object: "#4F46E5",
  objectDim: "#6366F1",
  objectBright: "#4338CA",
  field: "#059669",
  fieldLookup: "#10B981",
  fieldDim: "#047857",
  layout: "#D97706",
  layoutDim: "#B45309",
  layoutBright: "#F59E0B",
};

export function getGraphColors(resolvedTheme?: string | null): GraphColorPalette {
  // Use theme slug directly — CSS vars lag behind next-themes class toggle by one frame.
  return resolvedTheme === "light" ? { ...GRAPH_COLORS_LIGHT } : { ...GRAPH_COLORS_DARK };
}

export function getGraphBackground(resolvedTheme?: string | null): string {
  return resolvedTheme === "light" ? "#E2E8F0" : "#000000";
}

/** Label fill colors tuned for readability on the graph canvas per theme. */
export function getGraphLabelColor(
  c: GraphColorPalette,
  type: "object" | "field" | "layout",
  resolvedTheme?: string | null,
): string {
  if (resolvedTheme === "light") {
    if (type === "object") return "#3730A3";
    if (type === "field") return "#065F46";
    return "#92400E";
  }
  if (type === "object") return c.objectBright;
  if (type === "field") return c.fieldLookup;
  return c.layoutBright;
}

export interface GraphLabelStyle {
  stroke: string;
  skipStroke: boolean;
  strokeWidth: number;
}

export function getGraphLabelStroke(resolvedTheme?: string | null): string {
  // Halo keeps labels legible when they pass over colored spheres while rotating.
  return resolvedTheme === "light" ? "rgba(241, 245, 249, 0.96)" : "rgba(0, 0, 0, 0.92)";
}

export function getGraphLabelStyle(resolvedTheme?: string | null): GraphLabelStyle {
  if (resolvedTheme === "light") {
    return { stroke: "rgba(241, 245, 249, 0.96)", skipStroke: false, strokeWidth: 3.6 };
  }
  return { stroke: "rgba(0, 0, 0, 0.92)", skipStroke: false, strokeWidth: 3.2 };
}
