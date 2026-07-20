import Stripe from "stripe";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger.js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia" as any,
    })
  : null;

export function isStripeConfigured(): boolean {
  return Boolean(stripe);
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  returnUrl: string,
  priceId?: string,
): Promise<{ url: string; sessionId: string }> {
  if (!stripe) {
    throw new Error("Stripe is not configured on the backend.");
  }

  // 1. Check if user already has a stripe customer ID
  const { rows } = await pool.query(
    "SELECT stripe_customer_id FROM public.profiles WHERE id = $1",
    [userId],
  );

  let customerId = rows[0]?.stripe_customer_id;

  if (!customerId) {
    // Create stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    customerId = customer.id;

    // Update customer ID in DB
    await pool.query(
      "UPDATE public.profiles SET stripe_customer_id = $1 WHERE id = $2",
      [customerId, userId],
    );
  }

  // 2. Create the checkout session
  const finalPriceId = priceId || process.env.STRIPE_PRO_PRICE_ID || "price_dummy_pro";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: finalPriceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${returnUrl}?status=cancel`,
    metadata: { userId },
  });

  if (!session.url) {
    throw new Error("Failed to generate Checkout Session URL.");
  }

  return {
    url: session.url,
    sessionId: session.id,
  };
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<string> {
  if (!stripe) {
    throw new Error("Stripe is not configured on the backend.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function handleWebhook(
  rawBody: Buffer | string,
  signature: string,
): Promise<void> {
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret,
    );
  } catch (err: any) {
    logger.error({ err }, "Stripe signature verification failed");
    throw new Error(`Webhook Signature Verification Failed: ${err.message}`);
  }

  logger.info({ eventType: event.type }, "Processing Stripe Webhook Event");

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const custId = session.customer as string;
      const subId = session.subscription as string;

      if (userId) {
        await pool.query(
          `UPDATE public.profiles 
           SET stripe_customer_id = $1, 
               stripe_subscription_id = $2, 
               subscription_status = 'active', 
               plan = 'pro', 
               credits_limit = 1000 
           WHERE id = $3`,
          [custId, subId, userId],
        );
        logger.info({ userId, custId, subId }, "User subscription activated via Checkout");
      } else {
        logger.warn({ session }, "No userId found in completed checkout session metadata");
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const custId = sub.customer as string;
      const status = sub.status;
      const plan = (status === "active" || status === "trialing") ? "pro" : "free";
      const creditsLimit = plan === "pro" ? 1000 : 100;

      await pool.query(
        `UPDATE public.profiles 
         SET subscription_status = $1, 
             plan = $2, 
             credits_limit = $3,
             stripe_subscription_id = $4
         WHERE stripe_customer_id = $5`,
        [status, plan, creditsLimit, sub.id, custId],
      );
      logger.info({ custId, status, plan }, "Customer subscription updated");
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const custId = sub.customer as string;

      await pool.query(
        `UPDATE public.profiles 
         SET subscription_status = 'canceled', 
             plan = 'free', 
             credits_limit = 100 
         WHERE stripe_customer_id = $1`,
        [custId],
      );
      logger.info({ custId }, "Customer subscription deleted / reverted to free");
      break;
    }

    default:
      logger.debug({ eventType: event.type }, "Unhandled Stripe webhook event type");
  }
}
