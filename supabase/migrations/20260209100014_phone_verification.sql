-- Phone verification: store phone and opt-in to show on listing.
-- phone_verified already exists; sync from auth.users when using Supabase Phone Auth.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists show_phone_on_listing boolean not null default false;

comment on column public.profiles.phone is 'User phone (E.164); set by app or synced from auth after OTP verify';
comment on column public.profiles.show_phone_on_listing is 'If true and phone_verified, show phone on listing detail (seller opt-in)';
