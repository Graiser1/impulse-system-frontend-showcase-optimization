# Project Audit and Handoff

Last updated: 2026-04-27

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
- Impulse matrix container now scrolls horizontally for large step counts.
- Added separate chart display range controls:
- `с` - first displayed step.
- `по` - last displayed step.
- Total calculated/input steps and displayed chart range are separate.
- Example: calculate/input 50 steps, show only steps 10 through 20.
- The chart X axis now uses real step numbers for the selected display slice.

## Current Git State

Important recent commits:

- `493eeca Improve editing and impulse chart controls`
- `8914e20 Add GitHub Pages deployment`
- `df605dd Improve graph layout and visuals`
- `038e8dd Initial commit`

At the time of this audit, functional changes through `493eeca` were pushed to `origin/main`. This audit file and `.gitignore` update should be committed separately after creation.

## Known Issues and Technical Debt

- `createScript.js` is very large and contains most app logic. Future work should gradually extract helpers rather than adding more globals.
- Some comments and default data still contain mojibake/broken Russian encoding, especially in `data2.json` and older comments.
- There are many `console.log` calls left from debugging.
- Backend integration points still point to `http://127.0.0.1:8080` for login/register/network save/load. GitHub Pages users will not have that backend unless it is deployed separately.
- Login/register buttons are hidden in the current UI.
- `graphic.html` appears to be an old/unused separate page.
- The impulse calculation logic is fragile and should be tested with known matrices before serious use.
- The impulse table currently rebuilds when step count changes, so already typed impulse values can be lost if the user changes the total step count after entering data.
- Some old code paths remain in comments and legacy functions. Clean only after confirming behavior.

## Recommended Next Steps

- Preserve entered impulse values when changing the total step count.
- Add an explicit "run all steps" button so users do not need to click `выполнить шаг` repeatedly.
- Clean up text encoding in UI strings and default datasets.
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
