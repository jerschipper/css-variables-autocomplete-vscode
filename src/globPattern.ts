export function normalizeWorkspaceGlob(pattern: string): string {
  return pattern.replace(/^(?:\.\/)+/, '');
}

export function matchesWorkspaceGlob(relativePath: string, pattern: string): boolean {
  const escaped = normalizeWorkspaceGlob(pattern)
    .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/\*\*\//g, '(?:.*/)?')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`).test(relativePath);
}

export function effectiveExcludePatterns(
  includes: readonly string[],
  excludes: readonly string[],
): readonly string[] {
  const includesNodeModules = includes.some((pattern) =>
    normalizeWorkspaceGlob(pattern).startsWith('node_modules/'),
  );

  return includesNodeModules
    ? excludes.filter((pattern) => normalizeWorkspaceGlob(pattern) !== 'node_modules/**')
    : excludes;
}
