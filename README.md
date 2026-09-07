# account-ledgers

A double-entry bookkeeping app for Japanese sole proprietors and small companies (MVP). There is no bank API integration; transactions are typed in by hand.

**Fully serverless — no backend code is written:**

- **Frontend**: Next.js (App Router) + TypeScript + Chakra UI v3, deployed to Firebase Hosting as an `output: "export"` static export
- **Database / auth**: Firestore (Native mode) + Firebase Authentication (email + password), read and written directly through the client SDK, with write atomicity guaranteed by `runTransaction` / `writeBatch`
- **Server-side defense**: Firestore Security Rules alone; no Cloud Functions
- **IaC**: Terraform (`infra/terraform`)

## Features

Sign-up (seeds the 53 standard account titles) / account title and sub account title masters / fiscal years and opening balances / compound transaction with Ctrl+Enter for continuous input / journal book with search, edit, and soft delete / general ledger / trial balance with a balance check and recomputation.

## Setup

### Requirements

- Node.js 22+ / npm 10+
- **JDK 21**, needed to run the Firestore emulator. Java 11 does start it, but has been observed to crash the JVM, so 21 is recommended.
- Terraform 1.5+, only if you touch the infrastructure

With Nix + direnv, `direnv allow` drops you into a devshell that has all of the above (`flake.nix`).

### Running locally

```bash
npm install
npm run dev         # emulators + demo data + Next.js dev server → http://localhost:3000
```

`npm run dev` starts the Emulator Suite (auth / firestore / storage + Emulator UI), seeds the demo data, and then starts the Next.js dev server. Ctrl-C stops all of it together.

The emulators discard their data on exit, so every `npm run dev` builds the following test user and data from scratch. You can log in and start exercising the app immediately.

| | |
|---|---|
| Login | `demo@example.com` / `password123` |
| Account titles | the 53 standard account titles, seeded at sign-up |
| Fiscal year | Jan 1 – Dec 31 of the current year |
| Opening balances | 現金 300,000 + 普通預金 1,200,000 = 元入金 1,500,000 |
| Transactions | 30 transactions across January–June: sales, receivable collection, rent, a compound transaction, and a cash payment |

To start only the emulators, use `npm run emulators`, which brings up everything including the Hosting emulator. With those running, `npm run seed` loads just the demo data; a second run detects the existing data and skips.

| Emulator | Port | Included in `npm run dev` |
|---|---|---|
| Authentication | 9099 | ✓ |
| Firestore | 8080 | ✓ |
| Storage | 9199 | ✓ |
| Emulator UI | 4000 | ✓ |
| Hosting | 5000 | — (serves the static export; during development use the Next.js dev server) |

Setting `NEXT_PUBLIC_USE_EMULATOR=true` in `packages/web/.env.local` (copy `.env.local.example`) makes the web app connect to the emulators automatically. The project ID is `demo-account-ledgers`, and because a `demo-` prefix is treated as emulator-only, **development and tests structurally cannot reach the production project**.

