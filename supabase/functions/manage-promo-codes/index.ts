import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-PROMO-CODES] ${step}${detailsStr}`);
};

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
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const { action, ...params } = await req.json();

    logStep("Action requested", { action, params, userId: user.id });

    // "validate" action is available to all authenticated users
    // Other actions require admin role
    if (action !== "validate") {
      const { data: isAdmin } = await supabaseClient.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });
      
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin access required");
      }
      logStep("Admin verified", { userId: user.id });
    }

    let result;

    switch (action) {
      case "create": {
        // Create a coupon first
        const couponParams: Stripe.CouponCreateParams = {
          name: params.name,
          duration: params.duration || "once", // once, repeating, forever
        };

        if (params.duration === "repeating" && params.durationInMonths) {
          couponParams.duration_in_months = params.durationInMonths;
        }

        // Either percent_off or amount_off
        if (params.percentOff) {
          couponParams.percent_off = params.percentOff;
        } else if (params.amountOff) {
          couponParams.amount_off = params.amountOff;
          couponParams.currency = "eur";
        }

        // For free trial (30 days free = 100% off first month)
        if (params.freeTrial) {
          couponParams.percent_off = 100;
          couponParams.duration = "repeating";
          couponParams.duration_in_months = 1;
        }

        const coupon = await stripe.coupons.create(couponParams);
        logStep("Coupon created", { couponId: coupon.id });

        // Create a promotion code for this coupon
        const promoCodeParams: Stripe.PromotionCodeCreateParams = {
          coupon: coupon.id,
          code: params.code.toUpperCase(),
          max_redemptions: params.maxRedemptions || undefined,
        };

        if (params.expiresAt) {
          promoCodeParams.expires_at = Math.floor(new Date(params.expiresAt).getTime() / 1000);
        }

        const promoCode = await stripe.promotionCodes.create(promoCodeParams);
        logStep("Promotion code created", { promoCodeId: promoCode.id, code: promoCode.code });

        result = {
          id: promoCode.id,
          code: promoCode.code,
          couponId: coupon.id,
          percentOff: coupon.percent_off,
          amountOff: coupon.amount_off,
          duration: coupon.duration,
          durationInMonths: coupon.duration_in_months,
          maxRedemptions: promoCode.max_redemptions,
          timesRedeemed: promoCode.times_redeemed,
          active: promoCode.active,
          expiresAt: promoCode.expires_at ? new Date(promoCode.expires_at * 1000).toISOString() : null,
        };
        break;
      }

      case "list": {
        const promoCodes = await stripe.promotionCodes.list({ 
          limit: 100,
          expand: ['data.coupon']
        });

        result = promoCodes.data.map((pc: Stripe.PromotionCode) => {
          const coupon = pc.coupon as Stripe.Coupon;
          return {
            id: pc.id,
            code: pc.code,
            couponId: coupon.id,
            percentOff: coupon.percent_off,
            amountOff: coupon.amount_off,
            duration: coupon.duration,
            durationInMonths: coupon.duration_in_months,
            maxRedemptions: pc.max_redemptions,
            timesRedeemed: pc.times_redeemed,
            active: pc.active,
            expiresAt: pc.expires_at ? new Date(pc.expires_at * 1000).toISOString() : null,
            createdAt: new Date(pc.created * 1000).toISOString(),
          };
        });
        break;
      }

      case "deactivate": {
        const updatedPromoCode = await stripe.promotionCodes.update(params.promoCodeId, {
          active: false,
        });
        logStep("Promotion code deactivated", { promoCodeId: params.promoCodeId });
        result = { success: true, id: updatedPromoCode.id };
        break;
      }

      case "validate": {
        // Check if promo code is being used for VIP tier (not allowed)
        const tier = params.tier || 'premium';
        if (tier === 'vip') {
          result = { valid: false, message: "Les codes promo ne sont pas applicables à l'offre VIP" };
          break;
        }

        // Validate a promo code without being admin
        const promoCodes = await stripe.promotionCodes.list({
          code: params.code.toUpperCase(),
          active: true,
          limit: 1,
          expand: ['data.coupon'], // Expand coupon data directly
        });

        if (promoCodes.data.length === 0) {
          result = { valid: false, message: "Code promo invalide ou expiré" };
        } else {
          const pc = promoCodes.data[0];
          // pc.coupon is already expanded as a Stripe.Coupon object
          const coupon = pc.coupon as Stripe.Coupon;
          
          // Check if max redemptions reached
          if (pc.max_redemptions && pc.times_redeemed >= pc.max_redemptions) {
            result = { valid: false, message: "Ce code promo a atteint sa limite d'utilisation" };
          } else if (pc.expires_at && pc.expires_at * 1000 < Date.now()) {
            result = { valid: false, message: "Ce code promo a expiré" };
          } else {
            result = {
              valid: true,
              promoCodeId: pc.id,
              code: pc.code,
              percentOff: coupon.percent_off,
              amountOff: coupon.amount_off,
              description: coupon.percent_off 
                ? `${coupon.percent_off}% de réduction`
                : coupon.amount_off 
                  ? `${(coupon.amount_off / 100).toFixed(2)}€ de réduction`
                  : "Réduction appliquée",
            };
          }
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
