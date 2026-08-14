export interface TokenUsage {
  name: string;
  start: number;
  end: number;
}

const TOKEN_USAGE = /var\((--[\w-]+)\)/g;

export function findTokenUsages(content: string): TokenUsage[] {
  const usages: TokenUsage[] = [];
  TOKEN_USAGE.lastIndex = 0;

  for (let match = TOKEN_USAGE.exec(content); match; match = TOKEN_USAGE.exec(content)) {
    const name = match[1];
    const start = match.index + match[0].indexOf(name);
    usages.push({ name, start, end: start + name.length });
  }

  return usages;
}
