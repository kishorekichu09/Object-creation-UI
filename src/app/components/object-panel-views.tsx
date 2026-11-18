import React, { useMemo, useState } from "react";
import {
  ChevronRight, ChevronUp, ChevronDown, ArrowLeft, ArrowRight, User,
  Search, Check, LayoutTemplate, Loader, Database, AppWindow, Share2,
} from "lucide-react";

const INPUT: React.CSSProperties = {
  width: "100%", background: "var(--app-shell-bg-input)", border: "1px solid var(--app-border-strong)",
  borderRadius: 8, padding: "8px 11px", color: "var(--app-text-primary)", fontSize: 13, outline: "none",
  transition: "border-color 0.2s", fontFamily: "inherit",
};

const ICON_BTN: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent",
  cursor: "pointer", color: "var(--app-text-muted)", padding: 0,
  transition: "background 0.15s, color 0.15s",
};

const BTN_OUTLINE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px",
  borderRadius: 8, cursor: "pointer", background: "transparent",
  border: "1px solid var(--app-border)", color: "var(--app-text-primary)",
  fontSize: 13, fontWeight: 500, fontFamily: "inherit",
};

const BTN_PRIMARY: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px",
  borderRadius: 8, border: "none", cursor: "pointer", background: "var(--app-btn-primary-bg)",
  color: "var(--app-btn-primary-text)", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
};

