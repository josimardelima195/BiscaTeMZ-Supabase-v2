-- BiscaTeMZ: execute this entire file once in Supabase > SQL Editor.
create extension if not exists pgcrypto;
create type public.account_role as enum ('client','provider','admin');
create type public.review_status as enum ('pending','approved','rejected');
create type public.request_status as enum ('requested','accepted','declined','scheduled','completed','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text, photo_url text, role public.account_role not null default 'client',
  city text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.provider_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  category text not null, bio text not null, province text not null, district text not null,
  starting_price numeric(12,2) not null default 0, years_experience integer not null default 0,
  verification public.review_status not null default 'pending', certificate_count integer not null default 0,
  completed_services integer not null default 0, rating numeric(2,1) not null default 0,
  review_count integer not null default 0, available boolean not null default true, updated_at timestamptz not null default now()
);
create table public.provider_documents (
  id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('bi_front','bi_back','certificate','licence','nuit','criminal_record')),
  storage_path text not null unique, file_name text not null, status public.review_status not null default 'pending',
  reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now()
);
create table public.service_requests (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.profiles(id), provider_id uuid not null references public.profiles(id),
  service text not null, details text not null, preferred_at timestamptz, address_area text not null, status public.request_status not null default 'requested',
  accepted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.conversations (id uuid primary key default gen_random_uuid(), request_id uuid unique not null references public.service_requests(id) on delete cascade, created_at timestamptz not null default now());
create table public.conversation_members (conversation_id uuid references public.conversations(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade, primary key(conversation_id,user_id));
create table public.messages (id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade, sender_id uuid not null references public.profiles(id), body text not null check(char_length(body) between 1 and 2000), created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, title text not null, body text not null, href text, read_at timestamptz, created_at timestamptz not null default now());
create table public.reviews (id uuid primary key default gen_random_uuid(), request_id uuid unique not null references public.service_requests(id), client_id uuid not null references public.profiles(id), provider_id uuid not null references public.profiles(id), rating integer not null check(rating between 1 and 5), comment text, created_at timestamptz not null default now());
create table public.emergency_contacts (id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade, name text not null, phone text not null, created_at timestamptz not null default now());
create table public.sos_alerts (id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id), request_id uuid references public.service_requests(id), latitude numeric, longitude numeric, note text, created_at timestamptz not null default now());

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute procedure public.touch_updated_at();
create trigger provider_profiles_updated before update on public.provider_profiles for each row execute procedure public.touch_updated_at();
create trigger requests_updated before update on public.service_requests for each row execute procedure public.touch_updated_at();

alter table public.profiles enable row level security; alter table public.provider_profiles enable row level security; alter table public.provider_documents enable row level security; alter table public.service_requests enable row level security; alter table public.conversations enable row level security; alter table public.conversation_members enable row level security; alter table public.messages enable row level security; alter table public.notifications enable row level security; alter table public.reviews enable row level security; alter table public.emergency_contacts enable row level security; alter table public.sos_alerts enable row level security;
create policy "profiles own or admin" on public.profiles for select using (id=auth.uid() or public.is_admin() or exists(select 1 from public.provider_profiles pp where pp.id=profiles.id and pp.verification='approved')); create policy "profiles create own" on public.profiles for insert with check(id=auth.uid() and role='client'); create policy "profiles update own" on public.profiles for update using(id=auth.uid()) with check(id=auth.uid() and role=role);
create policy "approved providers public" on public.provider_profiles for select using(verification='approved' or id=auth.uid() or public.is_admin()); create policy "provider own profile" on public.provider_profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy "documents private" on public.provider_documents for select using(provider_id=auth.uid() or public.is_admin());
create policy "requests participants" on public.service_requests for select using(client_id=auth.uid() or provider_id=auth.uid() or public.is_admin());
create policy "conversation members" on public.conversations for select using(exists(select 1 from public.conversation_members m where m.conversation_id=id and m.user_id=auth.uid()));
create policy "members list" on public.conversation_members for select using(user_id=auth.uid() or exists(select 1 from public.conversation_members x where x.conversation_id=conversation_id and x.user_id=auth.uid()));
create policy "message members" on public.messages for select using(exists(select 1 from public.conversation_members m where m.conversation_id=messages.conversation_id and m.user_id=auth.uid()));
create policy "my notifications" on public.notifications for select using(user_id=auth.uid()); create policy "my contacts" on public.emergency_contacts for all using(owner_id=auth.uid()) with check(owner_id=auth.uid()); create policy "my sos" on public.sos_alerts for select using(owner_id=auth.uid() or public.is_admin());
create policy "public reviews" on public.reviews for select using(true);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('profile-photos','profile-photos',true,5242880,array['image/jpeg','image/png','image/webp']),('private-documents','private-documents',false,8388608,array['image/jpeg','image/png','application/pdf']) on conflict(id) do nothing;
-- Uploads happen only through the server with the secret key. No public document URL exists.
create policy "public profile photos" on storage.objects for select using(bucket_id='profile-photos');

-- AFTER creating your own Auth user, promote it once (replace UUID):
-- update public.profiles set role='admin' where id='SEU-UID-AQUI';
