/**
 * Demo data seeder. Emulator only.
 *
 * `npm run dev` runs this automatically once the emulators are up; with the
 * emulators started separately, `npm run seed` runs it on its own. It checks
 * whether the data is already there, so running it repeatedly is safe.
 *
 * Seeds the demo tenant (demo@example.com / password123) with the standard
 * chart of accounts, opening balances, 30 sample transactions, and a few
 * supporting documents (証憑) attached to some of them. It writes through the
 * same client SDK and usecases as the app rather than the Admin SDK, so seeding
 * doubles as a live exercise of the Security Rules.
 */
import { readFile } from "node:fs/promises";
import { FirebaseError, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import {
  type AccountTitleId,
  MonetaryAmount,
  type PartnerId,
  type Posting,
  type PostingSide,
  STANDARD_ACCOUNT_TITLE_PRESETS,
  type SupportingDocumentId,
  type TenantId,
  type UserId,
} from "@account-ledgers/domain";
import { EmailAlreadyInUseError } from "@account-ledgers/usecases";
import { listAccountTitlesUseCase } from "@account-ledgers/usecases";
import { updateAccountTitleUseCase } from "@account-ledgers/usecases";
import { createPartnerUseCase } from "@account-ledgers/usecases";
import { listPartnersUseCase } from "@account-ledgers/usecases";
import { createFiscalYearUseCase } from "@account-ledgers/usecases";
import { listFiscalYearsUseCase } from "@account-ledgers/usecases";
import { saveOpeningBalanceUseCase } from "@account-ledgers/usecases";
import { signInUseCase } from "@account-ledgers/usecases";
import { signUpUseCase } from "@account-ledgers/usecases";
import { createTransactionUseCase } from "@account-ledgers/usecases";
import { searchTransactionsUseCase } from "@account-ledgers/usecases";
import { attachSupportingDocumentToTransactionUseCase } from "@account-ledgers/usecases";
import { uploadSupportingDocumentUseCase } from "@account-ledgers/usecases";
import { createFirebaseAuthAdapter } from "@account-ledgers/infrastructure/auth/firebaseAuthAdapter";
import { createFirestoreAccountTitleRepository } from "@account-ledgers/infrastructure/firestore/accountTitleRepository";
import { createFirestorePartnerRepository } from "@account-ledgers/infrastructure/firestore/partnerRepository";
import { createFirestoreFiscalYearRepository } from "@account-ledgers/infrastructure/firestore/fiscalYearRepository";
import { createFirestoreTransactionRepository } from "@account-ledgers/infrastructure/firestore/transactionRepository";
import { DEMO_ACCOUNT } from "@account-ledgers/infrastructure/firebase/devAccount";
import { createFirebaseSupportingDocumentRepository } from "@account-ledgers/infrastructure/firebase/supportingDocumentRepository";
import { createFirestoreTenantRepository } from "@account-ledgers/infrastructure/firestore/tenantRepository";

// The same credentials as the development button on the login page.
const { email: EMAIL, password: PASSWORD } = DEMO_ACCOUNT;

// A `demo-` prefixed project ID is treated as emulator-only, so this can never
// write to a production project by accident.
const app = initializeApp(
  {
    projectId: "demo-account-ledgers",
    apiKey: "demo-api-key",
    storageBucket: "demo-account-ledgers.appspot.com",
  },
  "seed",
);
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);
const storage = getStorage(app);
connectStorageEmulator(storage, "127.0.0.1", 9199);

