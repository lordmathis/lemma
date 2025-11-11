import type {
  CompletionContext,
  CompletionResult,
  Completion,
} from '@codemirror/autocomplete';
import type { FlatFile } from './fileHelpers';
import { fuzzyMatch } from './fuzzyMatch';

/**
 * Wiki link context detection result
 */
interface WikiLinkContext {
  isWikiLink: boolean;
  isImage: boolean; // true if ![[
  query: string; // partial text after [[
  from: number; // cursor position to replace from
  to: number; // cursor position to replace to
}

/**
 * Creates CodeMirror autocompletion source for wiki links
 *
 * @param files - Flattened file list from workspace
 * @returns CompletionSource function
 */
export function createWikiLinkCompletions(
  files: FlatFile[]
): (context: CompletionContext) => CompletionResult | null {
  return (context: CompletionContext): CompletionResult | null => {
    const wikiContext = detectWikiLinkContext(context);

    if (!wikiContext.isWikiLink) {
      return null;
    }

    // Filter and rank files based on query
    const rankedFiles = filterAndRankFiles(
      wikiContext.query,
      files,
      wikiContext.isImage,
      50
    );

    if (rankedFiles.length === 0) {
      return null;
    }

    // Convert to completion options
    const options = rankedFiles.map((file) => formatCompletion(file));

    return {
      from: wikiContext.from,
      to: wikiContext.to,
      options,
      // Don't set filter or validFor - let CodeMirror re-trigger our completion
      // source on every keystroke so we can re-filter with fuzzy matching
    };
  };
}

/**
 * Detects if cursor is inside a wiki link and extracts context
 *
 * Detection logic:
 * 1. Search backwards from cursor for [[ or ![[
 * 2. Ensure no closing ]] between opener and cursor
 * 3. Extract partial query (text after [[ and before cursor)
 * 4. Determine if image link (![[) or regular ([[)
 *
 * Examples:
 *   "[[meeti|ng"  → { isWikiLink: true, query: "meeti", ... }
 *   "![[img|"     → { isWikiLink: true, isImage: true, query: "img", ... }
 *   "regular text|" → { isWikiLink: false }
 */
function detectWikiLinkContext(context: CompletionContext): WikiLinkContext {
  const { state, pos } = context;
  const line = state.doc.lineAt(pos);
  const textBefore = state.sliceDoc(line.from, pos);

  // Look for [[ or ![[
  const imageWikiLinkMatch = textBefore.lastIndexOf('![[');
  const regularWikiLinkMatch = textBefore.lastIndexOf('[[');

  // Determine which one is closer to cursor
  let isImage = false;
  let openerIndex = -1;

  if (imageWikiLinkMatch > regularWikiLinkMatch) {
    isImage = true;
    openerIndex = imageWikiLinkMatch;
  } else if (regularWikiLinkMatch >= 0) {
    openerIndex = regularWikiLinkMatch;
  }

  // If no opener found, not in a wiki link
  if (openerIndex < 0) {
    return {
      isWikiLink: false,
      isImage: false,
      query: '',
      from: pos,
      to: pos,
    };
  }

  // Calculate the absolute position of the opener in the document
  const openerPos = line.from + openerIndex;
  const openerLength = isImage ? 3 : 2; // ![[ or [[
  const queryStartPos = openerPos + openerLength;

  // Check if there's a closing ]] between opener and cursor
  const textAfterOpener = textBefore.slice(openerIndex);
  const closingIndex = textAfterOpener.indexOf(']]');

  if (closingIndex >= 0 && closingIndex < textAfterOpener.length - 2) {
    // Found ]] before cursor, so we're not inside a wiki link
    return {
      isWikiLink: false,
      isImage: false,
      query: '',
      from: pos,
      to: pos,
    };
  }

  // Extract the query (text between [[ and cursor)
  const query = state.sliceDoc(queryStartPos, pos);

  return {
    isWikiLink: true,
    isImage,
    query,
    from: queryStartPos,
    to: pos,
  };
}

/**
 * Filters files and ranks by relevance
 *
 * Ranking priority:
 * 1. File type match (images for ![[, markdown for [[)
 * 2. Fuzzy match score
 * 3. Exact filename match > path component match
 * 4. Shorter paths (prefer root over deeply nested)
 * 5. Alphabetical for ties
 *
 * @param query - User's partial input
 * @param files - All available files
 * @param isImage - Whether to filter for images
 * @param maxResults - Limit returned results (default: 50)
 */
function filterAndRankFiles(
  query: string,
  files: FlatFile[],
  isImage: boolean,
  maxResults = 50
): FlatFile[] {
  // If query is empty, show all matching file types
  if (!query) {
    const filtered = files.filter((f) => f.isImage === isImage);
    return filtered.slice(0, maxResults);
  }

  interface ScoredFile {
    file: FlatFile;
    score: number;
    nameScore: number;
    pathScore: number;
  }

  const scored: ScoredFile[] = [];

  for (const file of files) {
    // Filter by file type
    if (file.isImage !== isImage) {
      continue;
    }

    // Try matching against different fields
    const nameMatch = fuzzyMatch(query, file.nameWithoutExt);
    const pathMatch = fuzzyMatch(query, file.displayPath);

    // Use the best match
    if (nameMatch.matched || pathMatch.matched) {
      // Prefer name matches over path matches
      const nameScore = nameMatch.matched ? nameMatch.score : 0;
      const pathScore = pathMatch.matched ? pathMatch.score : 0;

      // Name matches get higher priority
      const totalScore = nameScore * 2 + pathScore;

      // Penalize deeply nested files slightly
      const depth = file.path.split('/').length;
      const depthPenalty = depth * 0.5;

      scored.push({
        file,
        score: totalScore - depthPenalty,
        nameScore,
        pathScore,
      });
    }
  }

  // Sort by score (descending), then alphabetically
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.file.displayPath.localeCompare(b.file.displayPath);
  });

  // Return top results
  return scored.slice(0, maxResults).map((s) => s.file);
}

/**
 * Converts FlatFile to CodeMirror Completion object
 *
 * Format rules:
 * - Markdown files: show path without .md extension
 * - Images: show full path with extension
 * - Display includes path relative to workspace root
 * - Apply text: full path (no extension for .md)
 *
 * Example outputs:
 *   work/2024/meeting-notes    (for .md)
 *   assets/screenshot.png       (for image)
 */
function formatCompletion(file: FlatFile): Completion {
  return {
    label: file.displayPath,
    apply: file.displayPath,
    type: file.isImage ? 'image' : 'file',
    detail: file.parentFolder || '/',
    boost: 0,
  };
}
