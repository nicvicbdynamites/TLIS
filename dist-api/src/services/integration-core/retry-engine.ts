/**
 * Retry Engine — shared exponential-backoff retry wrapper for Integration Core
 * adapters. Auth-shaped errors (401/403/unauthorized/invalid key) are treated
 * as non-retryable by default since retrying them just wastes rate-limit budget.
 *
 * Usage:
 *   const result = await withRetry(() => adapter.testConnection());
 */

export interface RetryOptions {
  retries?:      number;
  baseDelayMs?:  number;
  maxDelayMs?:   number;
  isRetryable?:  (err: unknown) => boolean;
  onRetry?:      (attempt: number, err: unknown) => void;
}

const AUTH_ERROR_PATTERN = /(401|403|unauthorized|forbidden|invalid api key|invalid_api_key|auth)/i;

export function defaultIsRetryable(err: unknown): boolean {
  const msg = String((err as { message?: unknown })?.message ?? err ?? "");
  return !AUTH_ERROR_PATTERN.test(msg);
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const {
    retries     = 2,
    baseDelayMs = 500,
    maxDelayMs  = 5_000,
    isRetryable = defaultIsRetryable,
    onRetry,
  } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryable(err)) throw err;
      onRetry?.(attempt + 1, err);
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}
