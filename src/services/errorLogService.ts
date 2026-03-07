import { supabase } from "@/integrations/supabase/client";

let isLogging = false;

const logError = async (
  errorMessage: string,
  errorStack?: string,
  errorSource?: string,
  metadata?: Record<string, unknown>
) => {
  // Prevent recursive logging
  if (isLogging) return;
  isLogging = true;

  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("error_logs" as any).insert({
      user_id: user?.id || null,
      error_message: errorMessage.slice(0, 2000),
      error_stack: errorStack?.slice(0, 5000) || null,
      error_source: errorSource || "unknown",
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      metadata: metadata || {},
    });
  } catch {
    // Silently fail - we don't want error logging to cause more errors
  } finally {
    isLogging = false;
  }
};

// Deduplicate errors within a short window
const recentErrors = new Set<string>();
const DEDUP_WINDOW_MS = 5000;

const deduplicatedLog = (
  errorMessage: string,
  errorStack?: string,
  errorSource?: string,
  metadata?: Record<string, unknown>
) => {
  const key = `${errorSource}:${errorMessage}`;
  if (recentErrors.has(key)) return;
  recentErrors.add(key);
  setTimeout(() => recentErrors.delete(key), DEDUP_WINDOW_MS);
  logError(errorMessage, errorStack, errorSource, metadata);
};

export const initGlobalErrorCapture = () => {
  // Capture unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    deduplicatedLog(message, stack, "unhandled_rejection");
  });

  // Capture global errors
  window.addEventListener("error", (event) => {
    const message = event.error?.message || event.message || "Unknown error";
    const stack = event.error?.stack;
    deduplicatedLog(message, stack, "global_error", {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Capture console.error calls
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    originalConsoleError.apply(console, args);
    const message = args.map((a) => (a instanceof Error ? a.message : String(a))).join(" ");
    const stack = args.find((a) => a instanceof Error) instanceof Error
      ? (args.find((a) => a instanceof Error) as Error).stack
      : undefined;
    // Only log actual errors, not warnings or debug info
    const isReactWarning = message.startsWith("Warning:") || message.includes("React.forwardRef") || message.includes("Function components cannot be given refs");
    if (!isReactWarning && (message.includes("Error") || message.includes("error") || message.includes("failed"))) {
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
