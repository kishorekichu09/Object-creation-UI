# Designing Object Creation for Smart Data Platform — with an Agent in the Loop

**Role:** UX / UI Designer  
**Product:** Smart Data Platform (internal product evolution from Smart App Builder)  
**Focus:** Object creation — Build with AI Agent · Build Manually · Use Template  
**Key insight:** Client data-visualization concept reached ~78% task completion  

---

## Snapshot (for hiring managers)

Smart Data Platform emerged as data management and migration matured — and as AI changed what “building” could feel like. I owned **object creation and its associated flows**: the moment a vague business need becomes a structured data model.

The brief was dual:

1. Adapt the familiar **manual** object workflow from Smart App Builder under time pressure.
2. Design an **agentic** object creation workflow that helps collaborative teams reach goals faster, building on our org’s existing work with specific agents and custom LLMs.

This case study covers how I narrowed the problem into three intentional paths, how a visualization insight reshaped the UI, and the UX/UI decisions that made agentic creation feel trustworthy.

---

## Why this project

Previous Smart App Builder object creation was powerful but configuration-heavy:

> Name → Primary info → Fields → Relationships/features → Save → Build → Deploy → Assign

Users had to understand platform primitives before they felt progress.

For Smart Data Platform, I treated the old manual workflow as my **first learning surface** — not because agentic was secondary, but because I needed to understand real constraints (API names, primary fields, minimum fields, build/deploy gates, advanced settings) before asking an agent to navigate them. Cursor accelerated prototyping so learning the manual path informed the agentic work instead of blocking it.

### Version evolution (UI)

| Version | What it looked like | Design takeaway |
|---|---|---|
| Early light “Create from Scratch” | Form-heavy, sidebar admin chrome, Step 1 object details | Clear steps, but still felt like filling a platform form |
| Dark focus “Build Manually” | Dimmed chrome, 1/2 progress, Advanced Settings widget | Essentials first; complexity collapsed into progressive disclosure |
| Spatial Objects workspace | Relationship graph + Explore legend + detail panel | Creation lands in a living map, not a dead “saved” toast |
| Three-path launcher | AI / Manual / Template cards with distinct color systems | Intent selection in seconds; AI recommended without trapping users |

---

## The turning point: ~78% task completion

Midway through adapting the old flow, BA shared that a **data visualization concept** from a client project hit our highest task completion rate so far — close to **78%**.

That evidence gave us confidence to bring the same approach into object visualization for the new creation workflow. When people can *see* structure — status, relationships, lifecycle — they complete work with less hesitation.

**Impact on the product:** the graph became the workspace. Create → Build → Deploy had to land on a spatial relationship map with inspectable nodes, Newly Created feedback, and clear next actions (add relationships / fields).

---

## Strategy: narrowing to three paths

I did not start from “three cool modes.” I started from three real situations in a collaborative product environment:

| User situation | Path |
|---|---|
| “I know the outcome, not the schema.” | **Build with AI Agent** |
| “I need precise control.” | **Build Manually** |
| “I need a proven starting point.” | **Use Template** |

**Launcher decision:** equal visual weight for all three cards; soft **Recommended** badge on AI. Guide without trapping. Forcing everyone through an agent creates resistance; hiding the agent creates stagnation.

---

## Decision stories (tradeoffs, not milestones)

These are the choices that shaped the product under real constraints.

### 1. Why I prioritized AI generation and UX simplification
**Stake:** Competitive pressure + product vision  

The old Smart App Builder strength was depth; the weakness was discoverability. Competitive analysis pointed at AI-native creation as a strategic opportunity, and our org already had agent/LLM investment. I prioritized AI App Generation and UX simplification together — not as separate tracks — because generating a schema without simplifying the surrounding experience would only move the bottleneck. The Recommended path on the launcher is that product bet made visible.

### 2. Why Phase 1 kept technical terminology
**Stake:** Trust with implementers + migration risk  

