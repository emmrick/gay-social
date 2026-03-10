import { useState, useEffect } from 'react';
import { Ban, MapPin } from 'lucide-react';

const ALLOWED_COUNTRY_CODES = [
  'FR', // France métropolitaine
  'GP', // Guadeloupe
  'MQ', // Martinique
  'GF', // Guyane française
  'RE', // Réunion
  'YT', // Mayotte
  'PM', // Saint-Pierre-et-Miquelon
  'BL', // Saint-Barthélemy
  'MF', // Saint-Martin
  'WF', // Wallis-et-Futuna
  'PF', // Polynésie française
  'NC', // Nouvelle-Calédonie
];

const GEO_CHECK_KEY = 'gc_geo_allowed';
const GEO_CHECK_EXPIRY_KEY = 'gc_geo_expiry';
const CACHE_DURATION = 1000 * 60 * 60 * 6; // 6 heures

const GeoBlockGuard = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'blocked'>('loading');

  useEffect(() => {
    const checkGeo = async () => {
      // Vérifier le cache
      const cached = localStorage.getItem(GEO_CHECK_KEY);
      const expiry = localStorage.getItem(GEO_CHECK_EXPIRY_KEY);
      if (cached && expiry && Date.now() < parseInt(expiry)) {
        setStatus(cached === 'true' ? 'allowed' : 'blocked');
        return;
      }

      try {
        const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error('Geo API error');
        const data = await res.json();
        const countryCode: string = data.country_code || '';
        const isAllowed = ALLOWED_COUNTRY_CODES.includes(countryCode.toUpperCase());

        localStorage.setItem(GEO_CHECK_KEY, String(isAllowed));
        localStorage.setItem(GEO_CHECK_EXPIRY_KEY, String(Date.now() + CACHE_DURATION));

        setStatus(isAllowed ? 'allowed' : 'blocked');
      } catch {
        // En cas d'erreur réseau, on laisse passer
        setStatus('allowed');
      }
    };

    checkGeo();
  }, []);

  if (status === 'loading') return null;

  if (status === 'blocked') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <Ban className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Service non disponible
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            GayConnect est actuellement disponible uniquement en <strong className="text-foreground">France métropolitaine</strong> et dans les <strong className="text-foreground">territoires d'outre-mer</strong>.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>France, Guadeloupe, Martinique, Réunion, Guyane, Mayotte…</span>
          </div>
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Si vous pensez qu'il s'agit d'une erreur, essayez de désactiver votre VPN ou contactez-nous.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default GeoBlockGuard;
