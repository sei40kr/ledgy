# account-ledgers development conventions

A double-entry bookkeeping app for Japanese sole proprietors and small companies.
Fully serverless with no backend code: a Next.js static export talking to Firestore directly through the client SDK. The Security Rules are the only server-side defense. Cloud Functions are not used.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the emulators (auth 9099 / firestore 8080 / storage 9199 / UI 4000), seeds the demo data, then starts the Next.js dev server. Ctrl-C stops all of it. Log in with `demo@example.com` / `password123`. |
| `npm run emulators` | Starts the Firebase Emulator Suite on its own, including hosting on 5000 |
| `npm run seed` | Seeds demo data into already-running emulators. Idempotent; `npm run dev` runs it automatically. |
| `npm test` | Every test: unit first, then integration, which runs inside `emulators:exec` |
| `npm run test:unit` | The domain / application unit tests only — fast, no emulator |
| `npm run test:integration` | Integration + Security Rules tests (Firestore and Storage), starting the emulators automatically |
| `npm run lint` | ESLint, including the layer-boundary check |
| `npm run typecheck` | Type-checks every package |
| `npm run storybook` | Starts Storybook on 6006 for the web components. The stories run against an in-memory mock of the composition root, never the emulators. |
| `cd infra/terraform/environments/dev && terraform init -backend=false && terraform validate` | Validates the Terraform without credentials |

## Architecture (Clean Architecture)

Dependencies flow **presentation → application → domain** and nowhere else, enforced mechanically by ESLint (`eslint-plugin-boundaries`). Domain services are pure calculations over models (no I/O, no ports); usecases orchestrate repositories through ports. If a function needs a repository it is a usecase, otherwise it belongs in the domain.

- `packages/domain` — pure TypeScript. **A single import of Firebase, React, or any external library is a design mistake.** Contains models / services / presets. Every ID is a branded type (`TenantId`, `UserId`, `FiscalYearId`, `AccountTitleId`, `SubAccountTitleId`, `TransactionId`, in `models/ids.ts`); cast exactly once where a value enters the system.
- `packages/usecases` — the application layer as its own package: usecases (plain async functions, independent of React, one file per usecase) and ports (repository interfaces). Depends on domain alone.
- `packages/infrastructure` — Firestore client SDK implementations as its own package. The `firebase/*` dependency lives only here. Implements the application's ports and confines transaction control. Depends on usecases and domain.
- `packages/web/src/{app,components,hooks}` — presentation. The UI only calls usecases. **Never put business logic — balance arithmetic, aggregation, validation — inside a React component.** Hooks stay thin adapters over usecases. Normalizing what the user typed (trimming and de-duplicating search words, parsing an amount field) is presentation work and stays here.

## Invariants (a violation is always rejected in review)

1. **Amounts are integer yen only.** Never use floating point or decimals for money. A posting's amount is the `MonetaryAmount` value object, whose constructor rejects anything but a safe integer where a value enters the domain; validated amounts use plain integer arithmetic on its `value`.
2. **Nothing is ever hard-deleted.** Deleting a transaction means a soft delete to `deleted: true`. The Security Rules forbid `delete` on every collection too.
3. **Firestore writes go only through `runTransaction` / `writeBatch` in the repository layer (infrastructure).** Never call `setDoc` / `updateDoc` from a component or a hook.
4. Creating, updating, and soft-deleting a transaction happen atomically in one transaction: validate the balance → append the new version's full content to the revisions subcollection → update the header (currentRevision link plus a denormalized copy of the content, including the derived totals the rules check) → apply the monthlyTransactionSummaries delta. **Inside `runTransaction`, every read must precede every write** — an update that moves the date reads the summaries of both the old and the new month.
5. The content of a transaction lives in its revisions: the subcollection is append-only, each doc records the full content of one version, and the transaction doc links to the current one via currentRevision. The rules forbid update and delete on revisions, pin each revision's author and time to the caller and the server, and require every header write to mirror the content of a revision appended in the same request, which is what makes history tamper-proof.
6. **Development and tests never connect to the production project.** The project ID is `demo-account-ledgers`; a `demo-` prefix is treated as emulator-only and cannot reach a real project.
7. tenantId equals the creator's uid — in the MVP, one user owns one tenant. The Security Rules bootstrap depends on this assumption.
8. **A supporting document (証憑) is one file, attached to a transaction rather than to a posting, and exists on its own.** Which supporting documents are attached is versioned content (`supportingDocumentIds`): attaching and detaching append a revision, and the supporting document record's link (`transactionId` / `fiscalYearId`) is updated in the same `runTransaction`. The Storage object is written once and never overwritten or deleted; removing a supporting document is a soft delete of its record, allowed only once it is unattached.

