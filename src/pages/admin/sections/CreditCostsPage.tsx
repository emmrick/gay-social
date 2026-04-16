import CreditOffersPanel from '@/components/admin/CreditOffersPanel';
import AdFreePlansPanel from '@/components/admin/AdFreePlansPanel';
import CreditCostsPanel from '@/components/admin/CreditCostsPanel';

const CreditCostsPage = () => (
  <div className="space-y-8">
    <CreditOffersPanel />
    <AdFreePlansPanel />
    <CreditCostsPanel />
  </div>
);

export default CreditCostsPage;
