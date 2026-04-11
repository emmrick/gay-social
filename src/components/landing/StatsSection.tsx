import { useTotalMemberCount } from '@/hooks/useTotalMemberCount';
import { FadeInWhenVisible } from './animations';
import { useEffect, useState } from 'react';

const useAnimatedNumber = (target: number, duration = 1500) => {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (target <= 0) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCurrent(target);
        clearInterval(timer);
      } else {
        setCurrent(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return current;
};

const StatsSection = () => {
  const { data: memberCount } = useTotalMemberCount();
  const animatedMembers = useAnimatedNumber(memberCount || 0);

  const stats = [
    { value: '101', label: 'Départements', suffix: '' },
    { value: animatedMembers > 0 ? animatedMembers.toLocaleString('fr-FR') : '...', label: 'Membres inscrits', suffix: '' },
    { value: '0', label: 'Publicité', suffix: '' },
    { value: '100', label: 'Gratuit', suffix: '%' },
  ];

  return (
    <div className="relative z-10 py-16 border-y border-border/30 overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'var(--gradient-subtle)' }} />
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <FadeInWhenVisible>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((stat, i) => (
              <div key={i} className="space-y-1">
                <p className="font-display text-3xl sm:text-4xl font-extrabold gradient-text">
                  {stat.value}{stat.suffix}
                </p>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </FadeInWhenVisible>
      </div>
    </div>
  );
};

export default StatsSection;
