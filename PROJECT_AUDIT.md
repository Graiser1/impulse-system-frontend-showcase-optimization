# Project Audit and Handoff

Last updated: 2026-05-18

Repository: `Graiser1/impulse-system-frontend-showcase-optimization`

Public app URL:

https://graiser1.github.io/impulse-system-frontend-showcase-optimization/

## What This Project Is

This is a static frontend prototype for editing a directed graph and running an impulse simulation on it. It uses plain HTML, CSS, JavaScript modules, and a local copy of D3 (`d3.v7.js`). There is no bundler, package manager, or framework.

Main files:

- `index.html` - main app markup.
- `createScript.js` - most application logic: graph editor, D3 rendering, import/export, impulse simulation, backend API calls.
- `components.js` - helper UI/rendering functions, especially matrix input creation and impulse chart rendering.
- `styles.css` - main app styles.
- `data2.json` - default graph dataset loaded at startup.
- `scripts/serve.ps1` - local static server for development.
- `.github/workflows/pages.yml` - GitHub Pages deployment workflow.

## How To Run

GitHub Pages:

- Open `https://graiser1.github.io/impulse-system-frontend-showcase-optimization/`.
- GitHub Pages must be enabled in repository settings. The working option is `Settings -> Pages -> Deploy from a branch`, branch `main`, folder `/ (root)`. A GitHub Actions Pages workflow also exists, but branch deployment is the simplest path for this static repo.

