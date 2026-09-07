/**
 * Tidies the search words typed into a master's form before they reach the
 * usecase: trims each word, drops the empties, and de-duplicates while keeping
 * the order they were entered in.
 */
export function normalizeSearchWords(words: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const word of words) {
    const trimmed = word.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}
