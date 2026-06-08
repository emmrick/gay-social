// Shared auth guards for edge functions.
// Used to lock down internal/cron-only endpoints and validate JWTs.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const getBearerToken = (req: Request): string | null => {
  const h = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!h || !h.startsWith('Bearer ')) return null;
  return h.slice('Bearer '.length).trim();
};

/**
 * Require the request to come from a trusted internal caller using the
 * Supabase service-role key as Bearer token. Used for cron jobs and
 * Postgres trigger-invoked endpoints (pg_net).
 */
export const requireServiceRole = (req: Request): Response | null => {
  const token = getBearerToken(req);
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!token || !serviceKey || token !== serviceKey) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
};

/**
 * Require a valid authenticated user JWT and return the user id.
 * Returns either { userId } or a Response to short-circuit.
 */
export const requireUser = async (
  req: Request,
): Promise<{ userId: string; token: string } | Response> => {
  const token = getBearerToken(req);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return { userId: data.user.id, token };
};

/**
 * Returns true if the URL hostname resolves to a private/loopback/link-local
 * IP literal that should never be reachable from an SSRF-prone proxy.
 * Note: only blocks literal IPs in the hostname; for DNS hosts the platform
 * still resolves the hostname downstream.
 */
export const isPrivateOrLoopbackHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '0.0.0.0' || host === '::' || host === '::1') return true;
  // IPv4 literal
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local incl AWS metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
  }
  // IPv6 unique local / link-local
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
  if (/^fe80:/.test(host)) return true;
  return false;
};
