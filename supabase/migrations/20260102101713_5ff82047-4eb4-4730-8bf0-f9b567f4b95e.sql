-- Allow authenticated users to insert their own admin role (for first admin registration)
CREATE POLICY "Users can create their own admin role"
ON public.admin_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());