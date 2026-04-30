import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Mail, Send, CheckCheck, Eye, MousePointerClick, AlertTriangle, ShieldAlert, Ban, Loader2, RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEmailLogs, type EmailLogRow, type EmailLogStatus } from '@/hooks/useEmailLogs';

const RANGES = [
  { value: 1, label: '24 h' },
  { value: 7, label: '7 jours' },
  { value: 30, label: '30 jours' },
];

const STATUS_LABEL: Record<EmailLogStatus, string> = {
  pending: 'En attente',
  sent: 'Envoyé',
  suppressed: 'Bloqué',
  failed: 'Échec',
  bounced: 'Rejeté',
  complained: 'Plainte',
  dlq: 'Échec final',
};

const StatusBadge = ({ row }: { row: EmailLogRow }) => {
  // Statut "le plus avancé"
  if (row.status === 'bounced') return <Badge variant="destructive">Rejeté</Badge>;
  if (row.status === 'complained') return <Badge variant="destructive">Plainte</Badge>;
  if (row.status === 'failed' || row.status === 'dlq') return <Badge variant="destructive">Échec</Badge>;
  if (row.status === 'suppressed') return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">Bloqué</Badge>;
  if (row.clicked_at) return <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30">Cliqué</Badge>;
  if (row.opened_at) return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">Ouvert</Badge>;
  if (row.delivered_at) return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Délivré</Badge>;
  if (row.status === 'sent') return <Badge variant="secondary">Envoyé</Badge>;
  return <Badge variant="outline">{STATUS_LABEL[row.status]}</Badge>;
};

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  total: number;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}
const StatCard = ({ icon: Icon, label, value, total, tone = 'default' }: StatCardProps) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const toneClass = {
    default: 'text-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-rose-600 dark:text-rose-400',
    info: 'text-blue-600 dark:text-blue-400',
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-semibold ${toneClass}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{pct}% du total</div>
    </Card>
  );
};

const EmailsPage = () => {
  const [range, setRange] = useState(7);
  const [template, setTemplate] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const { rows, templates, stats, loading, error } = useEmailLogs({
    rangeDays: range,
    template: template === 'all' ? null : template,
    status: status === 'all' ? null : (status as EmailLogStatus),
    // refreshKey est dans la deps via useMemo si on voulait, mais simple: on remonte le composant en changeant la key
  });

  const filtered = rows.filter((r) =>
    search.trim() === '' ? true : r.recipient_email.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="space-y-4" key={refreshKey}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Suivi des e-mails
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Statut d'envoi, livraison, ouverture et clic des emails transactionnels.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
          <RefreshCw className="w-3.5 h-3.5 mr-2" />
          Rafraîchir
        </Button>
      </div>

      {/* Filtres */}
      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={range === r.value ? 'default' : 'outline'}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <Select value={template} onValueChange={setTemplate}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Template" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les templates</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="sent">Envoyé</SelectItem>
            <SelectItem value="failed">Échec</SelectItem>
            <SelectItem value="bounced">Rejeté</SelectItem>
            <SelectItem value="complained">Plainte</SelectItem>
            <SelectItem value="suppressed">Bloqué</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Rechercher email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[220px] h-9"
        />
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={Send} label="Envoyés" value={stats.sent} total={stats.total} tone="default" />
        <StatCard icon={CheckCheck} label="Délivrés" value={stats.delivered} total={stats.total} tone="success" />
        <StatCard icon={Eye} label="Ouverts" value={stats.opened} total={stats.total} tone="info" />
        <StatCard icon={MousePointerClick} label="Cliqués" value={stats.clicked} total={stats.total} tone="info" />
        <StatCard icon={AlertTriangle} label="Échecs" value={stats.failed} total={stats.total} tone="danger" />
        <StatCard icon={Ban} label="Rejetés" value={stats.bounced} total={stats.total} tone="danger" />
        <StatCard icon={ShieldAlert} label="Plaintes" value={stats.complained} total={stats.total} tone="warning" />
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="p-8 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Chargement…
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucun email sur cette période.</div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Délivré</TableHead>
                  <TableHead>Ouvert</TableHead>
                  <TableHead>Cliqué</TableHead>
                  <TableHead>Envoyé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.recipient_email}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{row.template_name}</Badge></TableCell>
                    <TableCell><StatusBadge row={row} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.delivered_at ? format(new Date(row.delivered_at), 'dd/MM HH:mm', { locale: fr }) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.opened_at ? (
                        <span title={format(new Date(row.opened_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}>
                          {format(new Date(row.opened_at), 'dd/MM HH:mm', { locale: fr })}
                          {(row.opened_count ?? 0) > 1 && (
                            <span className="ml-1 text-[10px] opacity-70">×{row.opened_count}</span>
                          )}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.clicked_at ? (
                        <>
                          {format(new Date(row.clicked_at), 'dd/MM HH:mm', { locale: fr })}
                          {(row.clicked_count ?? 0) > 1 && (
                            <span className="ml-1 text-[10px] opacity-70">×{row.clicked_count}</span>
                          )}
                        </>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground" title={format(new Date(row.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}>
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: fr })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      <p className="text-[11px] text-muted-foreground px-1">
        ⓘ Les ouvertures et clics nécessitent que le tracking soit activé dans Resend (Settings → Tracking).
        Certains clients mail (Apple Mail, Gmail proxy) peuvent gonfler ou bloquer les ouvertures.
      </p>
    </div>
  );
};

export default EmailsPage;
