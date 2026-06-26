import { getSql } from "@/lib/neon";
import { ensureAuthSchema } from "@/lib/authDb";

// 会社のエンタイトルメント。active = is_pro(契約済) または トライアル期限内(登録日+30日)。
export const TRIAL_DAYS = 30;

export interface Entitlement {
  active: boolean;
  isPro: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
}

export async function getCompanyEntitlement(companyId: string): Promise<Entitlement> {
  await ensureAuthSchema();
  const sql = getSql();
  const rows = await sql`SELECT is_pro, created_at FROM companies WHERE id = ${companyId} LIMIT 1`;
  const r = rows[0];
  if (!r) return { active: false, isPro: false, trialEndsAt: null, trialDaysLeft: null };
  const isPro = Boolean(r.is_pro);
  const createdAt = r.created_at ? new Date(r.created_at as string) : null;
  const trialEnd = createdAt ? new Date(createdAt.getTime() + TRIAL_DAYS * 86_400_000) : null;
  const now = Date.now();
  const trialActive = trialEnd ? trialEnd.getTime() > now : false;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now) / 86_400_000)) : null;
  return {
    active: isPro || trialActive,
    isPro,
    trialEndsAt: trialEnd ? trialEnd.toISOString() : null,
    trialDaysLeft,
  };
}
