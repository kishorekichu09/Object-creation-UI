# Decision Stories: Agentic Object Creation for Smart Data Platform

**Designer:** Kishore · UX / UI  
**Product:** Smart Data Platform (evolving from Smart App Builder)  
**Framework:** Decision Stories (not a Double Diamond diary)  
**Note:** Metrics marked *illustrative* are placeholders — replace with original org values on review.

---

## Project snapshot

I owned **object creation and its associated flows** for a new internal smart data platform. The brief was dual and tense: adapt the familiar Smart App Builder **manual** workflow under time pressure, while designing an **agentic** creation path on top of our org’s existing agents and custom LLMs.

This case study does not document every research artifact. It shows **how I think** — alternatives, constraints, decisions, and impact.

---

## Decision inventory (24)

### Strategic (10)
1. Prioritize AI generation + UX simplification together  
2. Keep Phase 1 technical terminology (Object, Field, Build, Deploy)  
3. Ship three paths — not AI-only  
4. Plan-before-create as a hard agent rule  
5. Land creation on organization-level graph  
6. Reuse Build → Deploy lifecycle instead of inventing soft saves  
7. Add templates as a first-class path (not docs)  
8. Sequence work: manual learn → agentic → templates  
9. Move UI stack toward Shadcn/UI vs extending Bootstrap  
10. Treat ~78% viz TCR as permission to redesign the workspace  

### Micro (14)
1. Recommended badge on AI without disabling other cards  
2. Color systems: sky / emerald / amber per path  
3. Cap AI clarifying questions at two + chip actions  
4. “Use your best judgment” escape hatch  
5. Plan as downloadable file artifact (not chat dump)  
6. Collapsed thinking with expandable stages  
7. LIVE IN GRAPH / VALIDATING badges  
8. Primary field protected; min 2 fields; max 5 prominent  
9. Advanced Settings labeled “13 sections”  
10. Newly Created badge + next-step copy after deploy  
11. Empty relation copy when graph has no siblings  
12. Disable chat composer during generate/validate  
13. Versioned “changes made by the agent” cards  
14. Template customize reuses manual wizard in draft mode  

**Shortlist (8 supporting)** + **Deep dive (4 featured)** below.

---

## Featured Decision Story 01 — Strategic

### Title
Why the AI agent must plan before it creates anything on the graph

### Hook
Generating objects instantly felt impressive in demos — and terrifying for anyone who had to live with a wrong schema afterward.

### Before the decision
- Early AI explorations dumped a full CRM cluster onto the canvas as soon as the user hit send. Stakeholders loved the speed; implementers hated the cleanup.
- I tried a softer version: generate in a side preview only. Users still couldn’t tell what was “real,” and edit requests collided with silent re-generation.
- A single-shot chat that “just builds” also hid the agent’s assumptions — domain, object count, relationship intent — until it was too late to disagree cheaply.

### The decision
I made **plan-before-create** a hard product rule. The agent clarifies (at most two questions), publishes a reviewable plan artifact, and keeps the graph empty until the user hits **Proceed**. Creation, connect, validate, build, and deploy only happen after that gate.

### After the decision
The agentic workspace reads like a junior architect beside you: chat on the left, plan document when opened, live center card once approved, properties on the right, ambient graph preview. Users negotiate the model before the system mutates their organization map.

### Result
*Illustrative:* reviewers stopped asking “can I undo the AI?” and started asking “can I edit the plan?” — a shift from fear to collaboration. Plan rewrite became the primary recovery path instead of post-deploy cleanup.

---

## Featured Decision Story 02 — Strategic

### Title
Why I shipped three creation paths instead of forcing everyone through AI

### Hook
Management wanted the old manual workflow adapted under time pressure — while also asking for an agentic future. Forcing one path would have broken the other.

### Before the decision
- **AI-only:** Bold, on-brand — politically impossible for power users and consultants.
- **Manual-only first, AI later:** Would bury the product bet during launch habit formation.
- **Templates in docs:** Consultants already knew they needed CRM/HRMS clusters; re-prompting or re-dragging was waste.

### The decision
A three-path launcher — **Build with AI Agent (Recommended)**, **Build Manually (Full Control)**, **Use Template** — equal visual weight, distinct color systems. All three converge on the same Build → Deploy ritual and organization graph.

