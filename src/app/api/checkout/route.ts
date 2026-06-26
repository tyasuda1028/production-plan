import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getStripe, getOrCreateCustomer, APP_URL, PRICES } from "@/lib/stripe";

export const runtime = "nodejs";

// POST /api/checkout — Standard プランの Stripe Checkout を作成し URL を返す
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const cid = session?.user?.companyId;
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let plan = "standard_monthly";
  try { const b = await req.json(); if (b?.plan) plan = String(b.plan); } catch { /* default */ }
  const price = PRICES[plan];
  if (!price) return NextResponse.json({ error: "このプランはオンライン決済の対象外です。お問い合わせください。" }, { status: 503 });

  try {
    const customer = await getOrCreateCustomer(cid);
    const s = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: cid,
      line_items: [{ price, quantity: 1 }],
      success_url: `${APP_URL}/?checkout=success`,
      cancel_url: `${APP_URL}/pricing?checkout=cancel`,
      metadata: { companyId: cid },
      subscription_data: { metadata: { companyId: cid } },
      allow_promotion_codes: true,
    });
    return NextResponse.json({ url: s.url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
