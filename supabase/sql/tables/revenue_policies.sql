-- RLS policies for public.revenue
-- Goal: サーバーのみアクセス。クライアントは拒否。

ALTER TABLE public.revenue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny anon all" ON public.revenue;
CREATE POLICY "deny anon all" ON public.revenue
  AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny authenticated all" ON public.revenue;
CREATE POLICY "deny authenticated all" ON public.revenue
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
