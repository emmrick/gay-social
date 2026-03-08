import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

interface CostItem {
  icon: ReactNode;
  label: string;
  cost: number | string;
  free?: boolean;
}

interface CreditCostSectionProps {
  title: string;
  items: CostItem[];
}

const CreditCostSection = ({ title, items }: CreditCostSectionProps) => (
  <div className="space-y-1">
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
      {title}
    </p>
    {items.map((item, i) => (
      <div
        key={i}
        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-muted-foreground">{item.icon}</span>
          <span className="text-[13px]">{item.label}</span>
        </div>
        <span className={`text-[12px] font-mono font-medium tabular-nums ${
          item.free ? 'text-green-500' : 'text-muted-foreground'
        }`}>
          {item.free ? 'Gratuit' : typeof item.cost === 'number' ? `-${item.cost}` : item.cost}
        </span>
      </div>
    ))}
  </div>
);

export default CreditCostSection;
