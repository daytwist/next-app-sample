-- RLS policies for public.customers
-- Goal: DB は Next.js サーバー（service_role）からのみアクセス。クライアントは常に拒否。

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny anon all" ON public.customers;
CREATE POLICY "deny anon all" ON public.customers
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny authenticated all" ON public.customers;
CREATE POLICY "deny authenticated all" ON public.customers
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- 備考: service_role は RLS をバイパス。
