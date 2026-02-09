import { useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import ReferralSection from './ReferralSection';

const ReferralDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
          <Users className="w-5 h-5 text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Parrainage
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto flex-1 pb-8">
          <ReferralSection />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ReferralDialog;
