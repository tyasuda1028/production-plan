-- ============================================================
-- 生産計画システム マルチテナント化マイグレーション
-- Supabase ダッシュボード > SQL エディタ で実行してください
-- ============================================================

-- 1. user_id カラムを追加（すでにある場合はスキップ）
ALTER TABLE app_state
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. 旧プライマリキー（id のみ）を削除
ALTER TABLE app_state
  DROP CONSTRAINT IF EXISTS app_state_pkey;

-- 3. 複合プライマリキー（id + user_id）に変更
ALTER TABLE app_state
  ADD PRIMARY KEY (id, user_id);

-- 4. Row Level Security を有効化
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- 5. 既存ポリシーがあれば削除
DROP POLICY IF EXISTS "tenant_isolation" ON app_state;

-- 6. テナント分離ポリシーを作成
--    自分の user_id の行しか読み書きできない
CREATE POLICY "tenant_isolation" ON app_state
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK(auth.uid() = user_id);

-- ============================================================
-- Supabase ダッシュボードでの追加設定（SQL 不要）
-- ============================================================
-- 1. Authentication > Providers > Email を有効化
-- 2. Authentication > Settings > "Enable email confirmations" を ON
-- 3. Authentication > Settings > "Disable signup" を ON
--    （招待制にするため一般ユーザーの自己登録を禁止）
-- 4. Authentication > URL Configuration >
--    Site URL に Vercel のドメインを設定
--    例: https://your-app.vercel.app
--
-- ユーザー追加方法（招待制）:
-- Authentication > Users > "Invite user" ボタン
-- → 企業担当者のメールアドレスを入力 → 招待メールが送信される
-- → 担当者がリンクをクリックしてパスワードを設定
-- ============================================================
