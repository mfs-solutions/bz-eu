begin;

create table public."EU_COUNTRIES" (
  id uuid primary key default gen_random_uuid(),
  country_name text not null,
  short_code text not null,
  country_code text not null unique,
  currency_code text not null,
  dialing_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  iso2 text not null check (iso2 ~ '^[A-Z]{2}$'),
  exchange_rate numeric
);

insert into public."EU_COUNTRIES"
  (id, country_name, short_code, country_code, currency_code, dialing_code,
   is_active, created_at, updated_at, iso2, exchange_rate)
select id, country_name, short_code, country_code, currency_code, dialing_code,
       is_active, created_at, updated_at, iso2, exchange_rate
from public.countries
where iso2 in (
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE'
);

do $$
begin
  if (select count(distinct iso2) from public."EU_COUNTRIES") <> 27 then
    raise exception 'Cannot initialize EU_COUNTRIES: countries table is missing EU members';
  end if;
end $$;

alter table public."EU_COUNTRIES" enable row level security;
grant select on public."EU_COUNTRIES" to anon, authenticated;
grant all on public."EU_COUNTRIES" to service_role;
create policy "Read active EU countries" on public."EU_COUNTRIES"
  for select to anon, authenticated using (is_active);

commit;
