import React from "react";
import { Box, Briefcase, Layers, Users, ChevronRight } from "lucide-react";

export interface CardObjectField {
  id: string;
  label: string;
  fieldType?: string;
}

export interface CardObjectItem {
  id: string;
  label: string;
  description?: string;
  objectType?: string;
  fields: CardObjectField[];
  layoutCount?: number;
  relationshipCount?: number;
  isUserCreated?: boolean;
  createdAt?: number;
  accentColor?: string;
}

interface ObjectsCardViewProps {
  objects: CardObjectItem[];
  selectedId: string | null;
  /** When true (right panel open), grid collapses to 2 columns */
  panelOpen: boolean;
  onSelect: (id: string) => void;
  /** Extra top inset so floating toolbar never overlaps the grid */
  topInset?: number;
  filterActive?: boolean;
  filteredCount?: number;
  totalCount?: number;
}

/** Same accent palette as Use Template catalog cards */
const CATALOG_ACCENTS = [
  "#6366F1", "#10B981", "#F59E0B", "#0EA5E9",
  "#3B82F6", "#F43F5E", "#A855F7", "#14B8A6",
];

const GLASS_CARD: React.CSSProperties = {
  background: "color-mix(in srgb, var(--app-shell-bg-elevated) 78%, transparent)",
  backdropFilter: "blur(14px) saturate(1.1)",
  WebkitBackdropFilter: "blur(14px) saturate(1.1)",
  border: "1px solid var(--app-border)",
  boxShadow: "var(--app-wizard-floating-shadow)",
};

function accentFor(id: string, override?: string) {
  if (override) return override;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CATALOG_ACCENTS[h % CATALOG_ACCENTS.length];
}

function IconFor({ label, color }: { label: string; color: string }) {
  const key = label.toLowerCase();
  const props = { size: 18 as const, style: { color } };
  if (/employee|candidate|hire|people|user/.test(key)) return <Users {...props} />;
  if (/project|job|role|department|org/.test(key)) return <Briefcase {...props} />;
  if (/training|skill|onboard/.test(key)) return <Layers {...props} />;
  return <Box {...props} />;
}

