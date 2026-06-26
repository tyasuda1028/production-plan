import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getStripe, getOrCreateCustomer, APP_URL } from "@/lib/stripe";

export const runtime = "nodejs";

// POST /api/customer-portal — Stripe カスタマーポータル（解約・変更）の URL を返す
export async function POST() {
  const session = await getServerSession(authOptions);
  const cid = session?.user?.companyId;
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const customer = await getOrCreateCustomer(cid);
    const s = await getStripe().billingPortal.sessions.create({ customer, return_url: `${APP_URL}/` });
    return NextResponse.json({ url: s.url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
