export function levenshteinDistance(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const distances: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let row = 0; row < rows; row++) {
    distances[row][0] = row;
  }
  for (let col = 0; col < cols; col++) {
    distances[0][col] = col;
  }

  for (let row = 1; row < rows; row++) {
    for (let col = 1; col < cols; col++) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      distances[row][col] = Math.min(
        distances[row - 1][col] + 1,
        distances[row][col - 1] + 1,
        distances[row - 1][col - 1] + cost,
      );
    }
  }

  return distances[rows - 1][cols - 1];
}

export function closestMatches(target: string, candidates: readonly string[], maxDistance: number, limit = 3): string[] {
  return candidates
    .map((candidate) => ({ candidate, distance: levenshteinDistance(target, candidate) }))
    .filter((entry) => entry.distance <= maxDistance)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}
