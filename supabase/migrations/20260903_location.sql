-- Coordenadas opcionais para pesquisa por proximidade.
-- Execute este ficheiro no Supabase SQL Editor antes de publicar esta versão.
alter table public.provider_profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.provider_profiles
  add constraint provider_profiles_latitude_range
  check (latitude is null or latitude between -90 and 90);

alter table public.provider_profiles
  add constraint provider_profiles_longitude_range
  check (longitude is null or longitude between -180 and 180);

create index if not exists provider_profiles_location_idx
  on public.provider_profiles (latitude, longitude)
  where latitude is not null and longitude is not null;

comment on column public.provider_profiles.latitude is 'Localização aproximada fornecida com consentimento; não é endereço exato.';
comment on column public.provider_profiles.longitude is 'Localização aproximada fornecida com consentimento; não é endereço exato.';

-- Privacidade: coordenadas são usadas apenas no servidor para ordenar proximidade.
-- O cliente vê apenas uma distância aproximada em quilómetros.

/*
  Se alguma instalação antiga já tiver criado uma destas constraints com outro nome,
  execute apenas os ADD COLUMN e o CREATE INDEX e ignore as constraints duplicadas.
*/

alter table public.provider_profiles enable row level security;

drop policy if exists "approved provider location is public" on public.provider_profiles;
create policy "approved provider location is public"
  on public.provider_profiles for select
  using (verification = 'approved');
EOF

# mostrar o ficheiro criado sem executar SQL
wc -l /home/ubuntu/BiscaTeMZ-Supabase-trabalho/supabase/migrations/20260903_location.sql