Storybook (`npm run storybook`, http://localhost:6006) renders the web components in isolation. The stories in `packages/web/src/components/*.stories.tsx` replace the composition root with the in-memory mock under its `__mocks__` directory, so they need neither the emulators nor `.env.local`.

## Testing

```bash
npm test                 # everything, unit first, then integration
npm run test:unit        # domain / application unit tests — fast, no emulator
npm run test:integration # integration + Security Rules tests; firebase emulators:exec starts on its own
npm run lint             # ESLint, including the mechanical layer-boundary check
npm run typecheck
```

- The **Security Rules tests** (`packages/web/tests/rules/`) are **the most important tests** in a setup with no backend. They cover tenant isolation, rejecting unbalanced transactions, forbidding hard deletes, and forbidding history tampering, using `@firebase/rules-unit-testing`. Each test file uses its own project ID so that `clearFirestore()` cannot interfere across files running in parallel.
- The integration tests (`tests/integration/`) run against the real emulator and the real rules, verifying transaction atomicity, sequence numbering, summary deltas, soft deletes, and `rebuildMonthlyTransactionSummaries`.

## Architecture

Clean Architecture is applied inside the frontend. Dependencies flow presentation → application → domain and nowhere else, enforced mechanically by ESLint (`eslint-plugin-boundaries`).

```
packages/domain/               # pure TypeScript, no dependency on Firebase or React
  models/                      # MonetaryAmount (integer yen), PostingSide, Transaction, FiscalYear, ...
  services/                    # balance validation, trial balance, monthly summary deltas
  presets/                     # standard chart of accounts (53 sole-proprietor account titles)
packages/usecases/             # application layer: usecases (one file per usecase) and ports (repository interfaces)
packages/infrastructure/       # Firestore client SDK implementations; the only firebase/* dependency
packages/web/src/
  app/ components/ hooks/      # presentation; the UI only calls usecases
```

### Data model (Firestore)

```
tenants/{tenantId}                     # tenantId = creator's uid (in the MVP, one user = one tenant)
  ├─ members/{uid}                     # role: admin | editor | viewer | revoked (never deleted)
  ├─ accountTitles/{accountTitleId}/subAccountTitles/{subAccountTitleId}
  ├─ fiscalYears/{yearId}              # status: open | closed
  │    ├─ transactions/{transactionId}   # header: currentRevision link + that version's content, denormalized for queries and Rules
  │    │    └─ revisions/{revision}       # full content of every version, append-only
  │    └─ monthlyTransactionSummaries/{yyyymm}   # accountTitleId → {debitTotal, creditTotal}
  └─ (the opening balance is the year's system transaction under a fixed ID)
```

Creating, updating, and soft-deleting a transaction all happen atomically inside a single `runTransaction`: domain validation → appending the version's full content to the revisions subcollection → updating the header with its denormalized copy and the link to that revision → applying the monthly summary delta (`packages/infrastructure/src/firestore/transactionRepository.ts`). Nothing is ever hard-deleted.

### What the Security Rules cannot cover, and how it is covered instead (important)

As the only server-side line of defense, the Security Rules enforce authentication, tenant isolation, per-role write restrictions, the header checks `debitTotal == creditTotal && debitTotal > 0` and `is int`, a non-empty `postings` array of at most 50, a `date` inside the fiscal year, `createdBy` / `updatedBy` pinned to the caller and `createdAt` / `updatedAt` to the server time, frozen closed fiscal years (transactions, revisions, and summaries alike; only the owner may reopen one), a blanket ban on hard deletes, and a tamper-proof history: every header write must link, via `currentRevision`, to a revision appended in the same request whose content it mirrors, and each revision names its real author and server time and can never be updated or deleted.

However, **the rules language has no loops**, so two things **cannot** be validated there:

1. that every `postings[].amount` is a positive integer
2. reconciling the sum of the postings against the header's `debitTotal` / `creditTotal`

Both are covered instead by **domain-layer validation (`validatePostings`), which every write path from the app necessarily runs through**, and by the **self-healing `rebuildMonthlyTransactionSummaries` usecase**, exposed as "recompute" on the trial balance and settings screens. Even if a malicious client writes postings that contradict the header, the aggregates can be rebuilt from the transactions themselves, and the trial balance's "total debits = total credits" check surfaces the inconsistency.

### Deploying rules and indexes

`firestore.rules` and `firestore.indexes.json` are **managed by `firebase deploy` rather than Terraform**, so that they are reviewed and deployed alongside the code:

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project <project-id>
npm run build && npx firebase deploy --only hosting --project <project-id>
```

## Terraform (`infra/terraform`)

Managed resources: enabling the required APIs (firebase, firestore, identitytoolkit, storage, and so on — nothing for Functions or Cloud Build, since the stack is backendless), `google_firebase_project`, `google_firestore_database` (asia-northeast1), `google_firebase_web_app`, and `google_identity_platform_config` (email + password).

### Creating the state bucket (once, by hand)

A backend block cannot reference variables, so the bucket name is injected at init time:

```bash
gcloud storage buckets create gs://<your-tfstate-bucket> \
  --location=asia-northeast1 --uniform-bucket-level-access
```

### Running it

```bash
cd infra/terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars   # fill in project_id
terraform init -backend-config="bucket=<your-tfstate-bucket>"
terraform plan
terraform apply
```

To validate the configuration without credentials:

```bash
terraform init -backend=false && terraform validate
```

After applying, copy values such as `terraform output web_api_key` into the `NEXT_PUBLIC_FIREBASE_*` transactions of `packages/web/.env.local`; setting `NEXT_PUBLIC_USE_EMULATOR=false` then points the app at the real project.

To add a prod environment, copy `environments/dev` and change the tfvars and display names — the `modules/firebase` module is shared.

## Development conventions

See [CLAUDE.md](./CLAUDE.md) for the layer dependency rules and the invariants: amounts are integer yen only, nothing is ever hard-deleted, writes go only through repository-layer transactions, and so on.
