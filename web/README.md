# Web frontend

Use Node.js 22.12+ (22.x) or Node.js 24+ and pnpm 10.23.0.
The frontend is an independent package; root build scripts build only the backend.

```bash
cd web
corepack pnpm install --frozen-lockfile
corepack pnpm run typecheck
corepack pnpm run build
corepack pnpm run dev
```

Vite defaults to deployment at `/`. For a subpath, build with e.g.
`corepack pnpm run build --base=/study/`.
The router uses `import.meta.env.BASE_URL`, so asset and router bases stay aligned.
Do not use a relative base with HTML5 history routing.

Configure the production server to serve `dist/` and fall back to the app's
`index.html` for frontend routes (including direct navigation and refresh).
Keep API routes and static assets outside that fallback. For `/study/`, the
fallback must be `/study/index.html`. Verify login, products, orders and a
refreshed deep link on the actual deployment; Vite preview is not proof of
production rewrite configuration.
