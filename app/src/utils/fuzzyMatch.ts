/**
 * Result of a fuzzy match operation
 */
export interface MatchResult {
  matched: boolean;
  score: number; // Higher is better
  matchedIndices: number[]; // For highlighting
}

/**
 * Scoring weights for match quality
 */
const SCORING = {
  consecutiveMatch: 15,
  wordBoundaryMatch: 10,
  camelCaseMatch: 10,
  firstCharMatch: 15,
  gapPenalty: -1,
} as const;

/**
 * Performs fuzzy matching between query and target string
 *
 * Algorithm:
 * - Sequential character matching (order matters)
 * - Bonus for consecutive matches
 * - Bonus for word boundary matches
 * - Bonus for camelCase matches
 * - Case-insensitive by default
 *
 * Example:
 *   query: "mtno"
 *   target: "meeting-notes"
 *   → matches: [0, 4, 8, 9], score: 85
 *
 * @param query - The search string
 * @param target - The string to search in
 * @returns MatchResult with matched status, score, and matched indices
 */
export function fuzzyMatch(query: string, target: string): MatchResult {
  if (!query) {
    return { matched: true, score: 0, matchedIndices: [] };
  }

  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();

  const matchedIndices: number[] = [];
  let score = 0;
  let queryIndex = 0;
  let previousMatchIndex = -1;

  // Try to match all query characters in order
  for (let targetIndex = 0; targetIndex < targetLower.length; targetIndex++) {
    if (queryIndex >= queryLower.length) {
      break;
    }

    if (queryLower[queryIndex] === targetLower[targetIndex]) {
      matchedIndices.push(targetIndex);

      // Bonus for first character match
      if (targetIndex === 0) {
        score += SCORING.firstCharMatch;
      }

      // Bonus for consecutive matches
      if (previousMatchIndex === targetIndex - 1) {
        score += SCORING.consecutiveMatch;
      } else if (previousMatchIndex >= 0) {
        // Penalty for gaps
        const gap = targetIndex - previousMatchIndex - 1;
        score += gap * SCORING.gapPenalty;
      }

      // Bonus for word boundary matches
      if (isWordBoundary(target, targetIndex)) {
        score += SCORING.wordBoundaryMatch;
      }

      // Bonus for camelCase matches
      if (isCamelCaseMatch(target, targetIndex)) {
        score += SCORING.camelCaseMatch;
      }

      previousMatchIndex = targetIndex;
      queryIndex++;
    }
  }

  // All query characters must be matched
  const matched = queryIndex === queryLower.length;

  if (!matched) {
    return { matched: false, score: 0, matchedIndices: [] };
  }

  // Boost score for matches with higher character coverage
  const coverage = matchedIndices.length / target.length;
  score += coverage * 50;

  return { matched, score, matchedIndices };
}

/**
 * Checks if a character at the given index is at a word boundary
 * Word boundaries are: start of string, after space, after dash, after slash
 */
function isWordBoundary(str: string, index: number): boolean {
  if (index === 0) return true;
  const prevChar = str[index - 1];
  return prevChar === ' ' || prevChar === '-' || prevChar === '/' || prevChar === '_';
}

/**
 * Checks if a character at the given index is a camelCase boundary
 * (lowercase followed by uppercase)
 */
function isCamelCaseMatch(str: string, index: number): boolean {
  if (index === 0 || index >= str.length) return false;
  const currentChar = str[index];
  const prevChar = str[index - 1];
  if (!currentChar || !prevChar) return false;
  return (
    currentChar === currentChar.toUpperCase() &&
    currentChar !== currentChar.toLowerCase() &&
    prevChar === prevChar.toLowerCase()
  );
}