interface LayoutRef {
  id: string;
  label: string;
  layoutType?: string;
}
function PanelSubHeader({
  objectLabel, pageLabel, onBack,
}: {
  objectLabel: string; pageLabel: string; onBack: () => void; onClose?: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-border px-5 pb-3 pt-4">
      <div className="flex min-h-[22px] items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          style={ICON_BTN}
          onMouseEnter={e => {
            e.currentTarget.style.background = "var(--app-shell-bg-hover)";
            e.currentTarget.style.color = "var(--app-text-primary)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--app-text-muted)";
          }}
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm leading-[22px]">
          <button type="button" onClick={onBack} style={{ ...BTN_OUTLINE, height: "auto", padding: 0, border: "none", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--app-text-muted)", background: "transparent" }}>{objectLabel}</button>
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
          <span className="whitespace-nowrap font-medium text-foreground">{pageLabel}</span>
        </div>
      </div>
    </div>
  );
}

type MetaHistoryEntry =
  | {
      id: string;
      kind: "change";
      date: string;
      time: string;
      title: string;
      details: { field: string; from: string; to: string }[];
    }
  | {
      id: string;
      kind: "lock";
      date: string;
      time: string;
      title: string;
      lockedBy: string;
    };

function demoMetaHistory(objectId: string, objectLabel: string): MetaHistoryEntry[] {
  const fieldHint = (objectLabel.split(/\s+/)[0] || "field").slice(0, 10).toLowerCase();
  // Descending: newest first
  return [
    {
      id: `${objectId}-h1`,
      kind: "change",
      date: "02 Sep 26",
      time: "6:08pm",
      title: "field prominent enabled changes",
      details: [{ field: fieldHint, from: "Y", to: "N" }],
    },
    {
      id: `${objectId}-h2`,
      kind: "change",
      date: "29 Apr 26",
      time: "11:47am",
      title: "field prominent enabled changes",
      details: [{ field: fieldHint, from: "Y", to: "N" }],
    },
    {
      id: `${objectId}-h3`,
      kind: "lock",
      date: "29 Apr 26",
      time: "11:40am",
      title: "Locking Start",
      lockedBy: "sankar.s.",
    },
  ];
}

export function MetaChangeHistoryView({
  objectLabel, objectId, onBack,
}: {
  objectLabel: string; objectId: string; onBack: () => void; onClose?: () => void;
}) {
  const entries = useMemo(() => demoMetaHistory(objectId, objectLabel), [objectId, objectLabel]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(entries.map(e => [e.id, true])),
  );
  const [showOld, setShowOld] = useState(false);

  const titleFor = (entry: MetaHistoryEntry) => {
    if (entry.kind === "lock") return "Object locked";
    if (/prominent/i.test(entry.title)) return "Field prominence updated";
    return entry.title.charAt(0).toUpperCase() + entry.title.slice(1);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, animation: "panelIn 0.22s ease" }}>
      <div className="shrink-0 border-b border-border px-5 pb-3 pt-4">
        <div className="flex min-h-[22px] items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            style={ICON_BTN}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--app-shell-bg-hover)";
              e.currentTarget.style.color = "var(--app-text-primary)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--app-text-muted)";
            }}
          >
            <ArrowLeft size={14} />
          </button>
          <h3 className="m-0 min-w-0 flex-1 truncate" style={{ fontSize: 15, fontWeight: 600, color: "var(--app-text-primary)" }}>
            Meta Change History
          </h3>
        </div>
      </div>

      <div
        className="props-scroll flex-1 overflow-y-auto overflow-x-hidden px-5 py-4"
        style={{ minHeight: 0, scrollbarWidth: "thin", scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent" }}
      >
        <div style={{ position: "relative" }}>
          {entries.map((entry, idx) => {
            const isOpen = expanded[entry.id] !== false;
            const isLock = entry.kind === "lock";
            const isLast = idx === entries.length - 1;

            return (
              <div
                key={entry.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "72px 16px 1fr",
                  columnGap: 10,
                  marginBottom: isLast ? 8 : 22,
                }}
              >
                {/* Date + time — optically align with ArrowLeft glyph (14px in 28px ICON_BTN) */}
                <div style={{ textAlign: "left", paddingTop: 1, paddingLeft: 7 }}>
                  <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, lineHeight: 1.3, marginBottom: 2 }}>
                    {entry.date}
                  </div>
                  <div style={{ color: "var(--app-text-secondary)", fontSize: 11, fontWeight: 500, lineHeight: 1.3 }}>
                    {entry.time}
                  </div>
                </div>

                {/* Rail */}
                <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                  {!isLast && (
                    <div style={{
                      position: "absolute", top: 14, bottom: -22, width: 1,
                      background: "var(--app-border)",
                    }} />
                  )}
                  <div style={{
                    marginTop: 4, width: 9, height: 9, borderRadius: "50%", zIndex: 1, flexShrink: 0,
                    background: isLock ? "var(--app-accent)" : "var(--app-shell-bg-panel)",
                    border: `2px solid ${isLock ? "var(--app-accent)" : "var(--app-text-muted)"}`,
                    boxSizing: "border-box",
                  }} />
                </div>

                {/* Content */}
                <div style={{ minWidth: 0, paddingBottom: 2 }}>
                  <div className="flex items-start justify-between gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        color: "var(--app-text-primary)",
                        fontSize: 13,
                        fontWeight: 600,
                        lineHeight: 1.35,
                      }}>
                        {titleFor(entry)}
                      </div>
                      {isLock && (
                        <div style={{ marginTop: 2, color: "var(--app-text-muted)", fontSize: 11, lineHeight: 1.35 }}>
                          Locking started
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpanded(prev => ({ ...prev, [entry.id]: !isOpen }))}
                      aria-label={isOpen ? "Collapse" : "Expand"}
                      style={{
                        ...ICON_BTN,
                        width: 24,
                        height: 24,
                        flexShrink: 0,
                        marginTop: -2,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "var(--app-shell-bg-hover)";
                        e.currentTarget.style.color = "var(--app-text-primary)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--app-text-muted)";
                      }}
                    >
                      {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>

                  {isOpen && entry.kind === "change" && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      {entry.details.map((d, i) => (
                        <div
                          key={i}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid var(--app-border-subtle)",
                            background: "var(--app-shell-bg-subtle)",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 3 }}>
                              Modified field
                            </div>
                            <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {d.field}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
                            <span style={{
                              minWidth: 24, height: 22, padding: "0 7px", borderRadius: 6,
                              border: "1px solid var(--app-border)",
                              background: "var(--app-shell-bg-input)",
                              color: "var(--app-text-secondary)",
                              fontSize: 11, fontWeight: 600,
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            }}>
                              {d.from}
                            </span>
                            <ArrowRight size={12} style={{ color: "var(--app-text-muted)" }} />
                            <span style={{
                              minWidth: 24, height: 22, padding: "0 7px", borderRadius: 6,
                              border: "1px solid var(--app-border-strong)",
                              background: "var(--app-shell-bg-panel)",
                              color: "var(--app-text-primary)",
                              fontSize: 11, fontWeight: 700,
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            }}>
                              {d.to}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isOpen && entry.kind === "lock" && (
                    <div
                      className="flex items-center gap-2"
                      style={{
                        marginTop: 10,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--app-border-subtle)",
                        background: "var(--app-shell-bg-subtle)",
                      }}
                    >
                      <span style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        background: "var(--app-shell-bg-input)",
                        border: "1px solid var(--app-border)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <User size={11} style={{ color: "var(--app-text-secondary)" }} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: "var(--app-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                          Locked by
                        </div>
                        <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 500 }}>
                          {entry.lockedBy}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowOld(v => !v)}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--app-accent)",
            fontSize: 12,
            fontWeight: 600,
            padding: 0,
            marginLeft: 98,
            marginTop: 8,
          }}
        >
          {showOld ? "Hide older changes" : "Show older changes"}
        </button>
        {showOld && (
          <div style={{ marginLeft: 98, marginTop: 10, color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.45 }}>
            No older meta changes for this object in the current session.
          </div>
        )}
      </div>
    </div>
  );
}

