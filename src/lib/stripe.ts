import Stripe from "stripe";
import { getSql } from "@/lib/neon";
import { ensureAuthSchema } from "@/lib/authDb";

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY が未設定です");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export const APP_URL = process.env.APP_URL || "https://sumakouba-production-plan.vercel.app";
export const PRICES: Record<string, string | undefined> = {
  standard_monthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY,
  standard_yearly: process.env.STRIPE_PRICE_STANDARD_YEARLY,
};

/** company に対応する Stripe 顧客を取得（無ければ作成して保存） */
export async function getOrCreateCustomer(companyId: string): Promise<string> {
  await ensureAuthSchema();
  const sql = getSql();
  const rows = await sql`SELECT stripe_customer_id, name FROM companies WHERE id = ${companyId} LIMIT 1`;
  const existing = rows[0]?.stripe_customer_id as string | undefined;
  if (existing) return existing;
  const customer = await getStripe().customers.create({
    name: (rows[0]?.name as string | undefined) || undefined,
    metadata: { companyId },
  });
  await sql`UPDATE companies SET stripe_customer_id = ${customer.id} WHERE id = ${companyId}`;
  return customer.id;
}

interface ApplyOpts {
  companyId?: string | null;
  customerId?: string | null;
  isPro: boolean;
  productId?: string | null;
  expiresAt?: number | null; // unix seconds
}

/** Webhook から契約状態を会社へ反映（companyId か customerId で対象特定） */
export async function applySubscriptionToCompany(o: ApplyOpts): Promise<void> {
  await ensureAuthSchema();
  const sql = getSql();
  const expires = o.expiresAt ? new Date(o.expiresAt * 1000).toISOString() : null;
  if (o.companyId) {
    await sql`
      UPDATE companies SET
        is_pro = ${o.isPro},
        subscription_store = 'stripe',
        subscription_product_id = ${o.productId ?? null},
        subscription_expires_at = ${expires},
        subscription_updated_at = NOW(),
        stripe_customer_id = COALESCE(${o.customerId ?? null}, stripe_customer_id)
      WHERE id = ${o.companyId}`;
  } else if (o.customerId) {
    await sql`
      UPDATE companies SET
        is_pro = ${o.isPro},
        subscription_store = 'stripe',
        subscription_product_id = ${o.productId ?? null},
        subscription_expires_at = ${expires},
        subscription_updated_at = NOW()
      WHERE stripe_customer_id = ${o.customerId}`;
  }
}
