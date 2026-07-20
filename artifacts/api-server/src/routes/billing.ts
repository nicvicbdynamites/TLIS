import { Router, type IRouter, type Request, type Response } from "express";
import {
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  isStripeConfigured,
} from "../services/stripe.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ── GET /api/billing/config ────────────────────────────────────────────────
router.get("/billing/config", (_req: Request, res: Response) => {
  res.json({
    configured: isStripeConfigured(),
    publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
  });
});

// ── POST /api/billing/checkout ─────────────────────────────────────────────
router.post("/billing/checkout", async (req: Request, res: Response) => {
  const { userId, email, returnUrl, priceId } = req.body as {
    userId?: string;
    email?: string;
    returnUrl?: string;
    priceId?: string;
  };

  if (!userId || !email || !returnUrl) {
    res.status(400).json({ error: "userId, email, and returnUrl are required" });
    return;
  }

  try {
    const session = await createCheckoutSession(userId, email, returnUrl, priceId);
    res.json(session);
  } catch (err: any) {
    logger.error({ err, userId }, "Failed to create checkout session");
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ── POST /api/billing/portal ───────────────────────────────────────────────
router.post("/billing/portal", async (req: Request, res: Response) => {
  const { customerId, returnUrl } = req.body as {
    customerId?: string;
    returnUrl?: string;
  };

  if (!customerId || !returnUrl) {
    res.status(400).json({ error: "customerId and returnUrl are required" });
    return;
  }

  try {
    const url = await createPortalSession(customerId, returnUrl);
    res.json({ url });
  } catch (err: any) {
    logger.error({ err, customerId }, "Failed to create portal session");
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ── POST /api/billing/webhook ──────────────────────────────────────────────
// This endpoint requires rawBody and the stripe-signature header.
router.post("/billing/webhook", async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string | undefined;

  if (!signature) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    res.status(400).json({ error: "Missing raw request body" });
    return;
  }

  try {
    await handleWebhook(rawBody, signature);
    res.json({ received: true });
  } catch (err: any) {
    logger.error({ err }, "Stripe webhook handling failed");
    res.status(400).json({ error: err.message || "Webhook error" });
  }
});

export default router;
