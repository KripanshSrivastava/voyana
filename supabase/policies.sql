-- ---------------------------------------------------------------------------
-- Voyana RLS policy layer (idempotent — safe to re-run).
--
-- RLS is already ENABLED on every public table (Supabase default), so with no
-- policies the anon/authenticated roles are denied everything. The app itself
-- is UNAFFECTED: Prisma connects as the `postgres` role, which has BYPASSRLS.
-- These policies are a defense-in-depth backstop for any direct PostgREST /
-- supabase-js access using the public key, and the documented access model for
-- future client-side vendor features.
--
-- Model: only SELECT is granted. No INSERT/UPDATE/DELETE policies exist, so all
-- writes remain server-only (Prisma / service-role).
-- ---------------------------------------------------------------------------

-- Auth → app mapping helpers (security definer: read mapping tables under RLS).
create or replace function public.app_is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from "User" where "authId" = auth.uid()::text and role = 'ADMIN');
$$;

create or replace function public.app_agent_id() returns text
  language sql stable security definer set search_path = public as $$
  select a."id" from "Agent" a join "User" u on u."id" = a."userId"
  where u."authId" = auth.uid()::text;
$$;

create or replace function public.app_user_id() returns text
  language sql stable security definer set search_path = public as $$
  select "id" from "User" where "authId" = auth.uid()::text;
$$;

grant execute on function public.app_is_admin() to anon, authenticated;
grant execute on function public.app_agent_id() to anon, authenticated;
grant execute on function public.app_user_id() to anon, authenticated;

-- ---- Public marketing content (read-only, published only for parents) -------
drop policy if exists "read published" on "Destination";
create policy "read published" on "Destination" for select to anon, authenticated using (published = true);

drop policy if exists "read published" on "TourPackage";
create policy "read published" on "TourPackage" for select to anon, authenticated using (published = true);

do $$
declare t text;
begin
  foreach t in array array['PackageImage','PackageInclusion','PackageExclusion','PackageItinerary','PackageFAQ']
  loop
    execute format('drop policy if exists "read content" on %I', t);
    execute format('create policy "read content" on %I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- ---- Vendor-owned data (owner or admin) ------------------------------------
drop policy if exists "self or admin" on "User";
create policy "self or admin" on "User" for select to authenticated
  using ("authId" = auth.uid()::text or public.app_is_admin());

drop policy if exists "own or admin" on "Agent";
create policy "own or admin" on "Agent" for select to authenticated
  using (public.app_is_admin() or "userId" in (select "id" from "User" where "authId" = auth.uid()::text));

do $$
declare t text;
begin
  foreach t in array array['AgentWallet','WalletTransaction','LeadAssignment','LeadPayment','WalletTopup']
  loop
    execute format('drop policy if exists "own or admin" on %I', t);
    execute format('create policy "own or admin" on %I for select to authenticated using (public.app_is_admin() or "agentId" = public.app_agent_id())', t);
  end loop;
end $$;

-- Notifications: the owning user or an admin.
drop policy if exists "own or admin" on "Notification";
create policy "own or admin" on "Notification" for select to authenticated
  using (public.app_is_admin() or "userId" = public.app_user_id());

-- ---- Admin-only tables ------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['Lead','LeadNote','LeadStatusHistory','AuditLog','IntegrationLog','Campaign','SiteSetting','Media']
  loop
    execute format('drop policy if exists "admin only" on %I', t);
    execute format('create policy "admin only" on %I for select to authenticated using (public.app_is_admin())', t);
  end loop;
end $$;
