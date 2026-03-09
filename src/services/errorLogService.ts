import { supabase } from "@/integrations/supabase/client";

let isLogging = false;
let cachedUserId: string | null = null;

// Cache the user ID to avoid network calls on every error
const getCachedUserId = async (): Promise<string | null> => {
  if (cachedUserId !== null) return cachedUserId;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    cachedUserId = session?.user?.id || null;
  } catch {
    cachedUserId = null;
  }
  return cachedUserId;
};

// Listen for auth changes to update cache
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUserId = session?.user?.id || null;
});

const logError = async (
  errorMessage: string,
  errorStack?: string,
  errorSource?: string,
  metadata?: Record<string, unknown>
) => {
  if (isLogging) return;
  isLogging = true;

  try {
    const userId = await getCachedUserId();

    await supabase.from("error_logs" as any).insert({
      user_id: userId,
      error_message: errorMessage.slice(0, 2000),
      error_stack: errorStack?.slice(0, 5000) || null,
      error_source: errorSource || "unknown",
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      metadata: metadata || {},
    });
  } catch {
    // Silently fail
  } finally {
    isLogging = false;
  }
};

const recentErrors = new Set<string>();
const DEDUP_WINDOW_MS = 5000;

const deduplicatedLog = (
  errorMessage: string,
  errorStack?: string,
  errorSource?: string,
  metadata?: Record<string, unknown>
) => {
  const key = `${errorSource}:${errorMessage.slice(0, 80)}`;
  if (recentErrors.has(key)) return;
  recentErrors.add(key);
  setTimeout(() => recentErrors.delete(key), DEDUP_WINDOW_MS);
  logError(errorMessage, errorStack, errorSource, metadata);
};

export const initGlobalErrorCapture = () => {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    deduplicatedLog(message, stack, "unhandled_rejection");
  });

  window.addEventListener("error", (event) => {
    const message = event.error?.message || event.message || "Unknown error";
    const stack = event.error?.stack;
    deduplicatedLog(message, stack, "global_error", {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Patch console.error – lightweight, no network per call
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    originalConsoleError.apply(console, args);
    const message = args.map((a) => (a instanceof Error ? a.message : String(a))).join(" ");
    const stack = args.find((a) => a instanceof Error) instanceof Error
      ? (args.find((a) => a instanceof Error) as Error).stack
      : undefined;
    const isReactWarning = message.startsWith("Warning:") || message.includes("React.forwardRef") || message.includes("Function components cannot be given refs");
    const isVagueRejection = message === "Rejected" || message === "undefined" || message === "[object Object]";
    if (!isReactWarning && !isVagueRejection && (message.includes("Error") || message.includes("error") || message.includes("failed"))) {
      deduplicatedLog(message.slice(0, 2000), stack, "console_error");
    }
  };
};

export const logErrorManually = (
  error: Error | string,
  source: string = "manual",
  metadata?: Record<string, unknown>
) => {
  const message = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : undefined;
  deduplicatedLog(message, stack, source, metadata);
};
