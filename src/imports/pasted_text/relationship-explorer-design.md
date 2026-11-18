Design a high-fidelity interactive “Relationship Explorer” interface for a no-code application builder called Smart App Builder.

IMPORTANT:
Do not design this as a traditional ER diagram, flowchart, card grid, or conventional tree structure.

The interface should feel like an interactive spatial relationship map / knowledge graph / system universe where Objects, Fields, and Layouts exist as connected entities.

The visual inspiration should come from the uploaded reference images:
- Black/dark canvas
- Small circular nodes
- Thin cyan/teal relationship lines
- Minimal labels around nodes
- Dense but visually organized network
- Large amount of negative space
- Technical/scientific visualization aesthetic
- Subtle glowing connections
- Spatial depth
- No rectangular cards floating across the canvas

Also take inspiration from NASA Eyes on the Solar System for:
- Smooth camera movement
- Zoom in / zoom out
- Pan
- Focus transitions
- Spatial exploration
- Smooth animated transitions between states
- Selected entity becoming the visual focus
- Connected entities becoming progressively more visible
- Subtle motion rather than excessive animation

REFERENCE:
https://eyes.nasa.gov/apps/solar-system/#/home

--------------------------------------------------
1. PRIMARY USE CASE
--------------------------------------------------

The application contains:

10 Objects.

Each Object contains approximately:
- 10–15 Fields

Each Field can be related to multiple Fields belonging to other Objects.

Each Object can be related to:
- Other Objects
- Multiple Fields
- Multiple Layouts

Each Object can also have multiple Layouts.

The purpose of this interface is to allow a user to visually explore these relationships.

The user should be able to understand:

Object → Object relationships
Object → Field relationships
Field → Field relationships
Object → Layout relationships
Field → Layout relationships where applicable

The user should be able to click any Object, Field, or Layout and inspect its details without leaving the relationship map.

When a user clicks an entity:
- Keep the existing relationship map visible
- Do NOT navigate to a separate page
- Open a right-side detail panel / opener
- The panel should overlay the existing canvas
- The relationship map should remain visible behind it
- The selected node should become visually highlighted
- Related nodes and relationship lines should become emphasized
- Unrelated nodes should become visually subdued

--------------------------------------------------
2. OVERALL SCREEN STRUCTURE
--------------------------------------------------

Create a full-screen desktop application.

Viewport:
1440 × 900

Structure:

A. TOP HEADER
B. LEFT EXPLORATION / FILTER AREA
C. MAIN RELATIONSHIP CANVAS
D. RIGHT DETAIL OPENER
E. BOTTOM / FLOATING CANVAS CONTROLS

The relationship canvas should occupy the majority of the screen.

The canvas should feel like an infinite spatial environment rather than a bounded diagram.

--------------------------------------------------
3. TOP HEADER
--------------------------------------------------

Create a minimal dark header.

Left:
Smart App Builder logo / product name.

Next to it:
“Relationship Explorer”

Optional breadcrumb:
Application / Employee Management / Relationship Explorer

Center or slightly right:
Search field with placeholder:

“Search objects, fields or layouts…”

Search should support:
- Object name
- Field name
- Layout name

Right side:
- Filter icon
- View settings icon
- Reset view icon

Do not make the header visually heavy.

The canvas should remain the dominant element.

--------------------------------------------------
4. MAIN CANVAS
--------------------------------------------------

Create a very large dark canvas.

Background:
Near-black / deep navy black.

Use a subtle radial gradient or extremely subtle spatial texture.

Do NOT use a visible grid.

Do NOT use white backgrounds.

The canvas should feel similar to a scientific visualization / space environment.

Use:
- Black
- Deep navy
- Cyan
- Teal
- Soft white
- Very subtle blue glow

Primary relationship color:
cyan / teal.

Example:
#00D9D9
#0B8F9A
#0B5C66

Do not make every line bright.

Most relationships should be subtle.

--------------------------------------------------
5. NETWORK STRUCTURE
--------------------------------------------------

Create approximately 10 main Object nodes.

Use realistic example Objects from an Employee Management application:

