import { useState } from 'react';
import { HelpCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  { id: 'how', q: 'Comment fonctionne le système ?', a: 'Chaque action consomme des crédits. 15 crédits à l\'inscription, 5 gratuits chaque jour. Ordre de consommation : Quotidiens → Passif → Bonus → Achetés.' },
  { id: 'daily', q: 'Les crédits quotidiens ?', a: '5 crédits rechargés chaque jour à minuit. Non cumulables : si vous avez encore 3 crédits quotidiens, seuls 2 seront ajoutés.' },
  { id: 'passive', q: 'Comment fonctionne le crédit passif ?', a: 'Vous gagnez 0.1 crédit toutes les 6 heures automatiquement, jusqu\'à un maximum de 10. Aucune action requise.' },
  { id: 'lock', q: 'Pourquoi verrouiller des crédits ?', a: 'Le verrouillage empêche la consommation d\'un type de crédit. Utile pour économiser vos crédits achetés et n\'utiliser que les quotidiens.' },
  { id: 'expiry', q: 'Expiration des crédits ?', a: 'Les crédits achetés et bonus n\'expirent jamais. Seuls les quotidiens sont remplacés chaque jour.' },
  { id: 'prices', q: 'Pourquoi ces prix bas ?', a: 'Tarifs de lancement valables 1 an. Les prix définitifs seront plus élevés.' },
  { id: 'referral', q: 'Le parrainage ?', a: 'Partagez votre code. Quand votre filleul vérifie son identité, vous recevez tous les deux des crédits bonus.' },
  { id: 'gift', q: 'Comment offrir des crédits ?', a: 'Vous pouvez offrir entre 1 et 5 crédits bonus à un autre membre, jusqu\'à 10 fois par jour.' },
];

const CreditFAQSection = () => {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? faqs.filter(f =>
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
      )
    : faqs;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Questions fréquentes</h2>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Rechercher…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 text-xs rounded-xl bg-muted/50 border-border/60"
        />
      </div>

      <Accordion type="single" collapsible className="space-y-1">
        {filtered.map(faq => (
          <AccordionItem key={faq.id} value={faq.id} className="border rounded-xl overflow-hidden border-border/60">
            <AccordionTrigger className="text-[13px] px-3 py-2.5 hover:no-underline hover:bg-muted/30">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-[12px] text-muted-foreground px-3 pb-3 leading-relaxed">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default CreditFAQSection;
