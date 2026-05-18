import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SEOHead from '@/components/seo/SEOHead';
import AdvertiserDashboard from '@/components/advertise/AdvertiserDashboard';
import TopupDialog from '@/components/advertise/TopupDialog';
import EditAdDialog from '@/components/advertise/EditAdDialog';
import AdvertiseLanding from '@/components/advertise/AdvertiseLanding';
import SubmittedConfirmation from '@/components/advertise/SubmittedConfirmation';
import type { AdvertiseForm } from '@/components/advertise/AdSubmitForm';

const Advertise = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dashboardEmail, setDashboardEmail] = useState('');
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState(10);
  const [topupLoading, setTopupLoading] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [adImageUrls, setAdImageUrls] = useState<string[]>([]);
  const [lastSubmittedEmail, setLastSubmittedEmail] = useState<string | null>(null);
  const [magicLoading, setMagicLoading] = useState(false);

  // Capture PayPal return + magic-link consume
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const depositId = params.get('ad_deposit');
    const token = params.get('token');
    const magic = params.get('magic');

    if (depositId && token) {
      captureAdPayment(depositId, token);
      window.history.replaceState({}, '', '/advertise');
    }

    if (magic) {
      (async () => {
        const { data, error } = await supabase.rpc('consume_advertiser_magic_link', { _token: magic });
        if (error || !data) {
          toast.error('Lien invalide ou expiré. Demandez un nouveau lien.');
        } else {
          setActiveEmail(String(data).toLowerCase());
          toast.success('Connexion réussie ✨');
        }
        window.history.replaceState({}, '', '/advertise');
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captureAdPayment = async (depositId: string, orderId: string) => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/capture-ad-paypal-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ deposit_id: depositId, order_id: orderId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Paiement reçu ! ${(data.amount_cents / 100).toFixed(2)}€ ajoutés à votre portefeuille.`);
        queryClient.invalidateQueries({ queryKey: ['advertiser-wallet'] });
        queryClient.invalidateQueries({ queryKey: ['advertiser-deposits'] });
      } else if (data.already_captured) {
        toast.info('Ce paiement a déjà été traité.');
      } else {
        toast.error(data.error || 'Erreur de paiement');
      }
    } catch {
      toast.error('Erreur lors de la capture du paiement');
    }
  };

  // Dashboard data
  const { data: wallet } = useQuery({
    queryKey: ['advertiser-wallet', activeEmail],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_advertiser_wallet', { _email: activeEmail });
      return data as any;
    },
    enabled: !!activeEmail,
  });

  const { data: campaigns } = useQuery({
    queryKey: ['advertiser-campaigns', activeEmail],
    queryFn: async () => {
      const { data } = await supabase.from('ads')
        .select('*').eq('advertiser_email', activeEmail!).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!activeEmail,
  });

  const { data: deposits } = useQuery({
    queryKey: ['advertiser-deposits', wallet?.id],
    queryFn: async () => {
      const { data } = await supabase.from('advertiser_deposits' as any)
        .select('*').eq('wallet_id', wallet.id).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!wallet?.id,
  });

  const handleDashboardAccess = async () => {
    const email = dashboardEmail.trim().toLowerCase();
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      toast.error('Veuillez entrer un email valide');
      return;
    }
    setMagicLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('advertiser-magic-link-send', {
        body: { email, returnUrl: window.location.origin + '/advertise' },
      });
      if (error || (data as any)?.error) {
        const code = (data as any)?.error || error?.message;
        if (code === 'rate_limited') toast.error('Trop de demandes. Réessayez dans 1h.');
        else toast.error("Impossible d'envoyer le lien. Vérifiez votre email.");
      } else {
        toast.success('📧 Lien de connexion envoyé ! Vérifiez votre boîte mail.');
        setDashboardEmail('');
      }
    } catch {
      toast.error('Erreur réseau, réessayez.');
    } finally {
      setMagicLoading(false);
    }
  };

  const handleTopup = async () => {
    if (!activeEmail || topupAmount < 5) return;
    setTopupLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/create-ad-paypal-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ advertiser_email: activeEmail, amount_euros: topupAmount, return_url: window.location.origin + '/advertise' }),
      });
      const data = await res.json();
      if (data.approve_url) {
        window.location.href = data.approve_url;
      } else {
        toast.error(data.error || 'Erreur PayPal');
      }
    } catch {
      toast.error('Erreur de connexion PayPal');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleUpdateAd = async (adId: string, updates: Record<string, any>) => {
    const contentChanged =
      updates.title ||
      updates.description !== undefined ||
      updates.image_url !== undefined ||
      updates.image_urls !== undefined;
    if (contentChanged) {
      updates.status = 'pending';
      updates.is_active = false;
    }
    const { error } = await supabase.from('ads').update(updates).eq('id', adId);
    if (error) { toast.error('Erreur de mise à jour'); return; }
    toast.success(contentChanged ? 'Annonce modifiée — en attente de vérification' : 'Annonce mise à jour');
    queryClient.invalidateQueries({ queryKey: ['advertiser-campaigns'] });
    setEditingAd(null);
  };

  const onSubmit = async (values: AdvertiseForm) => {
    setLoading(true);
    try {
      const postalCodes = values.geo_postal_codes
        ? values.geo_postal_codes.split(',').map((c) => c.trim()).filter(Boolean)
        : [];

      for (const placement of values.placements) {
        const { error } = await supabase.from('ads').insert({
          advertiser_name: values.advertiser_name,
          advertiser_email: values.advertiser_email,
          title: values.title,
          description: values.description || null,
          image_url: adImageUrls[0] || null,
          image_urls: adImageUrls,
          link_url: values.link_url || null,
          placement,
          budget_cents: values.budget_cents,
          status: 'pending',
          is_active: false,
          geo_targeting: values.geo_targeting,
          geo_postal_codes: postalCodes,
          starts_at: values.starts_at ? new Date(values.starts_at).toISOString() : null,
          ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
          max_impressions: values.max_impressions && values.max_impressions > 0 ? values.max_impressions : null,
          max_clicks: values.max_clicks && values.max_clicks > 0 ? values.max_clicks : null,
        } as any);
        if (error) throw error;
      }
      setLastSubmittedEmail(values.advertiser_email);
      setSubmitted(true);
      setAdImageUrls([]);
      toast.success('Demande envoyée avec succès !');
    } catch {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SubmittedConfirmation
        onSubmitAnother={() => setSubmitted(false)}
        onOpenDashboard={() => {
          if (lastSubmittedEmail) setActiveEmail(lastSubmittedEmail.toLowerCase());
          setSubmitted(false);
        }}
      />
    );
  }

  if (activeEmail) {
    return (
      <>
        <SEOHead title="Espace Annonceur — GaySocial" description="Gérez vos campagnes publicitaires sur GaySocial." />
        <AdvertiserDashboard
          email={activeEmail}
          wallet={wallet}
          campaigns={campaigns || []}
          deposits={deposits || []}
          onTopup={() => setShowTopup(true)}
          onEditAd={setEditingAd}
          onUpdateAd={handleUpdateAd}
          onLogout={() => setActiveEmail(null)}
          onNewCampaign={() => setActiveEmail(null)}
          onBack={() => setActiveEmail(null)}
        />

        <TopupDialog
          open={showTopup}
          onClose={() => setShowTopup(false)}
          topupAmount={topupAmount}
          setTopupAmount={setTopupAmount}
          onTopup={handleTopup}
          topupLoading={topupLoading}
          advertiserEmail={activeEmail || undefined}
        />
        {editingAd && <EditAdDialog ad={editingAd} onClose={() => setEditingAd(null)} onSave={handleUpdateAd} />}
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Annoncez sur GaySocial — Publicité partenaire"
        description="Faites découvrir votre marque à une communauté LGBTQ+ engagée. Formats publicitaires non intrusifs et modérés."
      />
      <AdvertiseLanding
        onBack={() => navigate(-1)}
        dashboardEmail={dashboardEmail}
        setDashboardEmail={setDashboardEmail}
        magicLoading={magicLoading}
        onDashboardAccess={handleDashboardAccess}
        loading={loading}
        adImageUrls={adImageUrls}
        setAdImageUrls={setAdImageUrls}
        onSubmit={onSubmit}
      />
    </>
  );
};

export default Advertise;
