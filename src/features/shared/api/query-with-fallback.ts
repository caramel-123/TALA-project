import { isSupabaseConfigured } from '../../../lib/supabase/client';
import type { QueryResult } from '../types/query-result';

function toErrorMessage(error: unknown, contextLabel: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }

    const maybeDetails = (error as { details?: unknown }).details;
    if (typeof maybeDetails === 'string' && maybeDetails.trim().length > 0) {
      return maybeDetails;
    }

    const maybeHint = (error as { hint?: unknown }).hint;
    if (typeof maybeHint === 'string' && maybeHint.trim().length > 0) {
      return maybeHint;
    }

    try {
      const asJson = JSON.stringify(error);
      if (asJson && asJson !== '{}') {
        return asJson;
      }
    } catch {
      // noop
    }
  }

  return `Unknown error loading ${contextLabel}.`;
}

export async function queryWithFallback<T>(
  loader: () => Promise<T>,
  fallbackData: T,
  contextLabel: string,
): Promise<QueryResult<T>> {
  const isDev = import.meta.env.DEV;

  if (!isSupabaseConfigured) {
    if (isDev) {
      return {
        data: fallbackData,
        usingFallback: true,
        error: `Supabase env vars are missing for ${contextLabel}.`,
      };
    }

    return {
      data: fallbackData,
      usingFallback: false,
      error: `Supabase env vars are missing for ${contextLabel}.`,
    };
  }

  try {
    const data = await loader();
    return {
      data,
      usingFallback: false,
      error: null,
    };
  } catch (error) {
    const message = toErrorMessage(error, contextLabel);

    if (isDev) {
      return {
        data: fallbackData,
        usingFallback: true,
        error: message,
      };
    }

    return {
      data: fallbackData,
      usingFallback: false,
      error: message,
    };
  }
}
