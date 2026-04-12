import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const Help = lazy(() => import('@/pages/Help'));

const HelpPageRoute = () => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
        <Help embedded />
      </Suspense>
    </div>
  );
};

export default HelpPageRoute;
