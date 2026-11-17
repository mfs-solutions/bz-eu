begin;

do $$
declare
  eur_rate numeric;
begin
  select exchange_rate into eur_rate
  from public.countries
  where iso2 = 'FR' and currency_code = 'EUR';

  if eur_rate is null or eur_rate <= 0 then
    raise exception 'Cannot correct Bulgaria: source EUR exchange rate is unavailable';
  end if;

  update public."EU_COUNTRIES"
  set currency_code = 'EUR', exchange_rate = eur_rate, updated_at = timezone('utc', now())
  where iso2 = 'BG';

  if not found then
    raise exception 'Cannot correct Bulgaria: EU country record is missing';
  end if;
end $$;

commit;
