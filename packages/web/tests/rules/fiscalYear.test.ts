import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { createRulesTestEnv } from "./helpers";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await createRulesTestEnv("fiscal-year");
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

async function seedYear(status: "open" | "closed") {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "tenants/alice"), { createdAt: new Date() });
    await setDoc(doc(db, "tenants/alice/members/alice"), { role: "admin" });
    await setDoc(doc(db, "tenants/alice/members/ed"), { role: "editor" });
    await setDoc(doc(db, "tenants/alice/fiscalYears/fy1"), {
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      status,
    });
  });
}

describe("Security Rules for fiscalYears", () => {
  it("allows creating a well-formed fiscal year", async () => {
    await seedYear("open");
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "tenants/alice/fiscalYears/fy2"), {
        startDate: new Date("2027-01-01"),
        endDate: new Date("2027-12-31"),
        status: "open",
      }),
    );
  });

  it("rejects a start date at or after the end date, and an invalid status", async () => {
    await seedYear("open");
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(db, "tenants/alice/fiscalYears/fy2"), {
        startDate: new Date("2027-12-31"),
        endDate: new Date("2027-01-01"),
        status: "open",
      }),
    );
    await assertFails(
      setDoc(doc(db, "tenants/alice/fiscalYears/fy2"), {
        startDate: new Date("2027-01-01"),
        endDate: new Date("2027-12-31"),
        status: "archived",
      }),
    );
  });

  it("lets an editor close an open year", async () => {
    await seedYear("open");
    const db = testEnv.authenticatedContext("ed").firestore();
    await assertSucceeds(
      updateDoc(doc(db, "tenants/alice/fiscalYears/fy1"), { status: "closed" }),
    );
  });

  it("blocks an editor from reopening or otherwise touching a closed year", async () => {
    await seedYear("closed");
    const db = testEnv.authenticatedContext("ed").firestore();
    await assertFails(
      updateDoc(doc(db, "tenants/alice/fiscalYears/fy1"), { status: "open" }),
    );
    await assertFails(
      updateDoc(doc(db, "tenants/alice/fiscalYears/fy1"), {
        endDate: new Date("2027-03-31"),
      }),
    );
  });

  it("lets the owner reopen a closed year", async () => {
    await seedYear("closed");
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      updateDoc(doc(db, "tenants/alice/fiscalYears/fy1"), { status: "open" }),
    );
  });
});