const authAdapter = createFirebaseAuthAdapter(auth);
const fiscalYearRepository = createFirestoreFiscalYearRepository(db);
const transactionRepository = createFirestoreTransactionRepository(db);
const usecases = {
  signUp: signUpUseCase({
    auth: authAdapter,
    tenants: createFirestoreTenantRepository(db),
  }),
  signIn: signInUseCase({ auth: authAdapter }),
  accountTitles: {
    list: listAccountTitlesUseCase({
      accountTitles: createFirestoreAccountTitleRepository(db),
    }),
    update: updateAccountTitleUseCase({
      accountTitles: createFirestoreAccountTitleRepository(db),
    }),
  },
  partners: {
    list: listPartnersUseCase({ partners: createFirestorePartnerRepository(db) }),
    create: createPartnerUseCase({ partners: createFirestorePartnerRepository(db) }),
  },
  fiscalYears: {
    list: listFiscalYearsUseCase({ fiscalYears: fiscalYearRepository }),
    create: createFiscalYearUseCase({ fiscalYears: fiscalYearRepository }),
    saveOpeningBalance: saveOpeningBalanceUseCase({
      transactions: transactionRepository,
      fiscalYears: fiscalYearRepository,
    }),
  },
  transactions: {
    create: createTransactionUseCase({
      transactions: transactionRepository,
      fiscalYears: fiscalYearRepository,
    }),
    search: searchTransactionsUseCase({ transactions: transactionRepository }),
    attachSupportingDocument: attachSupportingDocumentToTransactionUseCase({
      transactions: transactionRepository,
      fiscalYears: fiscalYearRepository,
    }),
  },
  supportingDocuments: {
    upload: uploadSupportingDocumentUseCase({
      supportingDocuments: createFirebaseSupportingDocumentRepository(db, storage),
    }),
  },
};

// The sample supporting documents, generated from Markdown by
// scripts/supporting-documents/build.sh and checked in.
const SUPPORTING_DOCUMENTS_DIR = new URL("./supporting-documents/", import.meta.url);
const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
};

function posting(
  side: PostingSide,
  accountTitleId: AccountTitleId,
  amount: number,
  memo: string = "",
): Posting {
  return {
    side,
    accountTitleId,
    subAccountTitleId: null,
    amount: new MonetaryAmount(amount),
    taxCategory: null,
    memo,
  };
}

