import { Link } from 'react-router-dom';
import { FadeInWhenVisible } from './animations';
import { ChevronDown } from 'lucide-react';

const seoFaqs = [
  { question: 'Comment fonctionne Gay Social ?', answer: 'Gay Social est un site de rencontre gay gratuit qui permet aux hommes de se rencontrer par département. Créez votre profil, rejoignez le chat de votre région et échangez avec des hommes près de chez vous.' },
  { question: 'Gay Social est-il gratuit ?', answer: "Oui, l'inscription et l'accès au chat de groupe sont gratuits. Certaines fonctionnalités comme le boost de profil sont disponibles avec des crédits." },
  { question: 'Le site est-il sécurisé ?', answer: 'Oui, nous vérifions l\'identité des membres, détectons les captures d\'écran et modérons activement la plateforme. Vos données restent confidentielles.' },
  { question: 'Comment trouver un plan cul gay près de chez moi ?', answer: 'Rejoignez le chat de votre département pour rencontrer des hommes gay de votre région. Utilisez la fonction de proximité pour voir les membres les plus proches.' },
  { question: 'Peut-on envoyer des photos et vidéos ?', answer: 'Oui, Gay Social permet l\'envoi de photos et vidéos éphémères qui disparaissent après consultation, ainsi que des médias classiques dans les conversations privées.' },
  { question: 'Quelle est la différence avec Grindr ?', answer: 'Gay Social est un site français centré sur la communauté locale par département, avec des chats de groupe, la vérification d\'identité, et une protection anti-capture d\'écran unique.' },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: seoFaqs.map(faq => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
};

const SEOContentSection = () => (
  <>
    {/* Zero ads */}
    <div className="landing-section py-16 sm:py-20">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <FadeInWhenVisible>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-5 py-2 rounded-full text-sm font-bold mb-5">
            🚫 Zéro publicité. Pour toujours.
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Pas de pub, pas de bullshit
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Notre site est construit sur des bases solides et <span className="font-semibold text-foreground">sans aucune publicité</span>.
            La seule économie du site repose sur les <span className="font-semibold text-foreground">crédits</span>, rechargeables de plusieurs façons.
          </p>
          <p className="text-sm text-muted-foreground">
            Consultez la <Link to="/about" className="text-primary hover:underline font-semibold">FAQ dédiée</Link> pour comprendre les crédits.
          </p>
        </FadeInWhenVisible>
      </div>
    </div>

    {/* SEO Content */}
    <div className="relative z-10 bg-secondary/20 border-t border-border/30">
      <div className="container mx-auto px-4 py-16 sm:py-20 max-w-5xl">
        <FadeInWhenVisible className="text-center mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Le meilleur site de rencontre gay en France
          </h2>
        </FadeInWhenVisible>
        <div className="grid md:grid-cols-2 gap-8 text-sm text-muted-foreground leading-relaxed">
          <FadeInWhenVisible delay={0.1}>
            <div className="space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">Rencontres gay & sexe gay par département</h3>
              <p>
                Gay Social est le <strong>site de rencontre gay</strong> et de <strong>sexe entre hommes</strong> n°1 en France.
                Que tu cherches un <strong>plan cul gay</strong>, une <strong>rencontre gay sérieuse</strong> ou simplement
                un <strong>tchat gay gratuit</strong>, notre plateforme te connecte avec des milliers d'hommes dans les
                <strong> 101 départements français</strong>.
              </p>
              <p>
                Contrairement aux autres sites comme Grindr ou Scruff, Gay Social est 100% français et organisé
                par région. Trouve des <strong>mecs gay près de chez toi</strong> : <strong>gay Paris</strong>, <strong>gay Lyon</strong>,
                <strong> gay Marseille</strong>, <strong>gay Toulouse</strong>, <strong>gay Bordeaux</strong> et partout en France !
              </p>
            </div>
          </FadeInWhenVisible>
          <FadeInWhenVisible delay={0.2}>
            <div className="space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">Plan cul gay sécurisé & discret</h3>
              <p>
                Sur Gay Social, ta <strong>vie privée</strong> est notre priorité. Tous les profils sont
                <strong> vérifiés par pièce d'identité</strong>, les <strong>médias éphémères</strong> disparaissent après
                consultation, et notre technologie <strong>anti-capture d'écran</strong> protège tes photos et vidéos.
              </p>
              <p>
                Que tu sois <strong>gay actif</strong>, <strong>gay passif</strong> ou <strong>versatile</strong>,
                <strong> bear</strong>, <strong>twink</strong>, <strong>daddy</strong> ou <strong>muscle</strong>,
                tu trouveras des profils qui correspondent à tes envies. <strong>Inscription gratuite</strong> et immédiate !
              </p>
            </div>
          </FadeInWhenVisible>
        </div>
      </div>
    </div>

    {/* FAQ */}
    <div className="relative z-10 py-16 sm:py-20 border-t border-border/30">
      <div className="container mx-auto px-4 max-w-3xl">
        <FadeInWhenVisible className="text-center mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Questions fréquentes
          </h2>
        </FadeInWhenVisible>
        <div className="space-y-3">
          {seoFaqs.map((faq, i) => (
            <FadeInWhenVisible key={i} delay={i * 0.05}>
              <details className="group bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/20 transition-colors shadow-sm">
                <summary className="px-5 py-4 cursor-pointer font-medium text-foreground hover:text-primary transition-colors list-none flex items-center justify-between gap-4">
                  <span className="text-sm sm:text-base">{faq.question}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            </FadeInWhenVisible>
          ))}
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </div>
    </div>
  </>
);

export default SEOContentSection;
