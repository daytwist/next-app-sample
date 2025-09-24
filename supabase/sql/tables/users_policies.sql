-- RLS policies for public.users
-- Goal: DB は Next.js サーバー（service_role）からのみアクセス。クライアントは常に拒否。

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 明示 deny（RLS ON かつポリシー無しでも拒否されるが、事故を防ぐために明示）
DROP POLICY IF EXISTS "deny anon all" ON public.users;
CREATE POLICY "deny anon all" ON public.users
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny authenticated all" ON public.users;
CREATE POLICY "deny authenticated all" ON public.users
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- 備考: service_role は RLS をバイパスするため、Next.js サーバーの service key 経由のアクセスのみ許可される構成になる。