## Security Rules policy

- The rules are the only server-side line of defense. Any change to them requires a matching test in `packages/web/tests/rules/`.
- For transactions the rules check the header's `debitTotal == creditTotal && debitTotal > 0`, `is int`, a non-empty `postings` of at most 50, a `date` inside the year, `createdBy` / `updatedBy` / `createdAt` / `updatedAt`, the `currentRevision` link to a revision written in the same request with identical content, and the parent year's `status == "open"`. Revisions and monthly summaries are likewise writable only while the year is open. Only the owner may modify a closed year; a member is revoked by setting `role: "revoked"`, never by deletion.
- For supporting documents the rules pin the file metadata and the uploader, require an attached supporting document to be named by the live transaction it points at as of the end of the same request, and forbid soft-deleting one while attached. `storage.rules` allows a supporting document object to be created once by a member with write access and never overwritten or deleted.
- **Limits of the rules language** (no loops): validating every element of `postings[].amount`, reconciling the posting sums against the header totals, and checking every entry of `supportingDocumentIds` are all impossible. Domain-layer validation plus `rebuildMonthlyTransactionSummaries` cover them (see the README).
- The Storage emulator resolves `firestore.get()` against the project the emulators were started with, so the Storage rules test runs under `demo-account-ledgers` (shared with the integration tests, never cleared) rather than a per-file project ID.

## Testing conventions

- domain / application are covered by unit tests, with in-memory fakes for the ports. Not depending on Firebase is itself the proof of testability.
- The Security Rules tests matter most. Cover "cannot read another tenant", "cannot write an unbalanced transaction", "cannot hard-delete", and "cannot rewrite history".
- The integration and rules projects run with `fileParallelism: false` to stop `clearFirestore()` from interfering. They share a project ID, so never parallelize them.

## Miscellaneous

- **Code comments, JSDoc, test names, and documentation are written in English. Everything the user sees on screen is Japanese** — UI labels, error messages, and the standard chart of accounts. **Display text never lives in the domain or application layer**: every refusal is its own `DomainError` / `ApplicationError` subclass, declared beside the rule or usecase it belongs to and carrying only the facts of the violation as fields; the presentation layer alone words each class in Japanese (`packages/web/src/components/errorMessages.ts`), as it does the Firebase error codes.
- The UI is Japanese and built on Chakra UI v3, using its composed APIs (`Dialog` / `Field` / `Table.Root`). Custom CSS is kept to a minimum.
- `output: "export"` limits dynamic routes: a `[param]` segment only prerenders the IDs returned by `generateStaticParams`. **Record/detail screens** (a single transaction, account title, …) still use a query parameter plus a modal rather than a dynamic route. **Fiscal-year-scoped pages** are the one exception: they live under `app/fiscal-years/[fiscalYearId]/` (transactions, general-ledger, trial-balance), prerender a single `_` placeholder shell, and Firebase Hosting rewrites (`firebase.json`) map every real `/fiscal-years/<id>/...` request onto that shell. The pages read the real ID from `usePathname()` (never `useParams()`, which yields the placeholder in the exported shell). `next.config.ts` gates `output: "export"` to production so `next dev` serves those routes for any ID.
- Commit one feature at a time: implement, get the tests green, then commit.
