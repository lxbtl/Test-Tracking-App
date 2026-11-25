-- Testdaten NUR für die lokale Entwicklung.
-- Wird bei `supabase db reset` automatisch eingespielt.
-- Passwörter sind Platzhalter und dürfen nie in einer echten Umgebung verwendet werden.
--
--   admin@fitness.local  / Admin123!   (Admin, sieht alles)
--   anna@fitness.local   / Test1234!   (Early Access)
--   ben@fitness.local    / Test1234!   (Early Access)
--   carla@fitness.local  / Test1234!   (KEIN Early Access, landet auf der Warteseite)

create extension if not exists pgcrypto with schema extensions;

-- Einladungen (vor den Nutzern, damit der Trigger Early Access setzt)
insert into public.early_access_invites (email, note) values
  ('anna@fitness.local', 'Testnutzerin'),
  ('ben@fitness.local', 'Testnutzer');

-- Auth-Nutzer
with u (id, email, password, display_name) as (
  values
    ('00000000-0000-0000-0000-00000000a001'::uuid, 'admin@fitness.local', 'Admin123!', 'Admin'),
    ('00000000-0000-0000-0000-00000000a002'::uuid, 'anna@fitness.local', 'Test1234!', 'Anna'),
    ('00000000-0000-0000-0000-00000000a003'::uuid, 'ben@fitness.local', 'Test1234!', 'Ben'),
    ('00000000-0000-0000-0000-00000000a004'::uuid, 'carla@fitness.local', 'Test1234!', 'Carla')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt(password, extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', display_name),
  now() - interval '60 days', now(),
  '', '', '', '', '', '', '', ''
from u;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text,
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users
where email like '%@fitness.local';

-- Admin-Rolle setzen (auth.uid() ist hier null, daher greift der Schutz-Trigger nicht)
update public.profiles set role = 'admin', early_access = true
where id = '00000000-0000-0000-0000-00000000a001';

-- Übungskatalog
insert into public.exercises (name, muscle_group) values
  ('Bankdrücken', 'Brust'),
  ('Kniebeuge', 'Beine'),
  ('Kreuzheben', 'Rücken'),
  ('Schulterdrücken', 'Schultern'),
  ('Klimmzüge', 'Rücken'),
  ('Rudern mit Langhantel', 'Rücken'),
  ('Beinpresse', 'Beine'),
  ('Bizepscurls', 'Arme'),
  ('Trizepsdrücken', 'Arme'),
  ('Ausfallschritte', 'Beine');

-- Workouts der letzten 8 Wochen: Mo (Push), Mi (Beine), Fr (Pull)
do $$
declare
  usr record;
  d date;
  w_id bigint;
  week int;
  plan text[];
  ex_name text;
  s int;
  base numeric;
begin
  for usr in
    select * from (values
      ('00000000-0000-0000-0000-00000000a001'::uuid, 1.0),
      ('00000000-0000-0000-0000-00000000a002'::uuid, 0.6),
      ('00000000-0000-0000-0000-00000000a003'::uuid, 1.2)
    ) as t(id, factor)
  loop
    for d in
      select g::date from generate_series(current_date - 56, current_date - 1, interval '1 day') g
      where extract(isodow from g) in (1, 3, 5)
    loop
      week := (d - (current_date - 56)) / 7;
      plan := case extract(isodow from d)
        when 1 then array['Bankdrücken', 'Schulterdrücken', 'Trizepsdrücken']
        when 3 then array['Kniebeuge', 'Beinpresse', 'Ausfallschritte']
        else array['Kreuzheben', 'Klimmzüge', 'Rudern mit Langhantel', 'Bizepscurls']
      end;

      insert into public.workouts (user_id, performed_on, title, notes)
      values (
        usr.id, d,
        case extract(isodow from d) when 1 then 'Push-Tag' when 3 then 'Beintag' else 'Pull-Tag' end,
        case when week % 3 = 0 then 'Gutes Training' else null end
      )
      returning id into w_id;

      foreach ex_name in array plan loop
        base := case ex_name
          when 'Bankdrücken' then 70 when 'Schulterdrücken' then 40 when 'Trizepsdrücken' then 25
          when 'Kniebeuge' then 90 when 'Beinpresse' then 140 when 'Ausfallschritte' then 20
          when 'Kreuzheben' then 110 when 'Klimmzüge' then 0 when 'Rudern mit Langhantel' then 60
          else 14 end;
        for s in 1..3 loop
          insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
          select w_id, e.id, s,
                 case when ex_name = 'Klimmzüge' then 6 + week / 2 else 10 - s end,
                 round((base * usr.factor + week * 1.25)::numeric / 1.25) * 1.25
          from public.exercises e where e.name = ex_name;
        end loop;
      end loop;
    end loop;

    -- Cardio: Di und Sa
    insert into public.cardio_sessions (user_id, performed_on, activity, distance_km, duration_min)
    select usr.id, g::date,
           case when extract(isodow from g) = 2 then 'Laufen' else 'Radfahren' end,
           case when extract(isodow from g) = 2
                then round((4 + random() * 4)::numeric, 1)
                else round((15 + random() * 20)::numeric, 1) end,
           case when extract(isodow from g) = 2 then 25 + (random() * 20)::int else 45 + (random() * 40)::int end
    from generate_series(current_date - 56, current_date - 1, interval '1 day') g
    where extract(isodow from g) in (2, 6);

    -- Körpergewicht: alle 3 Tage, leichter Abwärtstrend
    insert into public.body_weights (user_id, measured_on, weight_kg)
    select usr.id, g::date,
           round(((case when usr.factor < 1 then 64 when usr.factor > 1 then 92 else 84 end)
                  -(g::date - (current_date - 57)) * 0.04 + random() * 0.6)::numeric, 1)
    from generate_series(current_date - 57, current_date, interval '3 days') g;
  end loop;
end $$;