### After the decision
Intent selection became a five-second decision. AI speaks in goals and suites; Manual keeps Phase 1 platform terminology; Templates preview industry clusters. Continuity and ambition share one surface.

### Result
*Illustrative measurement mix:* path distribution, time-to-first-deployed-cluster by path, switched-path rate. Qualitatively, BA/implementation preferred choice over a mandated AI funnel.

---

## Featured Decision Story 03 — Workflow / IA

### Title
Why object creation had to land on an organization-level graph — not an admin form

### Hook
A successful create that ends in a toast tells you something was saved. It does not tell you what you just did to the system.

### Before the decision
- Version 1: light enterprise forms, “Create from Scratch” — clear steps, still platform-form thinking.
- Isolated create pages lied about the product; objects inherit meaning from the org graph.
- BA shared a client visualization concept with **~78% task completion** — seeing structure helped people finish.

### The decision
Move create / build / deploy into an **organization-level spatial workspace** (Explore, legend, canvas, detail panel). After deploy, objects appear with a **Newly Created** state and next-action copy.

### After the decision
Users configure in context of the system they’re extending. Live preview makes the graph a completion engine. Visualization became a product principle, not decoration.

### Result
*Illustrative targets:* higher post-create continuation (add relationship/field), fewer “where did my object go?” loops, shorter time from deploy to first related object.

---

## Featured Decision Story 04 — Micro

### Title
Why Advanced Settings shows “13 sections” but never blocks Build or Deploy

### Hook
Enterprise depth is real. Making users finish notifications, calendar, and data providers before a valid object exists is how creation dies.

### Before the decision
- Older flows mixed identity, fields, and advanced configuration into one pile.
- Stakeholders feared that hiding settings would “dumb down” parity with Smart App Builder.
- Inline expanders for every block still implied “fill these now.”

### The decision
Split mandatory from optional. Name, type, primary field, and minimum fields stay on the wizard path. Everything else lives in **Advanced Settings** (13 sections: Data & records / Automation / Integrations / Type-specific) — **explicitly non-blocking** for Build/Deploy.

### After the decision
First-time creators reach a deployable object without touring the metadata universe. Power users still find depth in one predictable place.

### Result
*Illustrative:* fewer abandons at settings steps; advanced open rate becomes discoverability, not a gate.

---

## Supporting decisions (shortlist of 8)

| Decision | Why |
|---|---|
| Phase 1 kept technical terminology | Avoid two dictionaries mid-migration |
| Wizard instead of one long form | Pace validation; teach rules before blockers |
| Cap clarifying questions at two | Precision without interrogation fatigue |
| Plan as file artifact | Reviewable structure vs chat dump |
| Visible validation / self-correction | Accountability over silent magic |
| Shadcn/UI over Bootstrap continuity | Dense agent/wizard primitives + tokens |
| Templates preview whole suites | Starters are relationship systems |
| Postpone full business-language rename | Structure first; labels after flows prove stable |

---

## Outcomes (placeholder metrics — replace on review)

| Signal | Value | Note |
|---|---|---|
| Task completion insight | ~78% | Client viz concept (reported) |
| Create paths shipped | 3 | AI · Manual · Template |
| Illustrative time cut | 40–60% | Language → first cluster (hypothesis) |
| Advanced gates removed | 13 | Sections optional vs blocking |

**Measurement plan:** time-to-first-deployed-cluster by path; plan rewrite → Proceed conversion; abandon at settings vs fields; template customize rate; post-deploy relationship edits within 24h.

---

## Interview-ready mapping

| Question | Story to tell |
|---|---|
| Design process? | Story 01 — plan-before-create |
| Challenge / stakeholder constraint? | Story 02 — three paths |
| Why this design? | Story 03 — org graph + 78% insight |
| Small UI decision that mattered? | Story 04 — Advanced Settings non-blocking |

---

## Closing

Tools make screens easy. What should differentiate this portfolio piece: navigating ambiguity, evaluating alternatives, deciding under constraint, and explaining impact — especially with an **agent in the loop**.

*Kishore · UX / UI Designer*