async function main() {
  // 1. The demo user. Signing up also creates the tenant and standard account titles.
  let tenantId: TenantId;
  try {
    ({ tenantId } = await usecases.signUp({ email: EMAIL, password: PASSWORD }));
    console.log(`✔ Created the demo user: ${EMAIL} / ${PASSWORD}`);
  } catch (error) {
    // The auth port refuses a sign-up for an already-registered email: the
    // emulator was seeded before, so sign in instead.
    if (error instanceof EmailAlreadyInUseError) {
      ({ tenantId } = await usecases.signIn({
        email: EMAIL,
        password: PASSWORD,
      }));
      console.log(`✔ Signed in as the existing demo user: ${EMAIL}`);
    } else {
      throw error;
    }
  }

  // 2. Map account title names to account title IDs. A tenant seeded before the
  // presets carried search words gets the romanized ones filled in.
  const accountTitles = await usecases.accountTitles.list(tenantId);
  for (const accountTitle of accountTitles) {
    const preset = STANDARD_ACCOUNT_TITLE_PRESETS.find((p) => p.name === accountTitle.name);
    if (!preset || accountTitle.searchWords.length > 0) continue;
    await usecases.accountTitles.update({
      tenantId,
      accountTitleId: accountTitle.id,
      name: accountTitle.name,
      defaultTaxCategory: accountTitle.defaultTaxCategory,
      searchWords: preset.searchWords,
    });
    console.log(`✔ Added search words to the account title: ${accountTitle.name}`);
  }
  const byName = new Map(accountTitles.map((a) => [a.name, a.id]));
  const acc = (name: string): AccountTitleId => {
    const id = byName.get(name);
    if (!id) throw new Error(`AccountTitle ${name} not found`);
    return id;
  };

  // 3. Fiscal year, running January through December of the current year.
  const year = new Date().getFullYear();
  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year, 11, 31));
  const existingYears = await usecases.fiscalYears.list(tenantId);
  let yearId = existingYears.find((y) => y.startDate.getTime() === startDate.getTime())?.id;
  if (yearId) {
    console.log(`✔ Fiscal year already exists: ${startDate.toISOString().slice(0, 10)} – ${endDate.toISOString().slice(0, 10)}`);
  } else {
    yearId = await usecases.fiscalYears.create({ tenantId, startDate, endDate });
    console.log(`✔ Created the fiscal year: ${startDate.toISOString().slice(0, 10)} – ${endDate.toISOString().slice(0, 10)}`);
  }

  // 4. Sample transactions: five per month January through June, plus one
  //    multi-line compound entry. A few carry a sample supporting document.
  const drafts: {
    date: Date;
    description: string;
    partners: string[];
    postings: Posting[];
    /** File names under scripts/supporting-documents to upload and attach. */
    supportingDocuments?: string[];
  }[] = [];
  for (let month = 1; month <= 6; month++) {
    const mm = String(month).padStart(2, "0");
    const salesAmount = 200_000 + month * 15_000;
    drafts.push(
      {
        date: new Date(`${year}-${mm}-05`),
        description: "売上(掛)",
        partners: ["株式会社サンプル商事"],
        postings: [
          posting("debit", acc("売掛金"), salesAmount),
          posting("credit", acc("売上高"), salesAmount),
        ],
      },
      {
        date: new Date(`${year}-${mm}-10`),
        description: "売掛金回収",
        partners: ["株式会社サンプル商事"],
        postings: [
          posting("debit", acc("普通預金"), salesAmount),
          posting("credit", acc("売掛金"), salesAmount),
        ],
      },
      {
        date: new Date(`${year}-${mm}-25`),
        description: "地代家賃の支払",
        partners: ["○○不動産"],
        postings: [
          posting("debit", acc("地代家賃"), 110_000),
          posting("credit", acc("普通預金"), 110_000),
        ],
        supportingDocuments: month === 3 ? ["invoice-rent.pdf"] : undefined,
      },
      {
        date: new Date(`${year}-${mm}-15`),
        description: "通信費・水道光熱費の支払(複合仕訳)",
        partners: [],
        postings: [
          posting("debit", acc("通信費"), 8_800, "携帯電話"),
          posting("debit", acc("水道光熱費"), 12_000 + month * 500, "電気代"),
          posting("credit", acc("普通預金"), 20_800 + month * 500),
        ],
        supportingDocuments: month === 2 ? ["receipt-mobile.pdf"] : undefined,
      },
      {
        date: new Date(`${year}-${mm}-20`),
        description: "消耗品購入(現金)",
        partners: ["文具店"],
        postings: [
          posting("debit", acc("消耗品費"), 3_000 + month * 200),
          posting("credit", acc("現金"), 3_000 + month * 200),
        ],
        supportingDocuments: month === 4 ? ["receipt-stationery.pdf"] : undefined,
      },
    );
  }

  // A cash expense evidenced by a photographed receipt (an image rather than a PDF).
  drafts.push({
    date: new Date(`${year}-06-20`),
    description: "タクシー代",
    partners: [],
    postings: [
      posting("debit", acc("旅費交通費"), 2_340),
      posting("credit", acc("現金"), 2_340),
    ],
    supportingDocuments: ["receipt-taxi.png"],
  });

  // One richer compound entry with several lines on both sides.
  drafts.push({
    date: new Date(`${year}-03-28`),
    description: "各種経費のまとめ払い(複合仕訳)",
    partners: ["文具店", "○○不動産"],
    postings: [
      posting("debit", acc("消耗品費"), 30_000, "文房具・備品"),
      posting("debit", acc("通信費"), 8_800, "通信費"),
      posting("debit", acc("水道光熱費"), 12_000, "水道光熱費"),
      posting("credit", acc("普通預金"), 40_000, "普通預金より"),
      posting("credit", acc("現金"), 10_800, "現金より"),
    ],
    // One document per expense: a transaction may carry several.
    supportingDocuments: [
      "receipt-office-supplies.pdf",
      "receipt-mobile.pdf",
      "invoice-electricity.pdf",
    ],
  });

  // 5. Each supporting document is uploaded first, like in the app.
  const uploadSupportingDocuments = async (
    fileNames: string[] = [],
  ): Promise<SupportingDocumentId[]> => {
    const ids: SupportingDocumentId[] = [];
    for (const fileName of fileNames) {
      const bytes = await readFile(new URL(fileName, SUPPORTING_DOCUMENTS_DIR));
      const extension = fileName.split(".").pop() ?? "";
      const contentType = CONTENT_TYPES[extension];
      if (!contentType) throw new Error(`Unsupported sample file: ${fileName}`);
      ids.push(
        await usecases.supportingDocuments.upload({
          tenantId,
          file: {
            name: fileName,
            contentType,
            size: bytes.byteLength,
            bytes: bytes.buffer.slice(
              bytes.byteOffset,
              bytes.byteOffset + bytes.byteLength,
            ) as ArrayBuffer,
          },
          uploadedBy: tenantId as string as UserId,
        }),
      );
    }
    return ids;
  };

  // When the sample transactions are already there (an emulator seeded before
  // the documents existed), only attach the documents to the transactions
  // that still lack them, matched by date and description.
  const existing = await usecases.transactions.search({
    tenantId,
    yearId,
    limit: 1,
  });
  if (existing.transactions.length > 0) {
    let attached = 0;
    for (const draft of drafts) {
      if (!draft.supportingDocuments) continue;
      const page = await usecases.transactions.search({
        tenantId,
        yearId,
        dateFrom: draft.date,
        dateTo: draft.date,
        limit: 50,
      });
      const transaction = page.transactions.find(
        (t) => t.description === draft.description,
      );
      if (transaction?.supportingDocumentIds.length) continue;
      const supportingDocumentIds = await uploadSupportingDocuments(draft.supportingDocuments);
      if (transaction) {
        for (const supportingDocumentId of supportingDocumentIds) {
          await usecases.transactions.attachSupportingDocument({
            tenantId,
            yearId,
            transactionId: transaction.id,
            supportingDocumentId,
            updatedBy: tenantId as string as UserId,
          });
        }
      } else {
        // A sample transaction added since: create it, documents and all.
        await usecases.transactions.create({
          tenantId,
          yearId,
          createdBy: tenantId as string as UserId,
          draft: { ...draft, partners: [], tags: [] },
          supportingDocumentIds,
        });
      }
      attached += supportingDocumentIds.length;
    }
    console.log(
      attached > 0
        ? `✔ Transactions already exist; attached ${attached} supporting documents`
        : "✔ Transactions already exist; skipped seeding",
    );
    console.log(`\nLogin: ${EMAIL} / ${PASSWORD}`);
    return;
  }

  // 6. Opening balances, which must balance.
  await usecases.fiscalYears.saveOpeningBalance({
    tenantId,
    yearId,
    balance: {
      [acc("現金")]: { debit: 300_000, credit: 0 }, // cash (現金)
      [acc("普通預金")]: { debit: 1_200_000, credit: 0 }, // ordinary deposit (普通預金)
      [acc("元入金")]: { debit: 0, credit: 1_500_000 }, // proprietor capital (元入金)
    },
    createdBy: tenantId as string as UserId,
  });
  console.log("✔ Set the opening balances (debit 1,500,000 = credit 1,500,000)");

  // 7. Partners referenced by the sample transactions, created once and mapped
  //    from name to id (idempotent: reuse any that already exist).
  const partnerNames = [...new Set(drafts.flatMap((d) => d.partners))];
  const existingPartners = await usecases.partners.list(tenantId);
  const partnerIdByName = new Map(existingPartners.map((p) => [p.name, p.id]));
  for (const name of partnerNames) {
    if (!partnerIdByName.has(name)) {
      partnerIdByName.set(
        name,
        await usecases.partners.create({ tenantId, name, searchWords: [] }),
      );
    }
  }
  const partnerIds = (names: string[]): PartnerId[] =>
    names.map((name) => {
      const id = partnerIdByName.get(name);
      if (!id) throw new Error(`Partner ${name} not found`);
      return id;
    });

  // 8. The transactions, each attached to its documents as it is created.
  let count = 0;
  let documentCount = 0;
  for (const { supportingDocuments, ...draft } of drafts) {
    const supportingDocumentIds = await uploadSupportingDocuments(supportingDocuments);
    await usecases.transactions.create({
      tenantId,
      yearId,
      createdBy: tenantId as string as UserId,
      draft: { ...draft, partners: partnerIds(draft.partners), tags: [] },
      supportingDocumentIds,
    });
    count++;
    documentCount += supportingDocumentIds.length;
  }
  console.log(
    `✔ Seeded ${count} sample transactions (January–June) with ${documentCount} supporting documents`,
  );
  console.log(`\nLogin: ${EMAIL} / ${PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    if (error instanceof FirebaseError || error instanceof Error) {
      console.error(`✗ Seeding failed: ${error.message}`);
      console.error(
        "  Make sure the emulators are running (npm run dev / npm run emulators)",
      );
    } else {
      console.error(error);
    }
    process.exit(1);
  });
