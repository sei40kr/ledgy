import {
  FiscalYearPeriodInvalidError,
  MonetaryAmountNotIntegerError,
  PostingAccountTitleMissingError,
  PostingAmountNotPositiveError,
  PostingSideInvalidError,
  PostingsEmptyError,
  SupportingDocumentContentTypeUnsupportedError,
  SupportingDocumentFileEmptyError,
  SupportingDocumentFileTooLargeError,
  TooManyPostingsError,
  TransactionTotalNotPositiveError,
  TransactionUnbalancedError,
} from "@account-ledgers/domain";
import {
  AccountTitleNameRequiredError,
  AccountTitleNameTakenError,
  AccountTitleNotFoundError,
  DateOutsideFiscalYearError,
  EmailAlreadyInUseError,
  FiscalYearClosedError,
  FiscalYearNotFoundError,
  FiscalYearPeriodOverlapsError,
  InvalidCredentialError,
  InvalidEmailError,
  MonthOutsideFiscalYearError,
  OpeningBalanceNegativeError,
  OpeningBalanceUnbalancedError,
  PartnerNameRequiredError,
  PartnerNotFoundError,
  SubAccountTitleNotFoundError,
  SupportingDocumentAlreadyAttachedError,
  SupportingDocumentAttachedElsewhereError,
  SupportingDocumentFileNameRequiredError,
  SupportingDocumentNotAttachedError,
  SupportingDocumentNotFoundError,
  TagNameRequiredError,
  TagNotFoundError,
  TooManyAuthAttemptsError,
  TransactionDeletedError,
  TransactionNotFoundError,
  WeakPasswordError,
} from "@account-ledgers/usecases";
import { firebaseErrorMessage } from "@account-ledgers/infrastructure/firebase/errorMessage";
import { POSTING_SIDE_LABELS } from "@/components/labels";

// The Japanese shown for a refused operation. The domain and application layers
// throw one error class per rule, carrying only the facts; wording them belongs
// to the presentation layer, so every message lives here.

function domainErrorMessage(error: unknown): string | null {
  if (error instanceof MonetaryAmountNotIntegerError) {
    return "金額は整数(円)で指定してください";
  }
  if (error instanceof FiscalYearPeriodInvalidError) {
    return "会計年度の開始日は終了日より前にしてください";
  }
  if (error instanceof PostingsEmptyError) {
    return "明細行を1行以上入力してください";
  }
  if (error instanceof TooManyPostingsError) {
    return `明細行は${error.max}行以内にしてください`;
  }
  if (error instanceof PostingSideInvalidError) {
    return `明細${error.index + 1}行目の貸借区分が不正です`;
  }
  if (error instanceof PostingAccountTitleMissingError) {
    return `明細${error.index + 1}行目の勘定科目を選択してください`;
  }
  if (error instanceof PostingAmountNotPositiveError) {
    return `明細${error.index + 1}行目の金額は1円以上で指定してください`;
  }
  if (error instanceof TransactionUnbalancedError) {
    return `貸借が一致していません(借方 ${error.debitTotal.toLocaleString()}円 / 貸方 ${error.creditTotal.toLocaleString()}円)`;
  }
  if (error instanceof TransactionTotalNotPositiveError) {
    return "仕訳の合計金額は1円以上にしてください";
  }
  if (error instanceof SupportingDocumentContentTypeUnsupportedError) {
    return "証憑にはPDFまたは画像(JPEG・PNG・WebP)のみ添付できます";
  }
  if (error instanceof SupportingDocumentFileEmptyError) {
    return "空のファイルは添付できません";
  }
  if (error instanceof SupportingDocumentFileTooLargeError) {
    return `ファイルサイズは${Math.floor(error.maxSize / (1024 * 1024))}MB以下にしてください`;
  }
  return null;
}

function applicationErrorMessage(error: unknown): string | null {
  if (error instanceof FiscalYearNotFoundError) return "会計年度が見つかりません";
  if (error instanceof FiscalYearClosedError) {
    return "締切済の会計年度は変更できません";
  }
  if (error instanceof FiscalYearPeriodOverlapsError) {
    return "期間が既存の会計年度と重複しています";
  }
  if (error instanceof DateOutsideFiscalYearError) {
    return "日付が会計年度の期間外です";
  }
  if (error instanceof MonthOutsideFiscalYearError) {
    return "指定された月は会計年度の範囲外です";
  }
  if (error instanceof OpeningBalanceNegativeError) {
    return `科目(${error.accountTitleId})の${POSTING_SIDE_LABELS[error.side]}残高は0円以上で指定してください`;
  }
  if (error instanceof OpeningBalanceUnbalancedError) {
    return `期首残高の貸借が一致していません(借方 ${error.debitTotal.toLocaleString()}円 / 貸方 ${error.creditTotal.toLocaleString()}円)`;
  }
  if (error instanceof AccountTitleNameRequiredError) {
    return "科目名を入力してください";
  }
  if (error instanceof AccountTitleNameTakenError) {
    return `科目名 ${error.name} は既に使われています`;
  }
  if (error instanceof AccountTitleNotFoundError) return "科目が見つかりません";
  if (error instanceof SubAccountTitleNotFoundError) {
    return "補助科目が見つかりません";
  }
  if (error instanceof PartnerNameRequiredError) {
    return "取引先名を入力してください";
  }
  if (error instanceof PartnerNotFoundError) return "取引先が見つかりません";
  if (error instanceof TagNameRequiredError) return "タグ名を入力してください";
  if (error instanceof TagNotFoundError) return "タグが見つかりません";
  if (error instanceof TransactionNotFoundError) return "仕訳が見つかりません";
  if (error instanceof TransactionDeletedError) {
    return "削除済の仕訳は編集できません";
  }
  if (error instanceof SupportingDocumentNotFoundError) return "証憑が見つかりません";
  if (error instanceof SupportingDocumentFileNameRequiredError) {
    return "ファイル名が空です";
  }
  if (error instanceof SupportingDocumentAlreadyAttachedError) {
    return "この証憑は既にこの仕訳に添付されています";
  }
  if (error instanceof SupportingDocumentAttachedElsewhereError) {
    return "この証憑は既に別の仕訳に添付されています";
  }
  if (error instanceof SupportingDocumentNotAttachedError) {
    return "この証憑はこの仕訳に添付されていません";
  }
  if (error instanceof EmailAlreadyInUseError) {
    return "このメールアドレスは既に登録されています";
  }
  if (error instanceof InvalidEmailError) {
    return "メールアドレスの形式が正しくありません";
  }
  if (error instanceof WeakPasswordError) {
    return "パスワードは6文字以上にしてください";
  }
  if (error instanceof InvalidCredentialError) {
    return "メールアドレスまたはパスワードが正しくありません";
  }
  if (error instanceof TooManyAuthAttemptsError) {
    return "試行回数が多すぎます。しばらく待ってから再度お試しください";
  }
  return null;
}

/**
 * Converts anything thrown into a Japanese message fit for the screen: a domain
 * or application error by its class, a Firebase error by its code, and anything
 * else as the caller's fallback wording rather than an English SDK string.
 */
export function toDisplayMessage(error: unknown, fallback: string): string {
  return (
    domainErrorMessage(error) ??
    applicationErrorMessage(error) ??
    firebaseErrorMessage(error) ??
    fallback
  );
}