Employee
Department
Job Role
Location
Attendance
Leave Request
Payroll
Performance
Project
Training

Each Object should contain approximately 10–15 Fields.

Example:

Employee:
- Employee ID
- First Name
- Last Name
- Email
- Phone
- Date of Birth
- Joining Date
- Department
- Job Role
- Manager
- Location
- Employment Status
- Salary
- Profile Photo

Department:
- Department ID
- Department Name
- Department Head
- Description
- Location
- Status

Job Role:
- Role ID
- Role Name
- Department
- Description
- Level
- Status

etc.

Use realistic relationships.

For example:

Employee
→ Department

Employee
→ Job Role

Employee
→ Location

Employee
→ Attendance

Employee
→ Leave Request

Employee
→ Payroll

Employee
→ Performance

Employee
→ Project

Employee
→ Training

Department
→ Job Role

Department
→ Employee

Project
→ Employee

Performance
→ Employee

Leave Request
→ Employee

Payroll
→ Employee

--------------------------------------------------
6. OBJECT NODES
--------------------------------------------------

Objects are the primary nodes.

Represent Objects using larger circular nodes.

Object node:
- approximately 28–40px diameter
- soft cyan/blue outer glow
- dark center
- subtle border
- object name displayed beside or below the node

Example:

● Employee
● Department
● Payroll
● Attendance

The Object node should be visually more prominent than Field nodes.

Use different visual hierarchy:

OBJECT:
Large node

FIELD:
Small node

LAYOUT:
Medium node with a slightly different visual treatment

Do not use rectangular cards for nodes.

--------------------------------------------------
7. FIELD NODES
--------------------------------------------------

Fields should appear as smaller satellite nodes around their parent Object.

Field nodes:
- 8–14px
- light gray/white center
- subtle cyan glow
- label beside the node

Example:

                    Employee
                       ●
                  /    |    \
                 /     |     \
          First Name  Email  Department
             ●          ●        ●

Fields should not all be placed directly around the Object in a perfect circle.

Create an organic network layout.

Some Fields should connect to other Object nodes or Fields.

Example:

Employee
  ●
  |
  ├── Employee ID
  ├── First Name
  ├── Department ─────→ Department
  ├── Job Role ───────→ Job Role
  └── Location ───────→ Location

--------------------------------------------------
8. LAYOUT NODES
--------------------------------------------------

Layouts should be visually distinct from Fields but still belong to the same spatial system.

Example Layouts:

Employee Entry
Employee Details
Employee List
Employee Search
Employee Summary

Represent Layouts as slightly larger nodes than Fields.

Use a subtle ring / halo around Layout nodes.

Example:

      ◉ Employee Details
      ◉ Employee List
      ◉ Employee Entry

Connect Layout nodes to their related Object.

Example:

Employee
   ●
  /|\
 / | \
◉  ◉  ◉
Employee
Details
List
Entry

The distinction should be understandable without relying only on color.

--------------------------------------------------
9. RELATIONSHIP LINES
--------------------------------------------------

Use thin curved lines.

Avoid rigid straight lines wherever possible.

Use:
- Bezier curves
- Organic paths
- Slight arcs
- Smooth flowing lines

Relationship hierarchy:

Object → Object:
Medium thickness cyan line

Object → Field:
Thin teal line

Field → Field:
Very thin subtle teal line

Object → Layout:
Medium thin cyan line

Selected relationship:
Bright cyan
Slight glow
Slightly thicker

Unselected relationships:
Low opacity

Do not create arrows everywhere.

Relationships should feel like connections in a network rather than a process flow.

Where direction matters, use extremely subtle directional indicators.

--------------------------------------------------
10. SPATIAL ARRANGEMENT
--------------------------------------------------

Do not place everything in one flat cluster.

Create spatial depth.

Center the primary Object:

Employee

Place the remaining Objects around it:

                    Department

         Attendance         Job Role

                  Employee

       Payroll                 Location

            Leave Request

        Performance       Project

                    Training

Then distribute Fields around their corresponding Objects.

Some relationships should extend farther across the canvas.

Some nodes should partially disappear outside the viewport.

This creates the feeling that the network is larger than what is currently visible.

