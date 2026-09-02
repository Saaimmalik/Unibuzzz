// Escapes ILIKE wildcard characters in user-typed search input, so a query
// like "100%" or "a_b" searches for that text literally instead of having
// % and _ act as pattern wildcards.
export function toIlikePattern(query: string): string {
  const escaped = query.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}
