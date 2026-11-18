import React from "react";
import { X, Sparkles, Layers, Copy, ChevronRight } from "lucide-react";

type CreateMode = "manual" | "ai" | "template";

interface LaunchCardProps {
  badge: string;
  badgeStyle: React.CSSProperties;
  icon: React.ReactNode;
  iconWrapStyle: React.CSSProperties;
  title: string;
  description: string;
  bullets: string[];
  bulletColor: string;
  cta: string;
  ctaColor: string;
  cardBg: string;
  cardBorder: string;
  hoverGlow: string;
  hoverBorder: string;
  onSelect: () => void;
}

function LaunchCard({
  badge, badgeStyle, icon, iconWrapStyle, title, description, bullets,
  bulletColor, cta, ctaColor, cardBg, cardBorder, hoverGlow, hoverBorder, onSelect,
}: LaunchCardProps) {
  return (
    <div
      className="launch-card flex flex-col rounded-2xl p-6 cursor-pointer"
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        position: "relative",
        boxShadow: "none",
      }}
      onClick={onSelect}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = hoverGlow;
        el.style.borderColor = hoverBorder;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "none";
        el.style.borderColor = cardBorder;
      }}
      onFocus={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = hoverGlow;
        el.style.borderColor = hoverBorder;
      }}
      onBlur={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "none";
        el.style.borderColor = cardBorder;
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", ...iconWrapStyle }}>
          {icon}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", padding: "3px 10px", borderRadius: 999, ...badgeStyle }}>
          {badge}
        </span>
      </div>

      <div style={{ color: "var(--app-card-title)", fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ color: "var(--app-card-desc)", fontSize: 13, marginBottom: 16 }}>{description}</div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
        {bullets.map(b => (
          <li key={b} className="flex items-center gap-2 mb-2.5">
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: bulletColor, flexShrink: 0 }} />
            <span style={{ color: "var(--app-card-body)", fontSize: 13 }}>{b}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-1.5 mt-5" style={{ color: ctaColor, fontSize: 13, fontWeight: 600 }}>
        {cta} <ChevronRight size={13} />
      </div>
    </div>
  );
}

export function CreateObjectLauncher({ onClose, onSelect }: {
  onClose: () => void;
  onSelect: (mode: CreateMode) => void;
}) {
  return (
    <>
      <style>{`
        @keyframes launchIn{from{transform:translate(-50%,-50%) scale(0.96) translateY(10px);opacity:0}to{transform:translate(-50%,-50%) scale(1) translateY(0);opacity:1}}
        @keyframes launchFade{from{opacity:0}to{opacity:1}}
        .launch-card{transition:transform 0.18s ease,box-shadow 0.18s ease,border-color 0.18s ease;}
        .launch-card:hover{transform:translateY(-2px);}
        .launch-card:focus-visible{outline:2px solid var(--app-accent);outline-offset:2px;}
      `}</style>

      <div
        className="fixed inset-0 z-[59]"
        style={{ background: "var(--app-overlay-blur)", backdropFilter: "blur(6px)", animation: "launchFade 0.2s ease" }}
        onClick={onClose}
      />

      <div
        className="fixed z-[60]"
        style={{
          left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          width: "min(880px, 96vw)",
          background: "var(--app-shell-bg-muted)",
          border: "1px solid var(--app-border)",
          borderRadius: 18,
          boxShadow: "var(--app-popup-shadow)",
          overflow: "hidden",
          animation: "launchIn 0.26s cubic-bezier(0.25,0.46,0.45,0.94)",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div className="flex items-center gap-4 px-7 py-5" style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg,var(--app-accent),var(--app-accent-light))",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            boxShadow: "0 4px 16px var(--app-accent-shadow)",
          }}>
            <span style={{ color: "var(--app-text-on-accent)", fontSize: 20, fontWeight: 700, lineHeight: 1 }}>+</span>
          </div>
          <div>
            <div style={{ color: "var(--app-launcher-title)", fontSize: 18, fontWeight: 700 }}>New Object</div>
            <div style={{ color: "var(--app-text-muted)", fontSize: 13, marginTop: 2 }}>Choose how you'd like to create your object</div>
          </div>
          <button
            onClick={onClose}
            style={{ marginLeft: "auto", color: "var(--app-text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, borderRadius: 8, transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--app-text-primary)"; (e.currentTarget as HTMLElement).style.background = "var(--app-shell-bg-hover)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--app-text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-5 p-7">
          <LaunchCard
            badge="Recommended"
            badgeStyle={{ background: "var(--app-shell-bg-accent)", border: "1px solid var(--app-border-accent)", color: "var(--app-text-accent)" }}
            icon={<Sparkles size={22} style={{ color: "var(--app-accent-light)" }} />}
            iconWrapStyle={{ background: "var(--app-card-icon-ai-bg)", border: "1px solid var(--app-border-accent)" }}
            title="Build with AI Agent"
            description="Describe your business requirements"
            bullets={["Natural language input", "Understand · plan · create · connect", "Validate · build · deploy", "Live graph preview"]}
            bulletColor="var(--app-accent-light)"
            cta="Build with AI"
            ctaColor="var(--app-text-accent-muted)"
            cardBg="var(--app-card-ai-bg)"
            cardBorder="var(--app-card-ai-border)"
            hoverBorder="var(--app-card-ai-border-hover)"
            hoverGlow="0 4px 14px var(--app-card-ai-glow)"
            onSelect={() => onSelect("ai")}
          />

          <LaunchCard
            badge="Full Control"
            badgeStyle={{ background: "var(--app-shell-bg-success)", border: "1px solid var(--app-border-success)", color: "var(--app-text-success)" }}
            icon={<Layers size={22} style={{ color: "var(--app-text-success)" }} />}
            iconWrapStyle={{ background: "var(--app-card-icon-manual-bg)", border: "1px solid var(--app-border-success)" }}
            title="Build Manually"
            description="Drag and drop fields to configure"
            bullets={["Drag-and-drop builder", "14 field types", "Live field editing", "Required field toggles"]}
            bulletColor="var(--app-text-success)"
            cta="Open Builder"
            ctaColor="var(--app-text-success)"
            cardBg="var(--app-card-manual-bg)"
            cardBorder="var(--app-card-manual-border)"
            hoverBorder="var(--app-card-manual-border-hover)"
            hoverGlow="0 4px 14px var(--app-card-manual-glow)"
            onSelect={() => onSelect("manual")}
          />

          <LaunchCard
            badge="6 Templates"
            badgeStyle={{ background: "var(--app-shell-bg-warning)", border: "1px solid rgba(245,158,11,0.35)", color: "var(--app-text-warning)" }}
            icon={<Copy size={22} style={{ color: "var(--app-text-warning)" }} />}
            iconWrapStyle={{ background: "var(--app-card-icon-template-bg)", border: "1px solid rgba(245,158,11,0.35)" }}
            title="Use Template"
            description="Start from a pre-built industry schema"
            bullets={["CRM, HRMS, Finance", "Project Management", "E-Commerce, IT & more", "Multiple objects at once"]}
            bulletColor="var(--app-text-warning)"
            cta="Browse Templates"
            ctaColor="var(--app-text-warning)"
            cardBg="var(--app-card-template-bg)"
            cardBorder="var(--app-card-template-border)"
            hoverBorder="var(--app-card-template-border-hover)"
            hoverGlow="0 4px 14px var(--app-card-template-glow)"
            onSelect={() => onSelect("template")}
          />
        </div>
      </div>
    </>
  );
}
