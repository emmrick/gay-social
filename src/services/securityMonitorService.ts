import { supabase } from "@/integrations/supabase/client";

let isLogging = false;
let cachedUserId: string | null = null;
const recentEvents = new Set<string>();
const DEDUP_WINDOW_MS = 10000;
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

// Cache the user ID to avoid network calls on every security event
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUserId = session?.user?.id || null;
});

const logSecurityEvent = async (
  eventType: string,
  severity: string,
  description: string,
  payload?: string,
  metadata?: Record<string, unknown>
) => {
  if (isLogging) return;
  isLogging = true;

  try {
    await supabase.from("security_events" as any).insert({
      event_type: eventType,
      severity,
      user_id: cachedUserId,
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      description: description.slice(0, 2000),
      payload: payload?.slice(0, 5000) || null,
      metadata: metadata || {},
    });
  } catch {
    // Silent fail
  } finally {
    isLogging = false;
  }
};

const deduplicatedLog = (
  eventType: string,
  severity: string,
  description: string,
  payload?: string,
  metadata?: Record<string, unknown>
) => {
  const key = `${eventType}:${description.slice(0, 100)}`;
  if (recentEvents.has(key)) return;
  recentEvents.add(key);
  setTimeout(() => recentEvents.delete(key), DEDUP_WINDOW_MS);
  logSecurityEvent(eventType, severity, description, payload, metadata);
};

// ── XSS Detection ──
const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on(error|load|click|mouseover|focus|blur)\s*=/i,
  /eval\s*\(/i,
  /document\.(cookie|write|location)/i,
  /<iframe/i,
];

const detectXSS = (input: string): boolean =>
  XSS_PATTERNS.some((pattern) => pattern.test(input));

// ── SQL Injection Detection ──
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION)\b.*\b(FROM|INTO|TABLE|SET|WHERE|ALL)\b)/i,
  /'\s*(OR|AND)\s+'?\d*'?\s*=\s*'?\d*'?/i,
  /;\s*(DROP|DELETE|ALTER|UPDATE|INSERT)\b/i,
  /\bUNION\s+(ALL\s+)?SELECT\b/i,
];

const detectSQLInjection = (input: string): boolean =>
  SQL_PATTERNS.some((pattern) => pattern.test(input));

// ── Input Sanitization Monitor ──
const monitorInputs = () => {
  document.addEventListener("submit", (e) => {
    const form = e.target as HTMLFormElement;
    const inputs = form.querySelectorAll("input, textarea");

    inputs.forEach((input) => {
      const value = (input as HTMLInputElement).value;
      if (!value) return;

      if (detectXSS(value)) {
        e.preventDefault();
        deduplicatedLog("xss_attempt", "high", "Tentative XSS détectée dans un formulaire", value.slice(0, 500), { formAction: form.action, inputName: (input as HTMLInputElement).name });
      }

      if (detectSQLInjection(value)) {
        e.preventDefault();
        deduplicatedLog("sql_injection", "critical", "Tentative d'injection SQL détectée", value.slice(0, 500), { formAction: form.action, inputName: (input as HTMLInputElement).name });
      }
    });
  }, true);
};

// ── URL Manipulation Detection ──
const monitorURLManipulation = () => {
  const checkURL = () => {
    const params = new URLSearchParams(window.location.search);
    params.forEach((value, key) => {
      if (detectXSS(value) || detectSQLInjection(value)) {
        deduplicatedLog("url_manipulation", "high", `Paramètre URL suspect détecté: ${key}`, value.slice(0, 500), { parameter: key });
      }
    });
  };

  checkURL();
  window.addEventListener("popstate", checkURL);
};

// ── Brute Force Detection ──
const monitorBruteForce = () => {
  const originalSignIn = supabase.auth.signInWithPassword.bind(supabase.auth);

  supabase.auth.signInWithPassword = async (credentials: any) => {
    const email = credentials.email || "unknown";
    const now = Date.now();
    const tracker = loginAttempts.get(email) || { count: 0, firstAttempt: now };

    if (now - tracker.firstAttempt > 300000) {
      tracker.count = 0;
      tracker.firstAttempt = now;
    }

    tracker.count++;
    loginAttempts.set(email, tracker);

    if (tracker.count >= 5) {
      deduplicatedLog("brute_force", "critical", `Tentative de brute force détectée: ${tracker.count} essais pour ${email.slice(0, 3)}***`, undefined, { attemptCount: tracker.count, email: email.replace(/(.{3}).*(@.*)/, "$1***$2") });
    }

    const result = await originalSignIn(credentials);

    if (result.error) {
      if (tracker.count >= 3) {
        deduplicatedLog("failed_login", tracker.count >= 5 ? "high" : "medium", `Échecs de connexion répétés (${tracker.count}x)`, undefined, { attemptCount: tracker.count });
      }
    } else {
      loginAttempts.delete(email);
    }

    return result;
  };
};

export const initSecurityMonitor = () => {
  monitorInputs();
  monitorURLManipulation();
  monitorBruteForce();
};

export const logSecurityEventManually = (
  eventType: string,
  severity: string,
  description: string,
  payload?: string,
  metadata?: Record<string, unknown>
) => {
  deduplicatedLog(eventType, severity, description, payload, metadata);
};
