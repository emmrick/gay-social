import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-REFERRALS] ${step}${detailsStr}`);
};

// 3 months credit in cents (based on Premium price 4.50€/month)
const THREE_MONTHS_CREDIT_CENTS = 1350;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { action, referralCode, userId } = await req.json();
    logStep("Request received", { action, referralCode, userId });

    switch (action) {
      case "get-code": {
        // Get or create referral code for the authenticated user
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("No authorization header");
        
        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
        if (userError) throw new Error(`Auth error: ${userError.message}`);
        
        const user = userData.user;
        if (!user) throw new Error("User not found");
        
        // Get or create referral code
        const { data: codeData, error: codeError } = await supabaseClient
          .rpc('get_or_create_referral_code', { _user_id: user.id });
        
        if (codeError) throw codeError;
        
        // Get referral stats
        const { data: statsData } = await supabaseClient
          .from('referral_codes')
          .select('total_referrals, successful_referrals')
          .eq('user_id', user.id)
          .single();
        
        // Get detailed referrals
        const { data: referrals } = await supabaseClient
          .from('referrals')
          .select(`
            id,
            referred_user_id,
            consecutive_payments,
            status,
            referrer_reward_applied,
            created_at
          `)
          .eq('referrer_user_id', user.id)
          .order('created_at', { ascending: false });
        
        // Get usernames for referred users
        const referralsWithProfiles = [];
        if (referrals) {
          for (const ref of referrals) {
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('username')
              .eq('user_id', ref.referred_user_id)
              .single();
            
            referralsWithProfiles.push({
              ...ref,
              username: profile?.username || 'Utilisateur'
            });
          }
        }
        
        return new Response(JSON.stringify({
          code: codeData,
          stats: statsData || { total_referrals: 0, successful_referrals: 0 },
          referrals: referralsWithProfiles
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "validate-code": {
        // Validate a referral code (used during signup)
        if (!referralCode) {
          return new Response(JSON.stringify({ valid: false, message: "Code requis" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        const { data: codeData } = await supabaseClient
          .from('referral_codes')
          .select('id, code, user_id')
          .eq('code', referralCode.toUpperCase())
          .single();
        
        if (!codeData) {
          return new Response(JSON.stringify({ valid: false, message: "Code de parrainage invalide" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        return new Response(JSON.stringify({ 
          valid: true, 
          message: "Code valide ! Après 3 mois d'abonnement consécutifs, vous recevrez 3 mois gratuits." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "register-referral": {
        // Register a referral (called after signup with referral code)
        // SECURITY: require authenticated caller and verify userId === caller.id
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          });
        }
        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
        if (userError || !userData?.user) {
          return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          });
        }
        if (!referralCode || !userId) {
          return new Response(JSON.stringify({ success: false, message: "Données manquantes" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        if (userId !== userData.user.id) {
          return new Response(JSON.stringify({ success: false, message: "Forbidden" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          });
        }

        const { data: result, error } = await supabaseClient
          .rpc('register_referral', {
            _referred_user_id: userId,
            _referral_code: referralCode.toUpperCase()
          });

        if (error) {
          logStep("Error registering referral", { error });
          return new Response(JSON.stringify({ success: false, message: "Erreur lors de l'enregistrement" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        logStep("Referral registered", { result });
        return new Response(JSON.stringify({ success: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "check-my-referral": {
        // Check if the current user was referred and their promotion status
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("No authorization header");
        
        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
        if (userError) throw new Error(`Auth error: ${userError.message}`);
        
        const user = userData.user;
        if (!user) throw new Error("User not found");
        
        const { data: referral } = await supabaseClient
          .from('referrals')
          .select('*')
          .eq('referred_user_id', user.id)
          .single();
        
        if (!referral) {
          return new Response(JSON.stringify({ isReferred: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        // Get referrer username
        const { data: referrerProfile } = await supabaseClient
          .from('profiles')
          .select('username')
          .eq('user_id', referral.referrer_user_id)
          .single();
        
        return new Response(JSON.stringify({
          isReferred: true,
          referrerUsername: referrerProfile?.username || 'Un membre',
          consecutivePayments: referral.consecutive_payments,
          rewardApplied: referral.referred_reward_applied,
          status: referral.status
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "process-payment": {
        // Called from webhook when a payment is successful.
        // SECURITY: lock to internal service-role callers (e.g. Stripe webhook
        // edge function or DB trigger). External clients must not invoke this.
        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        if (!token || !serviceKey || token !== serviceKey) {
          return new Response(JSON.stringify({ processed: false, error: "Forbidden" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          });
        }
        const requestBody = await req.json();
        const paymentEmail = requestBody.email;
        if (!paymentEmail) throw new Error("Email required");
        
        // Look up user by email from profiles table joined with auth
        // We limit the search to avoid full user enumeration
        const { data: usersData } = await supabaseClient.auth.admin.listUsers({
          page: 1,
          perPage: 100, // Limit to prevent full enumeration
        });
        
        // Find matching user by email
        const matchingUser = usersData.users.find(
          (u: any) => u.email?.toLowerCase() === paymentEmail.toLowerCase()
        );
        
        if (!matchingUser) {
          logStep("User not found for payment processing", { email: paymentEmail });
          return new Response(JSON.stringify({ processed: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        const foundUserId = matchingUser.id;
        
        // Check if user is referred
        const { data: referral } = await supabaseClient
          .from('referrals')
          .select('*')
          .eq('referred_user_id', foundUserId)
          .single();
        
        if (!referral) {
          logStep("User not referred", { userId: foundUserId });
          return new Response(JSON.stringify({ processed: false, reason: "not_referred" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        const newPaymentCount = referral.consecutive_payments + 1;
        logStep("Incrementing payment count", { userId: foundUserId, newCount: newPaymentCount });
        
        // Update referral
        await supabaseClient
          .from('referrals')
          .update({
            consecutive_payments: newPaymentCount,
            last_payment_at: new Date().toISOString(),
            status: newPaymentCount >= 3 ? 'completed' : 'active'
          })
          .eq('id', referral.id);
        
        // Check if we should apply rewards (after 3 payments)
        if (newPaymentCount === 3 && !referral.referred_reward_applied) {
          await applyReferralRewards(supabaseClient, referral);
        }
        
        return new Response(JSON.stringify({ 
          processed: true, 
          consecutivePayments: newPaymentCount,
          rewardApplied: newPaymentCount >= 3
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function applyReferralRewards(supabaseClient: any, referral: any) {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    logStep("ERROR: STRIPE_SECRET_KEY not set");
    return;
  }
  
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  
  // Apply credit to referred user
  await applyStripeCredit(supabaseClient, stripe, referral.referred_user_id, "Promotion parrainage - 3 mois offerts (filleul)");
  
  // Mark referred reward as applied
  await supabaseClient
    .from('referrals')
    .update({
      referred_reward_applied: true,
      referred_reward_applied_at: new Date().toISOString()
    })
    .eq('id', referral.id);
  
  // Apply credit to referrer
  await applyStripeCredit(supabaseClient, stripe, referral.referrer_user_id, "Promotion parrainage - 3 mois offerts (parrain)");
  
  // Mark referrer reward as applied
  await supabaseClient
    .from('referrals')
    .update({
      referrer_reward_applied: true,
      referrer_reward_applied_at: new Date().toISOString()
    })
    .eq('id', referral.id);
  
  // Update successful referrals count
  await supabaseClient
    .from('referral_codes')
    .update({ successful_referrals: supabaseClient.sql`successful_referrals + 1` })
    .eq('id', referral.referral_code_id);
  
  // Send notifications
  await supabaseClient.from('notifications').insert([
    {
      user_id: referral.referred_user_id,
      type: 'referral_reward',
      title: '🎁 3 mois offerts !',
      message: 'Félicitations ! Vous avez complété 3 mois d\'abonnement. 3 mois gratuits ont été crédités sur votre compte !',
      is_read: false
    },
    {
      user_id: referral.referrer_user_id,
      type: 'referral_reward',
      title: '🎁 3 mois offerts !',
      message: 'Votre filleul a complété 3 mois d\'abonnement ! Vous recevez également 3 mois gratuits.',
      is_read: false
    }
  ]);
  
  logStep("Rewards applied successfully", { referralId: referral.id });
}

async function applyStripeCredit(supabaseClient: any, stripe: Stripe, userId: string, description: string) {
  try {
    // Get user by ID instead of listing all users
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    
    if (userError || !userData?.user?.email) {
      logStep("User email not found", { userId });
      return;
    }
    
    const userEmail = userData.user.email;
    
    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found", { email: userEmail });
      return;
    }
    
    const customerId = customers.data[0].id;
    
    // Add credit balance to customer
    await stripe.customers.createBalanceTransaction(customerId, {
      amount: -THREE_MONTHS_CREDIT_CENTS, // Negative = credit
      currency: 'eur',
      description: description
    });
    
    logStep("Stripe credit applied", { customerId, amount: THREE_MONTHS_CREDIT_CENTS, description });
  } catch (error) {
    logStep("Error applying Stripe credit", { userId, error: error instanceof Error ? error.message : error });
  }
}
