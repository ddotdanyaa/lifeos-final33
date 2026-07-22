/*
 * Vendored from AFFiNE (https://github.com/toeverything/AFFiNE),
 * packages/frontend/core/src/utils/fuzzy-match.ts — MIT-licensed portion of the repo
 * (everything outside packages/backend and packages/common/native), Copyright (c)
 * 2022-present TOEVERYTHING PTE. LTD. Converted TS->JS verbatim (types stripped) for the
 * no-build vanilla ESM stack. See docs/OSS_DONOR_AUDIT.md. S1.1 uses this in the command
 * palette and graph search.
 */

/**
 * Checks if the name is a fuzzy match of the query.
 *
 * @example
 * const name = 'John Smith';
 * const query = 'js';
 * const isMatch = fuzzyMatch(name, query); // true
 *
 * if matchInitial = true, the first char must match as well
 */
export function fuzzyMatch(name, query, matchInitial) {
  const pureName = [...String(name || "").trim().toLowerCase()]
    .filter((char) => char !== " ")
    .join("");

  const regex = new RegExp(
    [...String(query || "").toLowerCase()]
      .filter((char) => char !== " ")
      .map((item) => `${escapeRegExp(item)}.*`)
      .join(""),
    "i"
  );

  if (matchInitial && query.length > 0 && !pureName.startsWith(query[0])) {
    return false;
  }

  return regex.test(pureName);
}

function escapeRegExp(input) {
  // escape regex characters in the input string to prevent regex format errors
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
