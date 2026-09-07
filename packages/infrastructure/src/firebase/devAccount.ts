/**
 * Development-only (emulator) configuration.
 *
 * Collects the demo account seeded by `scripts/seed.ts` and the flag that gates
 * development-only UI. Hard-coding credentials here is safe because they only
 * ever reach the emulator: a `demo-` prefixed project ID never resolves to a
 * real project.
 */

/** True only when connected to the emulators. Gates development-only UI. */
export const isEmulatorMode = process.env.NEXT_PUBLIC_USE_EMULATOR === "true";

/** Credentials of the demo tenant created by the seed script. */
export const DEMO_ACCOUNT = {
  email: "demo@example.com",
  password: "password123",
};
