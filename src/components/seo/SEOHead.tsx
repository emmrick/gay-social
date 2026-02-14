import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const BASE_URL = 'https://gay-connect.lovable.app';
const DEFAULT_OG_IMAGE = 'https://lovable.dev/opengraph-image-p98pqg.png';

const SEOHead = ({
  title = 'Gay Connect - Site de Rencontre Gay & Tchat Gay France',
  description = 'Gay Connect : le site gay n°1 pour les rencontres entre hommes en France. Tchat gay gratuit, plan gay par département, échanges de photos et vidéos. Communauté gay vérifiée. +18 ans.',
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noindex = false,
  jsonLd,
}: SEOHeadProps) => {
  useEffect(() => {
    // Title
    document.title = title;

    // Helper to set/create meta tags
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Standard meta
    setMeta('name', 'description', description);
    if (noindex) {
      setMeta('name', 'robots', 'noindex, nofollow');
    } else {
      const existing = document.querySelector('meta[name="robots"]');
      if (existing) existing.remove();
    }

    // Open Graph
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:site_name', 'Gay Connect');
    setMeta('property', 'og:locale', 'fr_FR');
    if (canonical) {
      setMeta('property', 'og:url', canonical);
    }

    // Twitter
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImage);

    // Canonical
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute('href', canonical);
    } else if (canonicalEl) {
      canonicalEl.remove();
    }

    // hreflang
    let hreflangEl = document.querySelector('link[hreflang="fr"]') as HTMLLinkElement | null;
    if (!hreflangEl) {
      hreflangEl = document.createElement('link');
      hreflangEl.setAttribute('rel', 'alternate');
      hreflangEl.setAttribute('hreflang', 'fr');
      document.head.appendChild(hreflangEl);
    }
    hreflangEl.setAttribute('href', canonical || BASE_URL);

    // JSON-LD
    const jsonLdId = 'seo-jsonld';
    let scriptEl = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = jsonLdId;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      // Cleanup JSON-LD on unmount
      const el = document.getElementById(jsonLdId);
      if (el) el.remove();
    };
  }, [title, description, canonical, ogImage, ogType, noindex, jsonLd]);

  return null;
};

export default SEOHead;

// Pre-built JSON-LD schemas
export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Gay Connect',
  url: BASE_URL,
  description: 'Site de rencontre gay et tchat gay gratuit en France. Rencontres entre hommes par département, plan gay local, échanges de photos et vidéos. Communauté gay vérifiée.',
  inLanguage: 'fr-FR',
  keywords: 'site gay, rencontre gay, chat gay, tchat gay, plan gay, site de rencontre gay, gay france, communauté gay, annonce gay, homme gay',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${BASE_URL}/auth`,
    'query-input': 'required name=search_term_string',
  },
};

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Gay Connect',
  url: BASE_URL,
  logo: `${BASE_URL}/pwa-512x512.png`,
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    availableLanguage: 'French',
  },
};