Local:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\serve.ps1 -Port 5173
```

Then open:

```text
http://127.0.0.1:5173/
```

Do not open `index.html` directly from disk: ES modules and `fetch('./data2.json')` need HTTP.

## Validation Commands

Node was installed via `winget`. In a fresh terminal `node` should be available. In old PowerShell sessions, prepend:

```powershell
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
```

Checks used:

```powershell
node --check createScript.js
node --check components.js
```

For npm in PowerShell, prefer `npm.cmd` because `npm.ps1` may be blocked by Execution Policy.

## Changes Already Made

### Runtime and publishing

- Added `scripts/serve.ps1`, a dependency-free local static server.
- Added GitHub Pages workflow in `.github/workflows/pages.yml`.
- Added `README.md` with public URL and local run instructions.
- Added `server.out.log` and `server.err.log` to `.gitignore`.

### Graph layout and editing

- Added a layout lock mode with checkbox `фиксировать`.
- Default graph starts locked: vertices stay where they are.
- New vertices are fixed at the click position.
- Vertices can still be dragged manually while locked.
- When unlocked, D3 force simulation can rearrange the graph.
- Initial `data2.json` graph is spread on a circle so edges are easier to see at startup.
- Element editing now works by double click:
- Double-click vertex opens node edit form.
- Double-click edge or edge label opens link edit form.
- The old top-panel edit button still works as fallback.

### Data and rendering stability

- Added helpers for link source/target ids so code works whether D3 has converted `source`/`target` to node objects or they are still string ids.
- Export/save now serializes a clean graph shape:

```js
{
  nodes: [...],
  links: [{ source, target, value, label }]
}
```

- Fixed places that assumed `link.source.id` or `link.target.id`.
- Numeric edits now use `Number(...)` instead of leaving string values.
- Fixed a missing `setStatusText()` call.

### Visual changes

- Edge color rule:
- `value > 0` -> green.
- `value <= 0` -> red.
- Arrowheads match edge color.
- Removed white node stroke that visually covered edges.
- Improved vertex label/value text styling.
- Fixed multi-word vertex labels initially drifting away from the node.

### Impulse editor and chart

- Replaced `+/-` impulse step buttons in UI with a number input for total impulse steps.
- The number input controls how many impulse columns are created.
- The impulse step count is applied on change/Enter instead of every keystroke, so typing multi-digit values no longer briefly shrinks and clears the table.
- Existing impulse input values are preserved when changing the total step count.
- Impulse matrix container now scrolls horizontally for large step counts.
- Added separate chart display range controls:
- `с` - first displayed step.
- `по` - last displayed step.
- Total calculated/input steps and displayed chart range are separate.
- Example: calculate/input 50 steps, show only steps 10 through 20.
- The chart X axis now uses real step numbers for the selected display slice.
- When step execution moves beyond the current displayed `to` step, the chart range expands automatically so the newly calculated step is visible.
- Added a collapsible vertex filter for the impulse chart. It starts collapsed and lets users choose which vertices are rendered.
- Added an impulse chart legend under the chart. It uses the same dedicated high-contrast colors as the chart lines and points.
- Impulse chart colors are independent from the graph/node colors and remain stable for a given vertex even when other vertices are hidden.

### May 15 chart, layout, and inverse-task prototype

- Added semantic roles for the current example graph:
- target vertices: `Качество жизни`, `Уровень загрязнения`, `Отравляющие вещества`, `ЧС`.
- resource vertices: `Цена квоты`, `Доп. Эмиссия`, `Кол-во авто`.
- Node roles are now stored as explicit node metadata (`role: "target" | "resource" | "other"`) and can be edited in the node edit form.
- Old/imported graphs without `role` still get roles inferred from the current example names for backward compatibility.
- The impulse chart now separates target/resource/other vertices visually:
- target series use thicker lines and emphasized points.
- resource series use dashed lines.
- other series use a lighter dashed style.
- The chart legend is grouped by role, and the chart filter displays role badges.
- Added visible resize handles for the main graph, impulse chart, and impulse editor.
- Horizontal resizing is constrained so the main graph and right-side impulse panels do not overlap; expanding one side shrinks the other.
- The right-side impulse chart/editor column keeps a shared width and left edge.
- Vertical resizing of the right column is partially coordinated: the lower handle of the upper chart moves the boundary between chart and editor.
- The page background was changed from black to a light neutral color so gaps between absolute-positioned panels are less visually harsh.
- The top panel now spans the full viewport width and the old red debug-looking `status` label was replaced by a compact status badge.
- In impulse mode, the file/backend menu is hidden to reduce top-panel overload.

### Inverse control-program search prototype

- Added a top-panel button `поиск программы управления`, shown after the user finishes graph construction and enters impulse-editing mode.
- Added a popup form for a first version of the inverse task workflow.
- Current interpretation of the teacher notes:
- the graph/impulse model itself is not changed.
- the user chooses target vertices and desired qualitative dynamics for them (`рост` or `снижение`).
- the user chooses resource vertices, control steps for those resources, and an impulse coefficient.
- the app then fills the existing impulse input matrix; normal step execution and charting continue through the existing impulse workflow.
- Target/resource lists are separated:
- target list contains only vertices currently classified as targets.
- resource list contains only vertices currently classified as resources.
- `Качество жизни` defaults to `рост`.
- pollution/risk target vertices default to `снижение`.
- Resource control steps accept comma/space/semicolon separated values and ranges, for example `1-5` or `1, 3, 5`.
- Resource impulse coefficients are not limited to `-1..1`; users can enter values such as `6`, and the generated impulse table uses `+coefficient`, `-coefficient`, or `0`.
- The current algorithm is a lightweight heuristic:
- it uses powers of the existing transposed node matrix to determine whether a resource impulse helps or hurts the selected target directions by the requested dynamic step.
- it writes only a sign-scaled coefficient into the impulse matrix.
- it does not solve a full optimization problem, minimize cost, or guarantee that all target dynamics are achieved.
- Treat this as an MVP/placeholder until the exact mathematical formulation is clarified.

### May 18 inverse-task and role refinements

- Continued the inverse-task work with the clarified assumption that the main requirement is qualitative direction/tendency, not exact target values.
- Resource cost minimization is still out of scope.
- Negative resource impulses are allowed.
- The app still searches for one generated control program, not all possible programs.
- Added explicit editable node roles to the graph data model:
- `role: "target"` for target vertices.
- `role: "resource"` for resource vertices.
- `role: "other"` for ordinary vertices.
- Added a role selector to the node edit form.
- Updated `data2.json` so the default graph carries explicit roles.
- Kept backward compatibility for old/imported graphs without `role` by falling back to name-based role inference.
- Added subtle role styling on the main graph:
- target nodes get a quiet green outline.
- resource nodes get a quiet amber outline.
- ordinary nodes get a very light neutral outline.
- Improved the control-program form layout with clearer column headers:
- target list: vertex and desired dynamics.
- resource list: vertex, control steps, and impulse coefficient.
- Removed redundant role badges from the separated target/resource lists.
- Added a `выполнить все` button next to the single-step impulse button.
- Added result checking for generated control programs:
- after a control program is applied, the result block appears in the impulse controls.
- after executing steps, each target is checked against its requested tendency.
- the check compares the original target value before running control against the value at the requested target step.
- `рост` is considered achieved if the value increased.
- `снижение` is considered achieved if the value decreased.
- This is a practical chart/result check, not a separate matrix proof.

### May 20 inverse-task workflow, validation, and UI refinements

- Expanded the inverse-task workflow from a single target step into a target interval:
- the user now sets the tendency interval with separate `from` and `to` step inputs.
- verification compares the value at the beginning of the selected interval with the value at its end.
- the impulse chart range is synchronized to the selected target interval after a control program is applied.
- Reworked the result-check block:
- added a compact summary with achieved/failed target count.
- the check table now shows target name, requested direction, value at the interval start, value at the interval end, delta, and status.
- the check is still a direct model run with the generated impulses; it is not a formal proof.
- Added the `Принятие программы` modal after all impulse steps are executed:
- before user decision it shows the verification result only, for example `Все цели достигнуты`.
- `Принять` reveals export actions.
- `Не принять` reveals recalculation/exit actions.
- export to JSON saves the graph, interval, targets, resources, impulse matrix, result values, and verification summary.
- export to PNG saves the current impulse chart if available, otherwise the graph.
- if verification fails after a generated control program run, one automatic recalculation attempt is made before the acceptance modal is shown.
- Reworked the control-program search algorithm:
- removed the old coarse `±k`, `±2k`, `±3k` coefficient concept from the UI.
- removed the per-resource limit/coefficient input to reduce confusion.
- automatic search now generates integer impulses in the range `-10..10`.
- the algorithm estimates influence of each resource-step impulse on target interval deltas, creates an initial ridge-style solution, rounds to integers, then improves it with local integer search.
- the score rewards achieving the requested target directions but penalizes overshooting, excessive impulse norm, too many active impulses, and a one-sided global impulse bias.
- this is intended to produce livelier impulse tables and less monotone charts while staying understandable for users.
- Added an explicit manual mode:
- the checkbox changes the apply button to `Открыть ручной ввод`.
- manual mode creates the impulse table without auto-generated values.
- step execution now synchronizes directly from the visible table, so manual edits are used without an extra hidden confirmation step.
- impulse inputs were returned to integer stepping.
- Fixed impulse execution state issues:
- generated and manually edited impulse values now stay synchronized with the internal `impulseMatrix`.
- repeat entry into impulse mode resets the run controls, chart-node filter, result check, and acceptance state so old execute/chart controls do not appear prematurely.
- Improved panel layout and resize behavior:
- the workspace starts below the actual top menu height instead of a hard-coded top value.
- the right-side chart/editor panels are initially expanded to use the available vertical space.
- resize handles are positioned against actual panel bounds, rather than being carried inside scrollable panel content.
- scroll behavior was reduced after the verification table was added:
- the impulse table keeps horizontal scrolling for many steps.
- the lower impulse editor avoids a separate vertical scrollbar inside the impulse table.
- the verification table was compacted to reduce nested scrollbars.
- The label `вернуться к редактированию графа` was changed to `задать программу управления`.
- The control-program popup now closes automatically after applying a program.

## Current Git State

Important recent commits:

- `8131bf1 Add control program search prototype`
- `931e63e Improve impulse chart controls`
- `5fd771f Add project audit handoff`
- `493eeca Improve editing and impulse chart controls`
- `8914e20 Add GitHub Pages deployment`
- `df605dd Improve graph layout and visuals`
- `038e8dd Initial commit`

At the time of this audit update, the May 20 inverse-task workflow and UI refinement changes are being committed locally.

## Known Issues and Technical Debt

- `createScript.js` is very large and contains most app logic. Future work should gradually extract helpers rather than adding more globals.
- There are many `console.log` calls left from debugging.
- Backend integration points still point to `http://127.0.0.1:8080` for login/register/network save/load. GitHub Pages users will not have that backend unless it is deployed separately.
- Login/register buttons are hidden in the current UI.
- `graphic.html` appears to be an old/unused separate page.
- The impulse calculation logic is fragile and should be tested with known matrices before serious use.
- The inverse control-program search is still heuristic and should be reviewed against the teacher's intended mathematical formulation. It now uses integer impulses and softer scoring, but it is not guaranteed to find a mathematically optimal control program.
- Target/resource role fallback is still hard-coded for old/default graph names, including mojibake versions of those names. New saved graphs should carry explicit `role` metadata.
- The resize/layout system is still based on absolute-positioned panels and custom drag handles. It is a pragmatic improvement, not a full responsive layout framework.
- Some Russian UI strings are still mojibake in source files. Newer strings added in this session are normal UTF-8, so the project currently has mixed text quality.
- Some old code paths remain in comments and legacy functions. Clean only after confirming behavior.

## Recommended Next Steps

- Review the inverse-task result check with the teacher and confirm whether checking interval-start vs interval-end tendency is enough.
- Clarify the inverse task with the teacher:
- whether the desired dynamics are only qualitative (`рост`/`снижение`) or should include target values/thresholds.
- whether resource costs/limits should be included.
- whether the output should be one control program, all possible programs, or an optimized program.
- whether impulse values should be integer-only in `-10..10`, solved continuously, or constrained differently.
- Consider adding bulk role assignment or visual role editing directly on the graph if the workflow grows.
- Remove or hide unused backend/auth UI unless a backend is part of the assignment.
- Add lightweight manual test scenarios in `README.md`.
- Consider extracting graph serialization, layout, impulse matrix math, and chart slicing into separate modules.

## Collaboration Notes For Next Context

- The user wants pragmatic improvements without breaking the working prototype.
- Prefer small, visible, testable changes.
- The app is published via GitHub Pages and also runnable locally with `scripts/serve.ps1`.
- Before committing, run:

```powershell
node --check createScript.js
node --check components.js
```

- Push target is `origin main`.