--------------------------------------------------
11. IMPORTANT: INFORMATION DENSITY
--------------------------------------------------

The map should feel dense enough to communicate that there are many relationships.

However, avoid making it visually chaotic.

Use:

- Spatial clustering
- Opacity hierarchy
- Curved relationships
- Node hierarchy
- Smart spacing
- Progressive disclosure

The user should initially see Objects prominently.

Fields and Layouts should remain visible but visually quieter.

--------------------------------------------------
12. LEFT EXPLORATION PANEL
--------------------------------------------------

Create a narrow floating panel on the left.

This should not feel like a traditional sidebar.

Title:

“Explore”

Include:

Search

Then filters:

OBJECTS
10

FIELDS
120+

LAYOUTS
30+

Relationships

[ Object ↔ Object ]
[ Object ↔ Field ]
[ Object ↔ Layout ]
[ Field ↔ Field ]

Include toggles:

☑ Objects
☑ Fields
☑ Layouts

The user can turn entity types on/off.

Example:

Objects     ●
Fields      ●
Layouts     ●

Keep this panel compact so the relationship map remains dominant.

--------------------------------------------------
13. NODE SELECTION BEHAVIOR
--------------------------------------------------

When the user clicks an Object:

Example:
Employee

Animate:

1. Camera smoothly moves toward Employee
2. Employee becomes larger
3. Employee node gets a cyan glow
4. Connected Objects become slightly brighter
5. Connected Fields become visible / brighter
6. Related Layouts become brighter
7. Unrelated nodes fade to approximately 20–30% opacity
8. Connected lines become brighter
9. Right detail opener slides in

Do not instantly jump the camera.

Use smooth cinematic movement.

Transition duration:
500–800ms

Use ease-out / cubic-bezier style motion.

--------------------------------------------------
14. FIELD SELECTION
--------------------------------------------------

When clicking a Field:

Example:
Department

The selected field should become the focal point.

Show relationship chain:

Employee
↓
Department field
↓
Department Object

Also highlight:

Employee
Department
Related fields
Related layouts

Dim everything else.

The camera should gently move toward the selected Field.

The right detail panel should update without closing and reopening.

--------------------------------------------------
15. LAYOUT SELECTION
--------------------------------------------------

When clicking:

Employee Details

Highlight:

Employee Details Layout
↓
Employee Object
↓
Fields used by this Layout

The user should immediately understand:

“This Layout is connected to Employee and uses these Fields.”

--------------------------------------------------
16. RIGHT DETAIL OPENER
--------------------------------------------------

This is one of the most important interactions.

When any Object / Field / Layout is selected:

Open a right-side overlay panel.

Width:
380–440px.

Do NOT replace the canvas.

Do NOT navigate to another page.

The canvas remains visible underneath.

Use:
- Dark translucent background
- Slight blur
- Subtle border
- Shadow
- Rounded corners around 12–16px

The panel should feel like a floating inspector over the network.

--------------------------------------------------
17. OBJECT DETAIL PANEL
--------------------------------------------------

When Employee is selected:

Header:

OBJECT

Employee

Description:
“Stores employee information and profile data.”

Top metadata:

Object Type
Custom Object

Created
Jun 12, 2026

Last Updated
Jul 20, 2026

Then sections:

FIELDS
14

Show compact list:

Employee ID
Text
Required

First Name
Text
Required

Last Name
Text
Required

Department
Lookup
Related

Job Role
Lookup
Related

Location
Lookup
Related

etc.

Then:

RELATIONSHIPS

Connected Objects

Department
Job Role
Location
Attendance
Payroll
Performance

Then:

LAYOUTS

Employee Entry
Employee Details
Employee List
Employee Search

--------------------------------------------------
18. FIELD DETAIL PANEL
--------------------------------------------------

When a Field is selected:

Header:

FIELD

Department

Show:

Field Type
Lookup

Object
Employee

Label
Department

Required
Yes

Unique
No

Then:

RELATED OBJECT
Department

Then:

RELATIONSHIPS

Referenced By:
Employee

References:
Department

Then:

USED IN LAYOUTS

Employee Entry
Employee Details
Employee List

