export type ClientErrorContext = Record<string, string | number | boolean | null | undefined>;

type NormalizedClientError = {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
};

function normalizeClientError(error: unknown): NormalizedClientError {
  if (error instanceof Error) {
    const coded = error as Error & { code?: string | number };
    return {
      name: error.name || "Error",
      message: error.message || "No error message was provided.",
      stack: error.stack,
      code: coded.code,
    };
  }

  if (error && typeof error === "object") {
    const identifiable = error as { name?: unknown; message?: unknown; code?: unknown };
    return {
      name: typeof identifiable.name === "string" ? identifiable.name : "UnknownError",
      message: typeof identifiable.message === "string" ? identifiable.message : "A non-Error object was thrown.",
      code: typeof identifiable.code === "string" || typeof identifiable.code === "number" ? identifiable.code : undefined,
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : String(error),
  };
}

function runtimeContext() {
  if (typeof window === "undefined") return {};
  return {
    path: window.location.pathname,
    online: window.navigator.onLine,
  };
}

export function reportClientError(operation: string, error: unknown, context: ClientErrorContext = {}) {
  console.error(`[localpdf] ${operation} failed`, {
    timestamp: new Date().toISOString(),
    ...runtimeContext(),
    operation,
    error: normalizeClientError(error),
    context,
  });
}

export function reportClientWarning(operation: string, warning: unknown, context: ClientErrorContext = {}) {
  console.warn(`[localpdf] ${operation} warning`, {
    timestamp: new Date().toISOString(),
    ...runtimeContext(),
    operation,
    warning: normalizeClientError(warning),
    context,
  });
}