type CountsTab = "layouts" | "loaders" | "dataObjects" | "applications";

const COUNTS_TABS: { id: CountsTab; label: string; Icon: React.ElementType; accent: string }[] = [
  { id: "layouts", label: "Layouts", Icon: LayoutTemplate, accent: "#F59E0B" },
  { id: "loaders", label: "Loaders", Icon: Loader, accent: "#60A5FA" },
  { id: "dataObjects", label: "Data Objects", Icon: Database, accent: "var(--app-asset-data)" },
  { id: "applications", label: "Applications", Icon: AppWindow, accent: "var(--app-asset-app)" },
];

type CountItem = { id: string; label: string; sub: string; navigable?: boolean };

function demoCountLists(objectId: string, objectLabel: string, layouts: LayoutRef[]) {
  let h = 0;
  for (let i = 0; i < objectId.length; i++) h = ((h << 5) - h + objectId.charCodeAt(i)) | 0;

  const layoutItems: CountItem[] = layouts.length > 0
    ? layouts.map(l => ({ id: l.id, label: l.label, sub: l.layoutType ?? "Layout", navigable: true }))
    : [
        { id: `${objectId}_lay_1`, label: `${objectLabel} Entry`, sub: "Form View" },
        { id: `${objectId}_lay_2`, label: `${objectLabel} List`, sub: "List View" },
        { id: `${objectId}_lay_3`, label: `${objectLabel} Details`, sub: "Detail View" },
        { id: `${objectId}_lay_4`, label: `${objectLabel} Search`, sub: "Search View" },
        { id: `${objectId}_lay_5`, label: `${objectLabel} Summary`, sub: "Summary View" },
      ];
  while (layoutItems.length < 5) {
    layoutItems.push({
      id: `${objectId}_lay_extra_${layoutItems.length}`,
      label: `${objectLabel} View ${layoutItems.length + 1}`,
      sub: "Layout",
    });
  }

  const loaders: CountItem[] = [
    { id: `${objectId}_ldr_1`, label: `${objectLabel} CSV Loader`, sub: "Inbound" },
    { id: `${objectId}_ldr_2`, label: `${objectLabel} API Loader`, sub: "Service" },
    { id: `${objectId}_ldr_3`, label: `${objectLabel} Batch Sync`, sub: "Scheduled" },
  ].slice(0, 2 + (Math.abs(h) % 2));

  const dataObjects: CountItem[] = [
    { id: `${objectId}_do_1`, label: `${objectLabel} Mirror`, sub: "Linked object" },
    { id: `${objectId}_do_2`, label: `${objectLabel} Staging`, sub: "Staging" },
  ];

  const applications: CountItem[] = [
    { id: `${objectId}_app_1`, label: "HR Workspace", sub: "Assigned app" },
  ];

  return { layouts: layoutItems, loaders, dataObjects, applications };
}

