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

The seed attaches a few sample supporting documents (証憑) to the demo transactions. They are generated from the Markdown under `scripts/supporting-documents/` by `build.sh` (pandoc → HTML → headless Chromium) and checked in, so seeding needs neither tool. Against an emulator seeded before the documents existed, `npm run seed` attaches them to the transactions that still lack them.

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
  ├─ supportingDocuments/{supportingDocumentId}              # a supporting document's record: file metadata + the attachment link (transactionId / fiscalYearId, null while unattached); the bytes are the Storage object at the same path
  ├─ fiscalYears/{yearId}              # status: open | closed
  │    ├─ transactions/{transactionId}   # header: currentRevision link + that version's content (postings, supportingDocumentIds, …), denormalized for queries and Rules
  │    │    └─ revisions/{revision}       # full content of every version, append-only
  │    └─ monthlyTransactionSummaries/{yyyymm}   # accountTitleId → {debitTotal, creditTotal}
  └─ (the opening balance is the year's system transaction under a fixed ID)
```

Creating, updating, and soft-deleting a transaction all happen atomically inside a single `runTransaction`: domain validation → appending the version's full content to the revisions subcollection → updating the header with its denormalized copy and the link to that revision → applying the monthly summary delta (`packages/infrastructure/src/firestore/transactionRepository.ts`). Nothing is ever hard-deleted.

**Supporting documents (証憑)** — receipts, invoices, and the like — are one record per file (PDF, JPEG, PNG, or WebP, at most 20 MB) in a tenant-wide collection, so a record exists on its own, and are attached to a transaction rather than to a posting. Which documents are attached is part of the transaction's versioned content (`supportingDocumentIds`), so attaching and detaching each append a revision, and the document record mirrors the link (`transactionId` / `fiscalYearId`) in the same request. A document is uploaded first (from the new-transaction form it stays unattached until the save), and soft-deleting a transaction releases its documents while the deleted version still lists them. A document file is written once and never overwritten or deleted (`storage.rules`); removing a document is a soft delete of its record, and a corrected scan is a new document.

### What the Security Rules cannot cover, and how it is covered instead (important)

As the only server-side line of defense, the Security Rules enforce authentication, tenant isolation, per-role write restrictions, the header checks `debitTotal == creditTotal && debitTotal > 0` and `is int`, a non-empty `postings` array of at most 50, a `date` inside the fiscal year, `createdBy` / `updatedBy` pinned to the caller and `createdAt` / `updatedAt` to the server time, frozen closed fiscal years (transactions, revisions, and summaries alike; only the owner may reopen one), a blanket ban on hard deletes, and a tamper-proof history: every header write must link, via `currentRevision`, to a revision appended in the same request whose content it mirrors, and each revision names its real author and server time and can never be updated or deleted.

For supporting documents the rules pin the file metadata and the uploader after the upload, allow a soft delete only while unattached, and require an attached supporting document's link to be mirrored by the live transaction it points at as of the end of the same request (and, when leaving a transaction, that the transaction let go of it in that request — which needs its year to be open). The Storage rules allow a supporting document object to be created once by a member with write access, read by any member, and never overwritten or deleted.

However, **the rules language has no loops**, so three things **cannot** be validated there:

1. that every `postings[].amount` is a positive integer
2. reconciling the sum of the postings against the header's `debitTotal` / `creditTotal`
3. that every entry of a header's `supportingDocumentIds` names a live, otherwise-unattached supporting document (the reverse direction, supporting document → transaction, is checked)

The first two are covered instead by **domain-layer validation (`validatePostings`), which every write path from the app necessarily runs through**, and by the **self-healing `rebuildMonthlyTransactionSummaries` usecase**, exposed as "recompute" on the trial balance and settings screens. Even if a malicious client writes postings that contradict the header, the aggregates can be rebuilt from the transactions themselves, and the trial balance's "total debits = total credits" check surfaces the inconsistency.

### Deploying rules and indexes

`firestore.rules`, `firestore.indexes.json`, and `storage.rules` are **managed by `firebase deploy` rather than Terraform**, so that they are reviewed and deployed alongside the code:

```bash
npx firebase deploy --only firestore:rules,firestore:indexes,storage --project <project-id>
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
