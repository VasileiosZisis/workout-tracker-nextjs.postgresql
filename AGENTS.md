## Token-conscious workflow

Do not read generated, lock, build, dependency, or cache files unless explicitly necessary:

- `package-lock.json`
- `.next/**`
- `node_modules/**`
- generated Prisma client files
- coverage output
- build output

When a task touches a specific feature, inspect only that feature folder, its route files, and directly imported helpers.

## Command restrictions

Do not run npm scripts from `package.json`, including lint, typecheck, test, build, or Prisma scripts.

Do not run commands that may produce long output unless the user explicitly asks.

After making changes, provide a short “Suggested checks” section with the exact commands the user should run manually.

The agent may inspect `package.json` to identify available scripts, but must not execute them.

## Response size

Keep final responses brief.

For normal code changes, respond with only:

1. Files changed
2. What changed
3. Suggested checks

Do not include long explanations, full file contents, or large code excerpts unless the user asks.
