# Impulse System Frontend Showcase

Static D3-based graph editor and impulse simulation demo.

## Open in Browser

After GitHub Pages is enabled for the repository, the app is available at:

https://graiser1.github.io/impulse-system-frontend-showcase-optimization/

If the link returns `404`, open the repository settings on GitHub and set:

- `Settings` -> `Pages`
- `Build and deployment` -> `Source`: `GitHub Actions`

The included workflow publishes the site automatically after each push to `main`.

## Local Run

Open PowerShell in the repository root and run:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\serve.ps1 -Port 5173
```

Then open:

```text
http://127.0.0.1:5173/
```
