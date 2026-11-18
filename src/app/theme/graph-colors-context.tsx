import React, { createContext, useContext } from "react";
import { GRAPH_COLORS_DARK, type GraphColorPalette } from "./graph-colors";

const GraphColorsContext = createContext<GraphColorPalette>(GRAPH_COLORS_DARK);

export function GraphColorsProvider({
  colors,
  children,
}: {
  colors: GraphColorPalette;
  children: React.ReactNode;
}) {
  return (
    <GraphColorsContext.Provider value={colors}>
      {children}
    </GraphColorsContext.Provider>
  );
}

export function useGraphColors(): GraphColorPalette {
  return useContext(GraphColorsContext);
}
