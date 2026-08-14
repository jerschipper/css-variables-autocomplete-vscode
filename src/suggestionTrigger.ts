export function hasCompletedTriggerPrefix(beforeCursor: string, triggerPrefix: string): boolean {
  return triggerPrefix.length > 0 && beforeCursor.endsWith(triggerPrefix);
}