It was tempting to rename everything into friendly business language on day one. I didn’t. Implementers, BA partners, and developers already shared a vocabulary — Object, Field, Lookup, Build, Deploy, Portation. Softening those words before the new mental model was stable would create two dictionaries and break handoffs. Phase 1 kept platform terminology in the manual wizard and properties panels, while AI and templates spoke in goals and suites. Simplification targeted structure and progressive disclosure first; language would evolve once the new flows proved themselves.

### 3. Why mandatory config was separated from advanced settings
**Stake:** Cognitive load vs enterprise completeness  

Enterprise objects need notifications, constraints, calendar, file managers, data providers, field tracking, and more — but none of that should block a valid first deploy. I split the experience: name, type, primary field, and a minimum field set are mandatory; everything else lives in an Advanced Settings widget (13 sections, grouped as Data & records / Automation / Integrations / Type-specific). Advanced settings never gate Build/Deploy. Power stays available; first value stays reachable.

### 4. Why I introduced a wizard-based creation flow
**Stake:** Long forms hide failure until the end  

A single scrolling create screen made every rule feel simultaneous. I moved to a stepped wizard so each decision had a clear exit condition: identity → fields on the live graph → optional advanced → Build → Deploy review. Steps teach platform rules before they become blockers, and the same wizard became the customize surface for templates. The wizard isn’t ceremony; it’s paced validation with a shared spine across paths.

### 5. Why creation moved to an organization-level layout
**Stake:** Objects don’t exist alone  

Creating an object inside an isolated form lied about the product. Objects inherit meaning from the organization graph — siblings, lookups, layouts, downstream apps. After the visualization insight (~78% task completion), I pushed creation into an organization-level spatial workspace: Explore counts, relationship legend, canvas, and detail panel. Create / Build / Deploy lands on that map with a Newly Created state.

### 6. Why Shadcn/UI instead of continuing with Bootstrap
**Stake:** Component quality for a denser product  

Bootstrap had carried older SAB surfaces, but the new object workspace needed denser patterns — dialogs, drawers, tabs, selects, tooltips, accessible primitives — with a design-system feel we could theme for light/dark and graph chrome. Shadcn/UI (Radix primitives + Tailwind) let me compose those patterns without fighting Bootstrap’s opinionated layout model: faster high-fidelity prototyping of agent panels and wizards, consistent affordances, and token-driven UI without Bootstrap override debt.

### 7. How I handled feasibility and stakeholder constraints
**Stake:** Time, dual product pressure, trust in AI  

Management needed the age-old manual workflow adapted in parallel while AI was still earning trust. I sequenced work accordingly: learn and simplify manual first, design agentic with plan-before-create gates, then add templates for implementation speed. Feasibility meant respecting existing rules (≥2 fields, primary field, build/deploy) instead of inventing a greenfield object model. Stakeholder constraint became a design input: three first-class paths, one shared deploy ritual, progressive disclosure instead of a rewrite that would never ship.

---

## Flow 1 — Build Manually

I started here to feel every friction point the agent would later handle.

### Simplified sequence

1. **Object details** — identity, type, title, description  
2. **Field configuration** — palette + live graph + properties  
3. **Advanced settings** — optional widget (13 sections)  
4. **Build → Deploy review → Deploy** onto the graph  

### Design moves

- **Grouped major content.** Basics stay in the primary path. Constraints, notifications, calendar, file manager, data providers, etc. live under Advanced Settings and never gate Build/Deploy.
- **Field configuration UI.** Left palette (click/drag), center floating field card over the live graph, right properties. Primary field protected. Required / prominent (max 5) / tracking become glanceable.
- **Build & deploy as ritual.** Validate essentials → review summary → publish to graph. This spine became shared by AI and Template success states.

---

## Flow 2 — Build with AI Agent (lead story)

This was the heart of the assignment. I did not treat AI as a single “generate schema” button. Drawing from how agentic products structure collaboration — clarify, plan, act, verify — I designed an object-creation agent that behaves like a careful junior architect beside the user.

### How I approached building the agentic workflow

1. **Define agent stages as product UX**  
   Understand → Plan → Create → Connect → Validate → Build → Deploy. Stages appear as checklist language, thinking disclosure, and progress users can follow.

