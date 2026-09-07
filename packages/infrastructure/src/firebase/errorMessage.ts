import { FirebaseError } from "firebase/app";

/**
 * Firebase error codes mapped to the Japanese shown on screen.
 *
 * Without this the SDK's own English message would reach the user — the
 * Security Rules rejecting a write, for instance, surfaces as
 * "Missing or insufficient permissions."
 */
const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  "permission-denied":
    "この操作は許可されていません。締切済の会計年度でないか、権限があるかを確認してください",
  unauthenticated: "ログインの有効期限が切れました。再度ログインしてください",
  unavailable:
    "サーバーに接続できませんでした。通信環境を確認して再度お試しください",
  "deadline-exceeded":
    "処理がタイムアウトしました。通信環境を確認して再度お試しください",
  "not-found": "対象のデータが見つかりません",
  "already-exists": "同じデータが既に存在します",
  aborted: "他の操作と競合しました。再度お試しください",
  "failed-precondition": "現在の状態ではこの操作を実行できません",
  "resource-exhausted":
    "リクエストが多すぎます。しばらく待ってから再度お試しください",
  "auth/network-request-failed":
    "ネットワークに接続できませんでした。通信環境を確認して再度お試しください",
};

/**
 * The Japanese for a FirebaseError, looked up by its code, or null when the
 * error is not one the SDK raised or its code has no wording here. Domain and
 * application errors are worded by the presentation layer, which consults this
 * only after them.
 */
export function firebaseErrorMessage(error: unknown): string | null {
  if (error instanceof FirebaseError) {
    return FIREBASE_ERROR_MESSAGES[error.code] ?? null;
  }
  return null;
}
