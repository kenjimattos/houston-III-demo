-- Change clean_hospital table policy to allow public read access

drop policy if exists "Enable access to authenticated users" on public.clean_hospital;
create policy "Enable read access for public" on public.clean_hospital
    for select
    to public
    using (true);