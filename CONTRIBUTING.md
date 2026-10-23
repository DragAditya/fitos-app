# Contributing to FitOS

FitOS is a personal, source-available project. Issues and focused pull requests are welcome, but there is no guarantee that a contribution will be merged. For anything non-trivial, open an issue first so the scope can be agreed before code is written.

## Development setup

1. Fork the repository and create a branch from `main`.
2. Install dependencies:

   ```bash
   npm install
   cp .env.example .env.local
   ```

3. Generate a local QR secret and add it to `.env.local`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

The local database uses PGlite under `.data/fitos`. It is created and seeded automatically on the first request.

## Before opening a pull request

Run the same checks as CI:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

For UI, navigation, settings, QR, or database changes, also run the end-to-end suite:

```bash
npx playwright install chromium
npm run test:e2e
```

## Code guidelines

- Keep changes consistent with the existing Next.js App Router structure, naming, and server/client boundaries.
- Keep authorization server-side. Never trust a member ID, gym ID, payment ID, or role supplied by the browser.
- Scope every query to the authenticated gym, and to the authenticated member where applicable.
- Use server actions for mutations. Validate input with Zod and revalidate affected paths.
- Store money as integer paise. Do not introduce floating-point currency.
- Preserve the existing design language and use the shared UI primitives where possible.
- Update the schema and add a migration when changing persisted data. Keep `src/server/db/schema.ts` and `db/migrations/` in sync.
- Add or update tests for behavior changes. Bug fixes should include a regression test where practical.

## Database changes

The app auto-creates the initial schema for development. For a schema change:

1. Update `src/server/db/schema.ts`.
2. Add a new SQL migration under `db/migrations/`.
3. Verify a clean local start and an upgrade against a disposable database.
4. Document any deployment step in `docs/DEPLOYMENT.md`.

Do not point tests or migrations at a database containing real member data.

## Secrets and data

Never commit:

- `.env.local` or any environment file containing real values
- Database dumps, `.data/`, or exported CSVs containing real members
- Vercel project metadata
- Access tokens, private keys, or connection strings

Use the demo seed for screenshots and local testing. If a screenshot or test fixture needs data, make it synthetic and clearly non-production.

## Pull request checklist

- [ ] The change has a clear, focused scope.
- [ ] Typecheck, lint, unit tests, and build pass.
- [ ] E2E tests pass for affected UI flows.
- [ ] Authorization and `gym_id` scoping have been reviewed.
- [ ] No secrets, real member data, or local tooling files are included.
- [ ] Documentation is updated where behavior or setup changed.

## Contribution terms

By submitting a pull request or patch, you agree that the project owner may use, modify, and distribute your contribution without additional compensation or attribution, and you confirm that you have the right to submit it.

## Security

Do not report vulnerabilities in a public issue. Follow [SECURITY.md](SECURITY.md).
