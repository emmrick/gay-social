import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PREMIUM_PRICE_ID = "price_1SuruqBtwgw553xV8OTjKSyI";
const VIP_PRICE_ID = "price_1SvEVEBtwgw553xVgnsXKQ5G";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Parse request body for optional promo code and tier
    let promoCode: string | undefined;
    let tier: 'premium' | 'vip' = 'premium';
    try {
      const body = await req.json();
      promoCode = body?.promoCode;
      tier = body?.tier || 'premium';
    } catch {
      // No body or invalid JSON, continue without promo code
    }
    
    const priceId = tier === 'vip' ? VIP_PRICE_ID : PREMIUM_PRICE_ID;
    logStep("Selected tier", { tier, priceId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      logStep("No existing customer, will create one during checkout");
    }

    const origin = req.headers.get("origin") || "https://gay-connect.lovable.app";
    
    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/?subscription=cancelled`,
      billing_address_collection: "auto",
    };

    // Promo codes are only allowed for Premium tier, NOT for VIP
    if (tier === 'vip') {
      // VIP tier: no promo codes allowed at all
      logStep("VIP tier selected - promo codes disabled");
      // Don't allow any promotion codes for VIP
    } else if (promoCode) {
      // Premium tier with provided promo code
      logStep("Looking up promo code for Premium", { promoCode });
      const promoCodes = await stripe.promotionCodes.list({
        code: promoCode.toUpperCase(),
        active: true,
        limit: 1,
      });

      if (promoCodes.data.length > 0) {
        sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
        logStep("Promo code applied", { promoCodeId: promoCodes.data[0].id });
      } else {
        logStep("Promo code not found or inactive", { promoCode });
        // Still allow checkout without promo code for Premium
        sessionParams.allow_promotion_codes = true;
      }
    } else {
      // Premium tier without promo code - allow manual entry in Stripe checkout
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
