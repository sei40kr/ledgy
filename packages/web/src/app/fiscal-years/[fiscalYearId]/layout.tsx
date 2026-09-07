import type { ReactNode } from "react";

// With `output: "export"` a dynamic segment must enumerate its params at build
// time. Fiscal year IDs are per-tenant runtime data, so we emit a single
// placeholder shell and let Firebase Hosting rewrites (see firebase.json) serve
// it for every real `/fiscal-years/<id>/...` path. The pages are client
// components that read the real ID from the URL via `useParams`.
export function generateStaticParams() {
  return [{ fiscalYearId: "_" }];
}

export default function FiscalYearLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
