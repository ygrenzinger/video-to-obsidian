export type RuntimeLog = (message: string) => void;

type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
};

export function formatTokenUsage(usage: TokenUsage): string {
  const parts = [
    tokenPart('input', usage.inputTokens),
    tokenPart('output', usage.outputTokens),
    tokenPart('total', usage.totalTokens),
    tokenPart('reasoning', usage.reasoningTokens),
    tokenPart('cached input', usage.cachedInputTokens)
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(', ') : 'token usage unavailable';
}

export function formatLogError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

function tokenPart(label: string, value: number | undefined): string | null {
  return value === undefined ? null : `${label} ${value}`;
}