2. **Force plan-before-create**  
   Nothing lands on the graph until **Proceed**. Prevents silent mutation of the workspace.

3. **Human-in-the-loop gates**  
   Clarifying questions (max two), chips, free text, “Use your best judgment,” plan rewrite, review edits before Build.

4. **Make validation a product moment**  
   Self-correction is visible — collisions renamed, missing Name fields added, lookups fixed — so the agent feels accountable.

### Workspace model

- Left: chat steers  
- Center: working set card  
- Right: properties / validation scan  
- Ambient: live graph preview  

Quick-start chips (CRM, HR, Commerce, Projects, Finance, IT) reduce blank-page anxiety. Domain inference maps language to suite scaffolds; users can still ask for leaner sets or extra fields.

### Signature microcopy (strategy in one line)

> “I’ll figure out what you need, then we’ll agree on a plan — nothing gets created on the graph until you Proceed.”

### UI craft for trust

- Collapsed thinking with expandable stage steps  
- Plan as a downloadable document artifact (not an endless chat dump)  
- LIVE IN GRAPH / VALIDATING badges  
- Versioned “changes made by the agent” cards  
- Shared Build / Deploy overlays with explicit progress  

---

## Flow 3 — Use Template

After manual and agentic took shape, a gap remained: not everyone wants to prompt or drag field types. Consultants often already know they need CRM, HRMS, or ITSM.

I proposed **templates as a first-class path** — not a doc buried starter.

- Catalog cards show objects / fields / relationship counts  
- Suite selection previews a connected cluster on the graph  
- Customize reuses the manual wizard in draft mode  
- Build & Deploy stay explicit so governance remains  

**Suites include:** CRM, HRMS, Finance, Inventory, Project Management, E-Commerce, IT Service Desk, Healthcare Ops.

**Business impact:** faster time-to-first-model, more consistent schemas across implementations, shared language for demos (“start from CRM Suite”) with local editability.

---

## Edge cases and how I handled them

| Edge case | Risk | UX response |
|---|---|---|
| Vague AI prompt | Wrong schema | Clarifying questions + chips + best judgment before plan lock |
| API name collisions | Breaks existing graph | Validation scan; deploy blocked until rename |
| Advanced settings overwhelm | Early abandonment | Optional widget; never gates Build/Deploy |
| Relation fields on empty graph | Dead-end config | Explicit empty copy; AI/templates create related sets together |
| Incomplete primary / &lt;2 fields | Invalid object | Continue disabled with reason; primary protected |
| Template over-customization | Lost starter coherence | Edited badges; Build resets when suite changes |
| Agent working vs needs input | “Is it stuck?” | Right-pane states; composer disabled during generate/validate |
| Leaving mid-flow | Lost context | Back returns to plan as reference; Escape scoped by phase |

---

## UX principles

1. **Progressive disclosure** — essentials first; enterprise depth reachable later  
2. **Recognition over recall** — badges, plan artifacts, suite previews, LIVE IN GRAPH  
3. **Human-in-the-loop agency** — AI proposes; humans approve  
4. **Spatial mental models** — relationships are easier when visible (78% insight applied)  
5. **Same spine, different on-ramps** — three entries converge on validate/build/deploy  
6. **Design for collaboration** — builders, consultants, and admins share one object language  

---

## Impact on business goals and user needs

- **Agentic** shortens language → connected cluster time while preserving enterprise approval gates.  
- **Manual** protects power-user precision and continuity during transition from Smart App Builder.  
- **Template** standardizes high-frequency industry schemas for implementation speed and consistency.  

Users get choice without chaos: describe it, build it, or start from a known pattern — then land in the same visual system where relationships make sense.

---

## Reflection

I did not design “an AI feature.” I designed a **creation system** that respects three levels of user confidence, anchors trust with plan-before-create, and uses visualization as a completion engine — not decoration.

**Next measurement chapter:** time-to-first-deployed-cluster, clarification abandonment, template customize rate, and post-deploy relationship edits.

---

*Kishore · UX / UI Designer · Object creation & agentic workflows*
