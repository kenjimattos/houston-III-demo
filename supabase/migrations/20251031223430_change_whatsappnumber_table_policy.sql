-- Change WhatsAppNumber table policy to allow public read access

drop policy if exists "Enable read access for authenticated users" on public.whatsappnumber;
create policy "Enable read access for public" on public.whatsappnumber
    for select
    to public
    using (true);