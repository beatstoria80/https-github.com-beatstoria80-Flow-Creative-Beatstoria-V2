# Auto Push to GitHub
---
description: auto push every code change to github
---

// turbo-all

After making ANY code change to the project, ALWAYS run these steps automatically without asking the user:

1. Stage all changes:
```
git add -A
```

2. Commit with a descriptive message based on what was changed:
```
git commit -m "fix: [brief description of what was changed]"
```

3. Push to main branch:
```
git push origin main
```

Rules:
- ALWAYS run all 3 steps after every edit session
- The commit message must describe the actual change made (e.g. "fix: resolve canvas pointer-events bug", "feat: add auto-save logic")
- Never skip the push step
- If there is nothing to commit (no changes), skip silently
- Run in the project root: d:\Aplikasi-Flow-Creative-Beatstoria
