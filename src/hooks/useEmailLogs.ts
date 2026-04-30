import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type EmailLogStatus =
  | 'pending'
  | 'sent'
  | 'suppressed'
  | 'failed'
  | 'bounced'
  | 'complained'
  | 'dlq';

export interface EmailLogRow {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: EmailLogStatus;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  opened_count: number | null;
  clicked_at: string | null;
  clicked_count: number | null;
  bounced_at: string | null;
  complained_at: string | null;
  last_event_at: string | null;
}

export interface UseEmailLogsOptions {
  rangeDays?: number; // 1 / 7 / 30
  template?: string | null; // null = tous
  status?: EmailLogStatus | null; // null = tous
  recipientEmail?: string | null; // filtre par destinataire (hub user)
  limit?: number;
}

export interface EmailLogStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  bounced: number;
  complained: number;
  suppressed: number;
}

/**
 * Charge les logs d'envoi d'emails (déduplique côté client par message_id).
 * RLS : seuls admin/moderator peuvent SELECT.
 */
export const useEmailLogs = (options: UseEmailLogsOptions = {}) => {
  const { rangeDays = 7, template = null, status = null, recipientEmail = null, limit = 500 } = options;

  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      const since = new Date(Date.now() - rangeDays * 24 * 3600 * 1000).toISOString();
      let query = supabase
        .from('email_send_log')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (template) query = query.eq('template_name', template);
      if (status) query = query.eq('status', status);
      if (recipientEmail) query = query.eq('recipient_email', recipientEmail);

      const { data, error: err } = await query;
      if (cancelled) return;

      if (err) {
        setError(err.message);
        setRows([]);
      } else {
        // Déduplique par message_id (garde la ligne la plus récente)
        const seen = new Set<string>();
        const deduped: EmailLogRow[] = [];
        for (const r of (data ?? []) as EmailLogRow[]) {
          const key = r.message_id ?? r.id;
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(r);
        }
        setRows(deduped);
      }
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [rangeDays, template, status, recipientEmail, limit]);

  // Liste distincte des templates (pour le filtre)
  useEffect(() => {
    let cancelled = false;
    const loadTemplates = async () => {
      const { data } = await supabase
        .from('email_send_log')
        .select('template_name')
        .order('template_name', { ascending: true })
        .limit(1000);
      if (cancelled) return;
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => r?.template_name && set.add(r.template_name));
      setTemplates([...set].sort());
    };
    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo<EmailLogStats>(() => {
    const s: EmailLogStats = {
      total: rows.length,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      failed: 0,
      bounced: 0,
      complained: 0,
      suppressed: 0,
    };
    for (const r of rows) {
      if (r.status === 'sent') s.sent += 1;
      if (r.status === 'failed' || r.status === 'dlq') s.failed += 1;
      if (r.status === 'bounced') s.bounced += 1;
      if (r.status === 'complained') s.complained += 1;
      if (r.status === 'suppressed') s.suppressed += 1;
      if (r.delivered_at) s.delivered += 1;
      if (r.opened_at) s.opened += 1;
      if (r.clicked_at) s.clicked += 1;
    }
    return s;
  }, [rows]);

  return { rows, templates, stats, loading, error };
};
