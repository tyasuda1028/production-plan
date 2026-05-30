-- ============================================================
-- 生産計画システム：Clerk 認証 × Supabase（Third-Party Auth）マイグレーション
-- Supabase ダッシュボード > SQL Editor で実行してください
-- ============================================================
-- 認証は Clerk、データ保存は Supabase。
-- Clerk を Supabase の Third-Party Auth プロバイダとして登録すると、
-- リクエストの JWT に Clerk ユーザー ID（user_xxx 形式の文字列）が
-- "sub" クレームとして入る。RLS でそれを使ってテナント分離する。
-- ============================================================

-- 0. 旧ポリシー（Supabase Auth 用）があれば削除
DROP POLICY IF EXISTS "tenant_isolation" ON app_state;

-- 1. 旧い外部キー（auth.users 参照）と主キーを外す
ALTER TABLE app_state DROP CONSTRAINT IF EXISTS app_state_user_id_fkey;
ALTER TABLE app_state DROP CONSTRAINT IF EXISTS app_state_pkey;

-- 2. user_id を TEXT 型へ（Clerk ID は UUID ではなく user_xxx 形式の文字列）
ALTER TABLE app_state ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE app_state ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 3. NULL の旧行を削除（複合主キー (id, user_id) は NULL を許容しないため）
--    ※ 旧 Supabase UUID が入った行が残っている場合、Clerk ID とは一致せず
--      アクセスできなくなる。完全にクリーンにしたい場合は次行を有効化:
--      DELETE FROM app_state;   -- ← 全行削除（必要なときだけ）
DELETE FROM app_state WHERE user_id IS NULL;

-- 4. NOT NULL 化 ＋ 複合主キー (id, user_id)
ALTER TABLE app_state ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE app_state ADD PRIMARY KEY (id, user_id);

-- 5. Row Level Security を有効化
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- 6. Clerk 用テナント分離ポリシー
--    auth.jwt()->>'sub' = Clerk のユーザー ID。自分の行しか読み書きできない。
CREATE POLICY "tenant_isolation" ON app_state
  FOR ALL
  TO authenticated
  USING     ((SELECT auth.jwt()->>'sub') = user_id)
  WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

-- ============================================================
-- ダッシュボードでの追加設定（SQL 不要）
-- ============================================================
-- ◆ Supabase 側：Clerk を Third-Party Auth プロバイダとして登録
--   1. Clerk ダッシュボード > 左メニューの「Supabase」連携
--      （https://dashboard.clerk.com/setup/supabase）を開き、
--      表示される「Clerk ドメイン（Frontend API URL）」をコピー
--   2. Supabase ダッシュボード > Authentication > Sign In / Providers
--      （または Third-Party Auth）> Add provider > Clerk を選択し、
--      コピーした Clerk ドメインを貼り付けて保存
--
-- ◆ Clerk 側：招待制（自己登録の禁止）
--   1. Clerk ダッシュボード > User & Authentication > Restrictions
--      > 「Restricted」モードを ON（公開サインアップを禁止）
--      → <SignIn /> はサインアップ導線を自動的に非表示にする
--   2. ユーザー追加: Clerk ダッシュボード > Users > Create user
--      もしくは Invitations から招待メールを送信
--
-- ◆ アプリ側の環境変数（Vercel と .env.local の両方）
--   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_live_... （または pk_test_...）
--   ※ シークレットキーは本アプリ（クライアントのみ）では不要
-- ============================================================
