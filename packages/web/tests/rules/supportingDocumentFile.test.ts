import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;
// The owner's uid doubles as the tenant ID (see firestore.rules).
let tenantId: string;
let editor: string;
let viewer: string;
let revoked: string;

const rulesFile = (name: string) =>
  readFileSync(new URL(`../../../../${name}`, import.meta.url), "utf8");

/**
 * The Storage emulator resolves `firestore.get()` against the project the
 * emulators were started with, not the bucket's, so unlike the other rules
 * tests this one must run under `demo-account-ledgers` and share it with the
 * integration tests. It therefore never clears the emulators, and every run
 * seeds its own tenant instead.
 */
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-account-ledgers",
    firestore: { rules: rulesFile("firestore.rules") },
    storage: { rules: rulesFile("storage.rules") },
  });
  const run = randomUUID().slice(0, 8);
  tenantId = `owner-${run}`;
  editor = `editor-${run}`;
  viewer = `viewer-${run}`;
  revoked = `revoked-${run}`;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `tenants/${tenantId}`), { createdAt: new Date() });
    await setDoc(doc(db, `tenants/${tenantId}/members/${tenantId}`), { role: "admin" });
    await setDoc(doc(db, `tenants/${tenantId}/members/${editor}`), { role: "editor" });
    await setDoc(doc(db, `tenants/${tenantId}/members/${viewer}`), { role: "viewer" });
    await setDoc(doc(db, `tenants/${tenantId}/members/${revoked}`), { role: "revoked" });
    await uploadBytes(
      ref(context.storage(), objectPath("existing")),
      new Uint8Array([1, 2, 3]),
      { contentType: "application/pdf" },
    );
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

const pdf = { contentType: "application/pdf" };
const objectPath = (id: string) => `tenants/${tenantId}/supportingDocuments/${id}`;

describe("Storage Security Rules for supportingDocument files", () => {
  it("lets the owner and an editor upload a PDF or image, and any member read it", async () => {
    const asOwner = testEnv.authenticatedContext(tenantId).storage();
    await assertSucceeds(uploadBytes(ref(asOwner, objectPath("r1")), new Uint8Array([1]), pdf));
    const asEditor = testEnv.authenticatedContext(editor).storage();
    await assertSucceeds(
      uploadBytes(ref(asEditor, objectPath("r2")), new Uint8Array([1]), { contentType: "image/png" }),
    );
    const asViewer = testEnv.authenticatedContext(viewer).storage();
    await assertSucceeds(getBytes(ref(asViewer, objectPath("existing"))));
  });

  it("rejects a viewer, a revoked member, a non-member, and an anonymous caller from uploading", async () => {
    for (const uid of [viewer, revoked, "mallory"]) {
      const storage = testEnv.authenticatedContext(uid).storage();
      await assertFails(uploadBytes(ref(storage, objectPath(`by-${uid}`)), new Uint8Array([1]), pdf));
    }
    const anonymous = testEnv.unauthenticatedContext().storage();
    await assertFails(uploadBytes(ref(anonymous, objectPath("anon")), new Uint8Array([1]), pdf));
  });

  it("rejects reading another tenant's file", async () => {
    const stranger = testEnv.authenticatedContext("mallory").storage();
    await assertFails(getBytes(ref(stranger, objectPath("existing"))));
  });

  it("rejects an unsupported content type and an empty file", async () => {
    const owner = testEnv.authenticatedContext(tenantId).storage();
    await assertFails(
      uploadBytes(ref(owner, objectPath("html")), new Uint8Array([1]), { contentType: "text/html" }),
    );
    await assertFails(uploadBytes(ref(owner, objectPath("empty")), new Uint8Array([]), pdf));
  });

  it("never lets a file be overwritten or deleted, even by the owner", async () => {
    const owner = testEnv.authenticatedContext(tenantId).storage();
    await assertFails(uploadBytes(ref(owner, objectPath("existing")), new Uint8Array([9]), pdf));
    await assertFails(deleteObject(ref(owner, objectPath("existing"))));
  });

  it("rejects writes anywhere outside the supportingDocuments path", async () => {
    const owner = testEnv.authenticatedContext(tenantId).storage();
    await assertFails(uploadBytes(ref(owner, `tenants/${tenantId}/other/file`), new Uint8Array([1]), pdf));
    await assertFails(uploadBytes(ref(owner, "public/file"), new Uint8Array([1]), pdf));
  });
});