Include a small “View Object” action.

--------------------------------------------------
19. LAYOUT DETAIL PANEL
--------------------------------------------------

When a Layout is selected:

Header:

LAYOUT

Employee Details

Show:

Layout Type
Detail View

Object
Employee

Description:
“Displays detailed employee information.”

Then:

FIELDS USED

Employee ID
First Name
Last Name
Department
Job Role
Location
Joining Date

Then:

RELATED OBJECT

Employee

Include:

“Open Layout Configuration”

--------------------------------------------------
20. DETAIL PANEL ANIMATION
--------------------------------------------------

The panel should animate from right to left.

Use:

opacity 0 → 100%
translateX(30px) → 0px

Duration:
300–400ms

At the same time:

Selected node:
scale 1 → 1.25

Selected node glow:
increase gradually

Connected nodes:
fade up

Unrelated nodes:
fade down

Do not animate every node individually in an exaggerated way.

The experience should feel calm, premium, and technical.

--------------------------------------------------
21. CAMERA / NASA-STYLE EXPLORATION
--------------------------------------------------

Create an interaction model inspired by NASA Eyes on the Solar System.

The user should feel like they are navigating a spatial system.

Interactions:

Mouse wheel:
Zoom in / zoom out

Mouse drag:
Pan canvas

Double click:
Focus selected entity

Click node:
Focus entity + open inspector

Click empty canvas:
Clear selection

Reset:
Return to overview

Zoom should be smooth and continuous.

Do not make zoom feel like a standard browser zoom.

The entire network should scale around the cursor position.

--------------------------------------------------
22. FOCUS TRANSITION
--------------------------------------------------

When focusing a node:

Example:

Employee

Camera smoothly pans toward Employee.

The selected node should remain close to the visual center.

The surrounding network should remain visible.

Do not zoom so far that all relationships disappear.

The user should understand:

Where I came from
What I selected
What it connects to

This is critical.

--------------------------------------------------
23. HOVER INTERACTION
--------------------------------------------------

On hover:

Node slightly enlarges.

Show subtle glow.

Relationship paths connected to the node become brighter.

Connected entities increase opacity.

Show a tiny tooltip:

Employee

Object
14 Fields
5 Relationships
4 Layouts

Do not open the right panel on hover.

Only click should open details.

--------------------------------------------------
24. SEARCH INTERACTION
--------------------------------------------------

When the user searches:

“Payroll”

Show search suggestions:

OBJECTS
Payroll

FIELDS
Salary
Pay Date
Payroll ID

LAYOUTS
Payroll Summary

Clicking a result should:

1. Close search suggestions
2. Find the entity
3. Smoothly move camera toward it
4. Highlight entity
5. Highlight relationships
6. Open right detail panel

--------------------------------------------------
25. RELATIONSHIP HIGHLIGHTING
--------------------------------------------------

When Employee is selected:

Employee:
100% opacity

Directly connected:
85–100%

Second-level connections:
50–70%

Unrelated:
15–30%

This should create a visual hierarchy.

The map should essentially answer:

“What is connected to this?”

without requiring the user to inspect every node.

--------------------------------------------------
26. MINI MAP
--------------------------------------------------

Add a small minimap in the bottom-right or bottom-left corner.

The minimap should show:

- Overall network
- Current viewport
- Current selected node

Keep it extremely subtle.

Use thin lines and small dots.

--------------------------------------------------
27. CANVAS CONTROLS
--------------------------------------------------

Bottom-right floating controls:

+

−

Reset View

Fit All

Optional:

Focus Selected

Use compact circular icon buttons.

Dark translucent surfaces.

Subtle border.

--------------------------------------------------
28. VISUAL DESIGN SYSTEM
--------------------------------------------------

Overall visual language:

Premium
Technical
Minimal
Futuristic
Scientific
Data-rich
Professional SaaS

Background:
#05080A or similar near-black

Primary relationship:
cyan / teal

Text:
Soft white

Secondary text:
Cool gray

Use subtle blue/cyan glow only where needed.

Do NOT use:
- Bright rainbow colors
- Excessive gradients
- Large cards
- Glassmorphism everywhere
- Heavy shadows
- Bright white canvas
- Conventional dashboard layouts
- Large colorful icons

