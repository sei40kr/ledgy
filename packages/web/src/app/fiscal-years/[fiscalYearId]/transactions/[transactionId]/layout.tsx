import type { ReactNode } from "react";

// Like the [fiscalYearId] segment, a transaction ID is per-tenant runtime data
// that `output: "export"` cannot enumerate. We emit a single `_` placeholder
// shell and let Firebase Hosting rewrites (see firebase.json) serve it for every
// real `/fiscal-years/<id>/transactions/<txId>/...` path. The page reads the real
// ID from the URL via `usePathname()` (never `useParams()`, which yields the
// placeholder in the exported shell).
export function generateStaticParams() {
  return [{ transactionId: "_" }];
}

export default function TransactionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