export function ObjectsCardView({
  objects,
  selectedId,
  panelOpen,
  onSelect,
  topInset = 76,
  filterActive = false,
  filteredCount,
  totalCount,
}: ObjectsCardViewProps) {
  const shown = filteredCount ?? objects.length;
  const total = totalCount ?? objects.length;
  return (
    <div
      className="absolute inset-0 z-[5] overflow-y-auto font-sans"
      style={{
        boxSizing: "border-box",
        background: "color-mix(in srgb, var(--app-shell-bg-elevated) 12%, transparent)",
      }}
    >
      <style>{`
        .obj-card-scroll::-webkit-scrollbar{width:6px}
        .obj-card-scroll::-webkit-scrollbar-thumb{background:var(--app-scrollbar-thumb);border-radius:999px}
        .obj-card-scroll::-webkit-scrollbar-track{background:transparent}
        @keyframes objCardIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div
        className="obj-card-scroll max-w-[1120px] mx-auto px-6 py-6"
        style={{
          maxWidth: panelOpen ? 720 : 1120,
          paddingTop: topInset,
          width: "100%",
          boxSizing: "border-box",
          transition: "max-width 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",
        }}
      >
        {filterActive && (
          <div
            style={{
              marginBottom: 14,
              color: "var(--app-text-muted)",
              fontSize: 13,
              fontWeight: 400,
              lineHeight: 1.45,
            }}
          >
            Showing{" "}
            <span style={{ color: "var(--app-text-primary)", fontWeight: 600 }}>{shown}</span>
            {" "}of{" "}
            <span style={{ color: "var(--app-text-primary)", fontWeight: 600 }}>{total}</span>
            {" "}objects that match your filters.
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: panelOpen
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 14,
          }}
        >
          {objects.map((obj, i) => {
            const selected = selectedId === obj.id;
            const accent = accentFor(obj.id, obj.accentColor);
            const chips = obj.fields.slice(0, 3).map(f => f.label);
            const fieldCount = obj.fields.length;
            const layoutCount = obj.layoutCount ?? 0;
            const relCount = obj.relationshipCount ?? 0;
            const typeLabel = obj.objectType || "Object";
            const tagline =
              fieldCount > 0
                ? `${fieldCount} fields ready for your app`
                : "No fields configured yet";
            return (
              <button
                key={obj.id}
                type="button"
                onClick={() => onSelect(obj.id)}
                aria-pressed={selected}
                aria-label={`${obj.label} — ${fieldCount} fields`}
                className="text-left"
                style={{
                  animation: `objCardIn 0.28s ease ${Math.min(i, 12) * 0.04}s both`,
                  padding: "16px 16px 14px",
                  borderRadius: 14,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s, transform 0.15s",
                  minWidth: 0,
                  ...GLASS_CARD,
                  border: selected
                    ? `1px solid ${accent}`
                    : "1px solid var(--app-border)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = accent;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = selected ? accent : "var(--app-border)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 11,
                      background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${accent} 30%, var(--app-border))`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconFor label={obj.label} color={accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        title={obj.label}
                        style={{
                          color: "var(--app-text-primary)",
                          fontSize: 14,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "100%",
                        }}
                      >
                        {obj.label}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          padding: "2px 7px",
                          borderRadius: 999,
                          background: "var(--app-border-subtle)",
                          color: "var(--app-text-secondary)",
                          border: "1px solid var(--app-border)",
                        }}
                      >
                        {typeLabel}
                      </span>
                    </div>
                    <div
                      style={{
                        color: "var(--app-text-secondary)",
                        fontSize: 12,
                        fontWeight: 400,
                        marginTop: 4,
                      }}
                    >
                      {tagline}
                    </div>
                  </div>
                  <ChevronRight
                    size={14}
                    style={{ color: "var(--app-text-subtle)", marginTop: 4, flexShrink: 0 }}
                  />
                </div>

                {obj.description ? (
                  <p
                    title={obj.description}
                    style={{
                      color: "var(--app-text-muted)",
                      fontSize: 11,
                      fontWeight: 400,
                      lineHeight: 1.45,
                      margin: "10px 0 0",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      wordBreak: "break-word",
                      maxHeight: "calc(1.45em * 2)",
                    }}
                  >
                    {obj.description}
                  </p>
                ) : null}

                <div
                  style={{
                    color: "var(--app-text-subtle)",
                    fontSize: 10,
                    fontWeight: 400,
                    marginTop: 10,
                  }}
                >
                  {fieldCount} fields · {layoutCount} layouts · {relCount} relationships
                </div>

                <div className="flex flex-wrap gap-1.5" style={{ marginTop: 10 }}>
                  {chips.map(chip => (
                    <span
                      key={chip}
                      title={chip}
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: `color-mix(in srgb, ${accent} 12%, var(--app-shell-bg-input))`,
                        border: `1px solid color-mix(in srgb, ${accent} 22%, var(--app-border))`,
                        color: "var(--app-text-secondary)",
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                  {fieldCount > 3 && (
                    <span style={{ fontSize: 10, color: "var(--app-text-subtle)", alignSelf: "center" }}>
                      +{fieldCount - 3} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {objects.length === 0 && (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              borderRadius: 14,
              border: "1px dashed var(--app-border)",
              background: "color-mix(in srgb, var(--app-shell-bg-elevated) 60%, transparent)",
            }}
          >
            <div style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              No objects match
            </div>
            <div style={{ color: "var(--app-text-muted)", fontSize: 13, lineHeight: 1.45 }}>
              {filterActive
                ? "Try different filters, or clear all to show every object again."
                : "No objects match your search."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