The network should remain the hero.

--------------------------------------------------
29. TYPOGRAPHY
--------------------------------------------------

Use a modern UI font such as:

Inter

or

IBM Plex Sans

Labels on the network should be small and readable.

Object labels:
13–14px

Field labels:
10–12px

Panel heading:
18–20px

Metadata:
12–13px

Use medium/bold typography only for hierarchy.

--------------------------------------------------
30. INITIAL STATE
--------------------------------------------------

Create the initial overview state.

No node should be selected.

The map should show:

10 Objects
Approximately 120 Fields
Approximately 30 Layouts
Many relationships

Employee should be near the center but should not be dramatically larger than the other Objects.

Show a small contextual message near the top-left of the canvas:

“Explore your application structure”

Secondary text:

“Select an object, field, or layout to explore its relationships.”

This should disappear once the user interacts.

--------------------------------------------------
31. SELECTED OBJECT STATE
--------------------------------------------------

Create a second prototype state:

Employee selected.

Camera focused on Employee.

Employee is glowing.

Connected entities highlighted.

Unrelated entities dimmed.

Right panel open with Employee details.

--------------------------------------------------
32. SELECTED FIELD STATE
--------------------------------------------------

Create another state:

Department field selected.

Show:

Employee
↓
Department field
↓
Department Object

Right panel displays Field details.

--------------------------------------------------
33. SELECTED LAYOUT STATE
--------------------------------------------------

Create another state:

Employee Details selected.

Highlight:

Employee Details
Employee
Fields used by Employee Details

Right panel displays Layout details.

--------------------------------------------------
34. EMPTY / DESELECT STATE
--------------------------------------------------

Clicking empty canvas should:

- Close the right detail panel
- Remove node selection
- Restore all node opacity
- Restore all relationships
- Maintain current camera position

Do NOT automatically reset the entire map.

--------------------------------------------------
35. MICRO-INTERACTIONS
--------------------------------------------------

Use subtle animations:

Node hover:
100–150ms

Panel opening:
300–400ms

Focus transition:
500–800ms

Selection highlight:
300ms

Relationship fade:
300–500ms

Zoom:
smooth continuous interpolation

Avoid bounce animations.

Avoid exaggerated spring animations.

The overall motion should feel like navigating a scientific visualization.

--------------------------------------------------
36. IMPORTANT UX PRINCIPLES
--------------------------------------------------

The design must prioritize:

1. Spatial understanding
2. Relationship discoverability
3. Context preservation
4. Progressive disclosure
5. Easy exploration
6. Minimal cognitive overload
7. Visibility of system structure
8. Clear selection state

The user should never lose the context of the network when opening details.

The right detail opener is an overlay, not a page transition.

--------------------------------------------------
37. PROTOTYPE INTERACTIONS
--------------------------------------------------

Build the Figma prototype interactions for:

1. Object hover
2. Object click
3. Field click
4. Layout click
5. Search
6. Zoom
7. Pan
8. Reset view
9. Fit all
10. Close detail panel
11. Click related entity from detail panel
12. Focus selected

Example:

Employee selected
→ Employee inspector opens

Click Department inside inspector
→ Camera smoothly transitions to Department
→ Department becomes selected
→ Inspector updates to Department
→ Relationship network updates

This should happen without a full-page transition.

--------------------------------------------------
38. IMPORTANT OUTPUT
--------------------------------------------------

Create a polished high-fidelity UI, not a wireframe.

Create:

Desktop overview screen

Selected Object state

Selected Field state

Selected Layout state

Search state

Hover state

Detail opener states

Zoomed-in state

Use realistic data.

The final experience should feel like:

“Google Maps + scientific network visualization + modern SaaS inspector”

but do NOT literally copy Google Maps or NASA's visual design.

Use the uploaded reference image as the primary visual direction for the network itself.

Use NASA Eyes on the Solar System primarily as inspiration for spatial interaction, camera movement, zoom, pan, and transitions.

The result should feel like a premium interactive “Application Relationship Explorer” inside Smart App Builder.