// Single source of truth for Firestore collection and document paths.

export const tenantPath = (tenantId: string) => `tenants/${tenantId}`;

export const memberPath = (tenantId: string, uid: string) =>
  `${tenantPath(tenantId)}/members/${uid}`;

export const accountTitlesPath = (tenantId: string) =>
  `${tenantPath(tenantId)}/accountTitles`;

export const subAccountTitlesPath = (tenantId: string, accountTitleId: string) =>
  `${accountTitlesPath(tenantId)}/${accountTitleId}/subAccountTitles`;

export const partnersPath = (tenantId: string) =>
  `${tenantPath(tenantId)}/partners`;

export const tagsPath = (tenantId: string) => `${tenantPath(tenantId)}/tags`;

export const fiscalYearsPath = (tenantId: string) =>
  `${tenantPath(tenantId)}/fiscalYears`;

export const transactionsPath = (tenantId: string, yearId: string) =>
  `${fiscalYearsPath(tenantId)}/${yearId}/transactions`;

export const transactionRevisionsPath = (
  tenantId: string,
  yearId: string,
  transactionId: string,
) => `${transactionsPath(tenantId, yearId)}/${transactionId}/revisions`;

export const monthlyTransactionSummariesPath = (tenantId: string, yearId: string) =>
  `${fiscalYearsPath(tenantId)}/${yearId}/monthlyTransactionSummaries`;
