-- Fitness-Tracking-App: Grundschema
-- Rollen: 'user' (sieht nur eigene Daten) und 'admin' (sieht alles).
-- Zugang nur mit Early Access (profiles.early_access = true).

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  early_access boolean not null default false,
  created_at timestamptz not null default now()
);

-- E-Mail-Adressen, die Early Access bekommen (vom Admin gepflegt).
create table public.early_access_invites (
  email text primary key check (email = lower(email)),
  note text,
  created_at timestamptz not null default now()
);

create table public.exercises (
  id bigint generated always as identity primary key,
  name text not null unique,
  muscle_group text,
  created_at timestamptz not null default now()
);

create table public.workouts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  performed_on date not null default current_date,
  title text not null,
  notes text,
  created_at timestamptz not null default now()
);
create index workouts_user_date_idx on public.workouts (user_id, performed_on desc);

create table public.workout_sets (
  id bigint generated always as identity primary key,
  workout_id bigint not null references public.workouts (id) on delete cascade,
  exercise_id bigint not null references public.exercises (id),
  set_number int not null check (set_number > 0),
  reps int not null check (reps > 0),
  weight_kg numeric(6, 2) not null default 0 check (weight_kg >= 0)
);
create index workout_sets_workout_idx on public.workout_sets (workout_id);

create table public.cardio_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  performed_on date not null default current_date,
  activity text not null,
  distance_km numeric(6, 2) check (distance_km >= 0),
  duration_min int not null check (duration_min > 0),
  notes text,
  created_at timestamptz not null default now()
);
create index cardio_user_date_idx on public.cardio_sessions (user_id, performed_on desc);

create table public.body_weights (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5, 2) not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  unique (user_id, measured_on)
);

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen (security definer, damit RLS auf profiles nicht rekursiv wird)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.has_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (early_access or role = 'admin')
  );
$$;

-- Neues Profil bei Registrierung; Early Access, wenn die E-Mail eingeladen ist.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, early_access)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    exists (select 1 from public.early_access_invites i where i.email = lower(new.email))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Wird ein Einladungs-Eintrag nachträglich angelegt, bekommt ein bestehendes Konto sofort Zugang.
create or replace function public.apply_invite_to_existing_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set early_access = true where lower(email) = new.email;
  return new;
end;
$$;

create trigger on_invite_created
  after insert on public.early_access_invites
  for each row execute function public.apply_invite_to_existing_profile();

-- Nur Admins dürfen Rolle und Early Access ändern.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.early_access is distinct from old.early_access
      or new.email is distinct from old.email)
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Nur Admins dürfen Rolle, E-Mail oder Early Access ändern';
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.early_access_invites enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.cardio_sessions enable row level security;
alter table public.body_weights enable row level security;

-- profiles
create policy "Eigenes Profil oder Admin lesen" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Eigenes Profil oder Admin ändern" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- early_access_invites: nur Admin
create policy "Admin verwaltet Einladungen" on public.early_access_invites
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- exercises: alle mit Zugang lesen, Admin verwaltet
create policy "Übungen lesen mit Zugang" on public.exercises
  for select to authenticated
  using ((select public.has_access()));
create policy "Admin verwaltet Übungen" on public.exercises
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Eigene Daten (mit Zugang) oder Admin
create policy "Workouts: eigene oder Admin" on public.workouts
  for all to authenticated
  using ((user_id = (select auth.uid()) and (select public.has_access())) or (select public.is_admin()))
  with check ((user_id = (select auth.uid()) and (select public.has_access())) or (select public.is_admin()));

create policy "Sätze: eigene oder Admin" on public.workout_sets
  for all to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_id
      and ((w.user_id = (select auth.uid()) and (select public.has_access())) or (select public.is_admin()))
  ))
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_id
      and ((w.user_id = (select auth.uid()) and (select public.has_access())) or (select public.is_admin()))
  ));

create policy "Cardio: eigene oder Admin" on public.cardio_sessions
  for all to authenticated
  using ((user_id = (select auth.uid()) and (select public.has_access())) or (select public.is_admin()))
  with check ((user_id = (select auth.uid()) and (select public.has_access())) or (select public.is_admin()));

create policy "Gewicht: eigene oder Admin" on public.body_weights
  for all to authenticated
  using ((user_id = (select auth.uid()) and (select public.has_access())) or (select public.is_admin()))
  with check ((user_id = (select auth.uid()) and (select public.has_access())) or (select public.is_admin()));

-- Funktionen nicht für anonyme Nutzer
revoke execute on function public.is_admin() from anon, public;
revoke execute on function public.has_access() from anon, public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_access() to authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.apply_invite_to_existing_profile() from anon, authenticated, public;
revoke execute on function public.protect_profile_fields() from anon, authenticated, public;
