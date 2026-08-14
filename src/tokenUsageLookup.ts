import { TokenUsage, findTokenUsages } from './tokenUsageScanner';

export function usageAtOffset(content: string, offset: number): TokenUsage | undefined {
  return findTokenUsages(content).find((usage) => offset >= usage.start && offset <= usage.end);
}
