-- Organisation admins could never actually save their own organisation: the only
-- write policy on `organisations` was `organisations_platform_write`, which is
-- restricted to platform admins. The settings API passes its own `admin`
-- permission check and then silently matches zero rows under RLS.
--
-- Add an UPDATE policy scoped to the org's own admins. The platform-admin
-- FOR ALL policy stays as-is (policies are OR-ed), so platform admins keep
-- insert/delete rights that org admins do not get.
DROP POLICY IF EXISTS organisations_admin_update ON public.organisations;
CREATE POLICY organisations_admin_update ON public.organisations FOR UPDATE TO authenticated
  USING (public.has_organisation_permission(id, 'admin'))
  WITH CHECK (public.has_organisation_permission(id, 'admin'));

-- The bootstrap seeded a personal homingo.co.uk address as the support contact.
UPDATE public.organisations
   SET support_email = 'info@rightision.co.uk'
 WHERE support_email IS NULL OR support_email ILIKE '%homingo.co.uk';
