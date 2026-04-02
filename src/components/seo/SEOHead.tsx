import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
  keywords?: string;
}

const BASE_URL = 'https://gaysocial.fr';
const DEFAULT_OG_IMAGE = 'https://lovable.dev/opengraph-image-p98pqg.png';
const DEFAULT_KEYWORDS = 'site gay, rencontre gay, sexe gay, plan cul gay, chat gay, tchat gay, plan gay, drague gay, annonce gay, homme gay, gay france, rencontre homosexuel, plan sexe gay, hookup gay, sexfriend gay, homme cherche homme, gay paris, gay lyon, gay marseille, gay toulouse, gay bordeaux, gay nantes, gay lille, gay strasbourg, gay montpellier, gay nice, rencontre gay gratuit, tchat gay gratuit, plan cul gay ce soir, plan cul gay gratuit, site homo, site homosexuel, rencontre gay proximité, rencontre gay près de moi, appli gay, application rencontre gay, grindr alternative, site comme grindr, gay social, gaysocial, plan discret gay, rencontre locale gay, mec cherche mec, bi curieux, bisexuel, lgbt france, communauté lgbt, gay friendly, gay dom tom, gay guadeloupe, gay martinique, gay réunion';

const SEOHead = ({
  title = 'Gay Social - Site de Rencontre Gay, Sexe Gay & Tchat Gay France',
  description = 'Gay Social : le site gay n°1 pour les rencontres et le sexe entre hommes en France. Tchat gay gratuit, plan cul gay par département, échanges de photos et vidéos. Communauté gay vérifiée. +18 ans.',
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noindex = false,
  jsonLd,
  keywords = DEFAULT_KEYWORDS,
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
    setMeta('name', 'keywords', keywords);
    setMeta('name', 'rating', 'adult');
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
    setMeta('property', 'og:site_name', 'Gay Social');
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
  }, [title, description, canonical, ogImage, ogType, noindex, jsonLd, keywords]);

  return null;
};

export default SEOHead;

// Pre-built JSON-LD schemas
export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Gay Social',
  alternateName: ['GaySocial', 'Gay Social France'],
  url: BASE_URL,
  description: 'Site de rencontre gay et sexe entre hommes en France. Tchat gay gratuit, plan cul gay local, échanges de photos et vidéos entre mecs. Communauté gay vérifiée. +18 ans.',
  inLanguage: 'fr-FR',
  keywords: 'site gay, rencontre gay, sexe gay, plan cul gay, chat gay, tchat gay, plan gay, site de rencontre gay, gay france, communauté gay, annonce gay, homme gay, drague gay, hookup gay, plan sexe gay, homme cherche homme, sexfriend gay, gay paris, gay lyon, gay marseille, gay toulouse, gay bordeaux, gay nantes, gay lille, gay strasbourg, gay montpellier, gay nice, rencontre gay gratuit, tchat gay gratuit, plan cul gay ce soir, appli gay, application rencontre gay, grindr alternative, gay social, plan discret gay, mec cherche mec, bi curieux, lgbt france, gay dom tom',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${BASE_URL}/auth`,
    'query-input': 'required name=search_term_string',
  },
  audience: {
    '@type': 'Audience',
    audienceType: 'Adults only',
    suggestedMinAge: 18,
  },
};

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Gay Social',
  url: BASE_URL,
  logo: `${BASE_URL}/pwa-512x512.png`,
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    availableLanguage: 'French',
  },
};

export const faqPageJsonLd = (faqs: { question: string; answer: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(faq => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
});