export function getObjectAssetLists(objectId: string, objectLabel: string, layouts: LayoutRef[]) {
  return demoCountLists(objectId, objectLabel, layouts);
}

export function ObjectCountsView({
  objectLabel, objectId, layouts, onBack, onClose, onOpenItem,
}: {
  objectLabel: string;
  objectId: string;
  layouts: LayoutRef[];
  onBack: () => void;
  onClose: () => void;
  onOpenItem: (id: string) => void;
}) {
  const [tab, setTab] = useState<CountsTab>("layouts");
  const lists = useMemo(() => demoCountLists(objectId, objectLabel, layouts), [objectId, objectLabel, layouts]);
  const active = lists[tab];
  const counts: Record<CountsTab, number> = {
    layouts: lists.layouts.length,
    loaders: lists.loaders.length,
    dataObjects: lists.dataObjects.length,
    applications: lists.applications.length,
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, animation: "panelIn 0.22s ease" }}>
      <PanelSubHeader objectLabel={objectLabel} pageLabel="Counts" onBack={onBack} onClose={onClose} />

      <div
        className="props-scroll flex-1 overflow-y-auto overflow-x-hidden"
        style={{ minHeight: 0, scrollbarWidth: "thin", scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent" }}
      >
        <div style={{
          margin: "14px 16px 0", borderRadius: 10, overflow: "hidden",
          border: "1px solid var(--app-border)", background: "var(--app-shell-bg-subtle)",
        }}>
          <div style={{
            padding: "12px 14px 0",
            borderBottom: "1px solid var(--app-border)",
            background: "rgba(15,23,42,0.35)",
          }}>
            <div style={{ color: "var(--app-text-primary)", fontSize: 13, fontWeight: 600 }}>Usage counts</div>
            <div style={{ color: "var(--app-text-muted)", fontSize: 11, marginTop: 2, marginBottom: 10 }}>
              Related assets linked to this object
            </div>
            <div className="flex" style={{ gap: 0, overflowX: "auto", overflowY: "hidden" }}>
              {COUNTS_TABS.map(t => {
                const selected = tab === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => setTab(t.id)}
                    style={{
                      display: "flex", flexShrink: 0, alignItems: "center", gap: 6, border: "none",
                      background: "transparent", padding: "10px 12px", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", marginBottom: -1,
                      borderBottom: selected ? `2px solid ${t.accent}` : "2px solid transparent",
                      color: selected ? "var(--app-text-primary)" : "var(--app-text-muted)",
                    }}>
                    <t.Icon size={14} style={{ color: selected ? t.accent : undefined }} />
                    {t.label}
                    <span className="ml-0.5 text-[10px] font-bold" style={{ color: selected ? t.accent : undefined }}>
                      {counts[t.id]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: "10px 8px 12px" }}>
            {active.length === 0 && (
              <div style={{ color: "var(--app-text-muted)", fontSize: 12, padding: "12px 8px" }}>No items in this category.</div>
            )}
            {active.map(item => {
              const canOpen = Boolean(item.navigable);
              return (
                <button
                  type="button"
                  onClick={() => { if (canOpen) onOpenItem(item.id); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%", marginBottom: 2,
                    padding: "10px", borderRadius: 8, border: "none", background: "transparent",
                    cursor: canOpen ? "pointer" : "default", fontFamily: "inherit", textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: COUNTS_TABS.find(t => t.id === tab)?.accent ?? "var(--app-text-muted)",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.label}
                    </div>
                    <div style={{ color: "var(--app-text-muted)", fontSize: 10 }}>{item.sub}</div>
                  </div>
                  {canOpen && <ChevronRight size={12} style={{ color: "var(--app-text-muted)", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

type SharePerm = "read" | "update" | "delete" | "share";
const SHARE_PERMS: { id: SharePerm; label: string }[] = [
  { id: "read", label: "Read" },
  { id: "update", label: "Update" },
  { id: "delete", label: "Delete" },
  { id: "share", label: "Share" },
];

const DEMO_SHARE_PEOPLE = [
  { id: "p1", email: "alex.rivera@company.com", name: "Alex Rivera" },
  { id: "p2", email: "priya.shah@company.com", name: "Priya Shah" },
  { id: "p3", email: "jordan.lee@company.com", name: "Jordan Lee" },
  { id: "p4", email: "sam.okonkwo@company.com", name: "Sam Okonkwo" },
  { id: "p5", email: "casey.nguyen@company.com", name: "Casey Nguyen" },
  { id: "p6", email: "sankar.s@company.com", name: "Sankar S." },
  { id: "p7", email: "mia.chen@company.com", name: "Mia Chen" },
  { id: "p8", email: "noah.patel@company.com", name: "Noah Patel" },
  { id: "p9", email: "ava.brooks@company.com", name: "Ava Brooks" },
  { id: "p10", email: "liam.ortega@company.com", name: "Liam Ortega" },
  { id: "p11", email: "zoe.martin@company.com", name: "Zoe Martin" },
  { id: "p12", email: "ethan.kim@company.com", name: "Ethan Kim" },
];

export function ObjectShareView({
  objectLabel, onBack, onClose, onShared,
}: {
  objectLabel: string;
  onBack: () => void;
  onClose: () => void;
  onShared?: (info: { objectLabel: string; peopleCount: number }) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [perms, setPerms] = useState<Record<string, Set<SharePerm>>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DEMO_SHARE_PEOPLE;
    return DEMO_SHARE_PEOPLE.filter(p =>
      p.email.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    );
  }, [query]);

  const selectedPeople = useMemo(
    () => DEMO_SHARE_PEOPLE.filter(p => selected.has(p.id)),
    [selected],
  );

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        setPerms(p => (p[id] ? p : { ...p, [id]: new Set<SharePerm>(["read"]) }));
      }
      return next;
    });
  };

  const togglePerm = (id: string, perm: SharePerm) => {
    setPerms(prev => {
      const cur = new Set(prev[id] ?? []);
      if (cur.has(perm)) cur.delete(perm);
      else cur.add(perm);
      return { ...prev, [id]: cur };
    });
  };

  const handleConfirmShare = () => {
    const peopleCount = selectedPeople.length;
    setConfirmOpen(false);
    onShared?.({ objectLabel, peopleCount });
    onBack();
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, animation: "panelIn 0.22s ease" }}>
      <PanelSubHeader objectLabel={objectLabel} pageLabel="Share" onBack={onBack} onClose={onClose} />

      <div className="shrink-0 px-5 pb-2 pt-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <Search className="size-3.5 shrink-0" style={{ color: "var(--app-text-primary)" }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search email or name…" style={{ ...INPUT, flex: 1, border: "none", background: "transparent", padding: "4px 0" }} />
        </div>
        <div className="mt-2 text-xs" style={{ color: "var(--app-text-muted)" }}>
          Multi-select people, then set Read / Update / Delete / Share
        </div>
      </div>

      <div
        className="props-scroll flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4"
        style={{ minHeight: 0, scrollbarWidth: "thin", scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent" }}
      >
        {filtered.map(person => {
          const on = selected.has(person.id);
          const personPerms = perms[person.id] ?? new Set<SharePerm>();
          return (
            <div key={person.id}
              style={{
                marginBottom: 8, borderRadius: 10, padding: "10px 10px 8px",
                background: on ? "var(--app-shell-bg-accent)" : "var(--app-shell-bg-subtle)",
                border: `1px solid ${on ? "var(--app-border-accent)" : "var(--app-border-subtle)"}`,
              }}>
              <button
                type="button"
                onClick={() => toggleSelect(person.id)}
                className="w-full flex items-center gap-2.5 text-left"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${on ? "var(--app-accent)" : "var(--app-border-strong)"}`,
                  background: on ? "var(--app-accent)" : "var(--app-shell-bg-input)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {on && <Check size={10} style={{ color: "var(--app-text-on-accent)" }} />}
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: "var(--app-shell-bg-input)",
                  border: "1px solid var(--app-border-strong)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--app-text-primary)", fontSize: 10, fontWeight: 700,
                }}>
                  {person.name.split(" ").map(p => p[0]).join("").slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 500 }}>{person.name}</div>
                  <div style={{ color: "var(--app-text-secondary)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {person.email}
                  </div>
                </div>
              </button>

              {on && (
                <div className="flex flex-wrap gap-1.5" style={{ marginTop: 10, paddingLeft: 46 }}>
                  {SHARE_PERMS.map(p => {
                    const active = personPerms.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePerm(person.id, p.id)}
                        style={{
                          fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 999, cursor: "pointer",
                          background: active ? "var(--app-shell-bg-accent-strong)" : "var(--app-shell-bg-subtle)",
                          border: `1px solid ${active ? "var(--app-border-accent-strong)" : "var(--app-border)"}`,
                          color: active ? "var(--app-text-accent)" : "var(--app-text-muted)",
                          fontFamily: "inherit",
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-border px-5 py-3">
        <span className="text-xs" style={{ color: "var(--app-text-muted)" }}>{selected.size} selected</span>
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={() => selected.size > 0 && setConfirmOpen(true)}
          style={{
            ...BTN_PRIMARY,
            ...(selected.size === 0
              ? { background: "var(--app-border-subtle)", color: "var(--app-text-subtle)", boxShadow: "none", cursor: "not-allowed" }
              : {}),
          }}
        >
          Share object
        </button>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center font-sans"
          style={{ background: "var(--app-overlay-blur)", backdropFilter: "blur(3px)", animation: "fadeIn 0.18s ease" }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-confirm-title"
            onClick={e => e.stopPropagation()}
            style={{
              width: "min(340px, calc(100% - 48px))",
              maxWidth: "100%",
              borderRadius: 14,
              background: "var(--app-shell-bg-floating)",
              border: "1px solid var(--app-border)",
              boxShadow: "var(--app-popup-shadow)",
              padding: "16px 16px 14px",
              animation: "panelIn 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
            }}
          >
            <div className="flex items-start gap-3" style={{ marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: "var(--app-shell-bg-accent)", border: "1px solid var(--app-border-accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Share2 size={16} style={{ color: "var(--app-accent-light)" }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div id="share-confirm-title" style={{ color: "var(--app-text-primary)", fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
                  Confirm share
                </div>
                <p style={{ margin: "4px 0 0", color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.45 }}>
                  Sharing <span style={{ color: "var(--app-text-primary)", fontWeight: 400 }}>{objectLabel}</span> with{" "}
                  <span style={{ color: "var(--app-text-primary)", fontWeight: 400 }}>
                    {selectedPeople.length} {selectedPeople.length === 1 ? "person" : "people"}
                  </span>
                </p>
              </div>
            </div>

            <div
              style={{
                maxHeight: 168,
                overflowY: "auto",
                marginBottom: 14,
                borderRadius: 10,
                border: "1px solid var(--app-border)",
                background: "var(--app-shell-bg-subtle)",
                scrollbarWidth: "thin",
                scrollbarColor: "var(--app-scrollbar-thumb-strong) transparent",
              }}
            >
              {selectedPeople.map((person, idx) => {
                return (
                  <div
                    key={person.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderBottom: idx < selectedPeople.length - 1 ? "1px solid var(--app-border-subtle)" : "none",
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: "var(--app-shell-bg-input)",
                      border: "1px solid var(--app-border-strong)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--app-text-primary)", fontSize: 10, fontWeight: 700,
                    }}>
                      {person.name.split(" ").map(p => p[0]).join("").slice(0, 2)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: "var(--app-text-primary)", fontSize: 12, fontWeight: 500 }}>{person.name}</div>
                      <div style={{ color: "var(--app-text-secondary)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {person.email}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                style={BTN_OUTLINE}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "var(--app-shell-bg-hover)";
                  e.currentTarget.style.borderColor = "var(--app-border-strong)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "var(--app-border)";
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmShare}
                style={{ ...BTN_PRIMARY, boxShadow: "0 4px 14px var(--app-btn-primary-shadow)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--app-btn-primary-hover)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--app-btn-primary-bg)"; }}
              >
                Confirm share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
