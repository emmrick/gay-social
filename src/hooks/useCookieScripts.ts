import { useEffect } from 'react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

/**
 * Dynamically loads Google Analytics and AdSense scripts
 * ONLY after user consent, as required by RGPD/ePrivacy.
 */
export const useCookieScripts = () => {
  const { preferences, hasConsented } = useCookieConsent();

  // Google Analytics - only if analytics consent
  useEffect(() => {
    if (!hasConsented || !preferences.analytics) return;
    
    // Check if already loaded
    if (document.getElementById('gtag-script')) return;

    const script = document.createElement('script');
    script.id = 'gtag-script';
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=AW-18000558154';
    document.head.appendChild(script);

    script.onload = () => {
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: any[]) { window.dataLayer.push(args); }
      gtag('js', new Date());
      gtag('config', 'AW-18000558154');
      gtag('config', 'G-DV8DPVDGN4');
      (window as any).gtag = gtag;
    };
  }, [hasConsented, preferences.analytics]);

  // Google AdSense - only if advertising consent
  useEffect(() => {
    if (!hasConsented || !preferences.advertising) return;
    
    if (document.getElementById('adsense-script')) return;

    const script = document.createElement('script');
    script.id = 'adsense-script';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1035921685990394';
    document.head.appendChild(script);
  }, [hasConsented, preferences.advertising]);
};

// Type augmentation for gtag
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
