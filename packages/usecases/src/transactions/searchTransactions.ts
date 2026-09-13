import type { Transaction } from "@account-ledgers/domain";
import type {
  TransactionRepository,
  TransactionSearchParams,
  TransactionsPage,
} from "../ports/transactionRepository";

/**
 * Substring keyword match against the posting memos, which is where a
 * transaction's free text lives. Partners are id references rather than names,
 * so they are not matched here; resolving partner names for search is a
 * presentation-layer concern. Firestore has no full-text search, so this runs
 * over an already-fetched page.
 */
export function matchesKeyword(
  transaction: Transaction,
  keyword: string,
): boolean {
  const needle = keyword.trim();
  if (!needle) return true;
  return transaction.postings.some((posting) => posting.memo.includes(needle));
}

/** Search. Only the keyword is filtered client-side after fetching, a Firestore limitation. */
export function searchTransactionsUseCase(deps: {
  transactions: TransactionRepository;
}) {
  return async function searchTransactions(
    params: TransactionSearchParams & { keyword?: string },
  ): Promise<TransactionsPage> {
    const page = await deps.transactions.search(params);
    if (!params.keyword?.trim()) return page;
    return {
      transactions: page.transactions.filter((transaction) =>
        matchesKeyword(transaction, params.keyword ?? ""),
      ),
      nextCursor: page.nextCursor,
    };
  };
}
