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

-- Körpergröße für den BMI
update public.profiles set height_cm = 182 where id = '00000000-0000-0000-0000-00000000a001';
update public.profiles set height_cm = 168 where id = '00000000-0000-0000-0000-00000000a002';
update public.profiles set height_cm = 188 where id = '00000000-0000-0000-0000-00000000a003';

-- Grundübungen (für alle Nutzer)
insert into public.exercises (name, workout_type) values
  ('Kurzhantel-Bankdrücken', 'push'),
  ('Bankdrücken', 'push'),
  ('Butterfly', 'push'),
  ('Incline Machine', 'push'),
  ('Klimmzüge', 'pull'),
  ('Latzug', 'pull'),
  ('Rudern', 'pull'),
  ('Beinpresse', 'leg'),
  ('Beinbeuger', 'leg'),
  ('Beinstrecker', 'leg'),
  ('Hackenschmidt-Maschine', 'leg'),
  ('Laufen', 'cardio'),
  ('Schnelles Gehen', 'cardio'),
  ('Schwimmen', 'cardio'),
  ('Radfahren', 'cardio');

-- Eine eigene Übung von Anna (nur für sie sichtbar)
insert into public.exercises (name, workout_type, owner_id) values
  ('Face Pulls', 'pull', '00000000-0000-0000-0000-00000000a002');

-- Trainingshistorie der letzten 8 Wochen + Plan für die nächsten 3 Wochen
-- Mo Push, Mi Pull, Fr Leg, Sa Cardio
do $$
declare
  usr record;
  d date;
  w_id bigint;
  week int;
  wtype text;
  ex record;
  s int;
  base numeric;
  cardio_ex text;
begin
  for usr in
    select * from (values
      ('00000000-0000-0000-0000-00000000a001'::uuid, 1.0, 84),
      ('00000000-0000-0000-0000-00000000a002'::uuid, 0.6, 64),
      ('00000000-0000-0000-0000-00000000a003'::uuid, 1.2, 92)
    ) as t(id, factor, start_weight)
  loop
    for d in
      select g::date from generate_series(current_date - 56, current_date + 21, interval '1 day') g
      where extract(isodow from g) in (1, 3, 5, 6)
    loop
      week := (d - (current_date - 56)) / 7;
      wtype := case extract(isodow from d) when 1 then 'push' when 3 then 'pull' when 5 then 'leg' else 'cardio' end;

      w_id := null;
      if d < current_date then
        insert into public.workouts (user_id, performed_on, workout_type, title, notes)
        values (
          usr.id, d, wtype,
          case wtype when 'push' then 'Push-Day' when 'pull' then 'Pull-Day' when 'leg' then 'Leg-Day' else 'Cardio' end,
          case when week % 3 = 0 and wtype <> 'cardio' then 'Gutes Training' else null end
        )
        returning id into w_id;

        if wtype = 'cardio' then
          cardio_ex := (array['Laufen', 'Radfahren', 'Schwimmen', 'Schnelles Gehen'])[1 + week % 4];
          insert into public.workout_cardio (workout_id, exercise_id, duration_min, distance_km)
          select w_id, e.id,
                 case cardio_ex when 'Radfahren' then 60 when 'Schwimmen' then 40 else 35 end + (random() * 15)::int,
                 round((case cardio_ex when 'Laufen' then 5 + random() * 3 when 'Radfahren' then 18 + random() * 12
                        when 'Schwimmen' then 1 + random() * 0.8 else 3 + random() * 1.5 end)::numeric, 1)
          from public.exercises e where e.name = cardio_ex and e.owner_id is null;
        else
          for ex in select * from public.exercises e where e.workout_type = wtype and e.owner_id is null loop
            base := case ex.name
              when 'Kurzhantel-Bankdrücken' then 26 when 'Bankdrücken' then 70 when 'Butterfly' then 45
              when 'Incline Machine' then 50 when 'Klimmzüge' then 0 when 'Latzug' then 55 when 'Rudern' then 60
              when 'Beinpresse' then 140 when 'Beinbeuger' then 40 when 'Beinstrecker' then 45
              else 80 end;
            for s in 1..4 loop
              insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
              values (w_id, ex.id, s,
                      least(12, case when ex.name = 'Klimmzüge' then 6 + week / 2 else 10 - (s - 1) / 2 end),
                      round((base * usr.factor + week * 1.25)::numeric / 1.25) * 1.25);
            end loop;
          end loop;
        end if;
      end if;

      -- Plan: letzte 2 Wochen (erledigt) + nächste 3 Wochen
      if d >= current_date - 14 then
        insert into public.planned_workouts (user_id, planned_on, workout_type, title, completed_workout_id)
        values (
          usr.id, d, wtype,
          case wtype when 'push' then 'Push-Day' when 'pull' then 'Pull-Day' when 'leg' then 'Leg-Day' else 'Cardio' end,
          w_id
        );
      end if;
    end loop;

    -- Damit die Startseite etwas zeigt: heute immer ein Training einplanen, falls keins geplant ist
    if not exists (select 1 from public.planned_workouts where user_id = usr.id and planned_on = current_date) then
      insert into public.planned_workouts (user_id, planned_on, workout_type, title, notes)
      values (usr.id, current_date, 'push', 'Push-Day', 'Fokus auf saubere Technik');
    end if;

    -- Körpergewicht: alle 3 Tage, leichter Abwärtstrend
    insert into public.body_weights (user_id, measured_on, weight_kg)
    select usr.id, g::date,
           round((usr.start_weight - (g::date - (current_date - 57)) * 0.04 + random() * 0.6)::numeric, 1)
    from generate_series(current_date - 57, current_date, interval '3 days') g;
  end loop;
end $$;
