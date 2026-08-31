-- Esquema de la aplicación jMDA CIM-PIM (Supabase)
-- Ejecutar en el SQL Editor del dashboard de Supabase, o vía `supabase db push`.

-- Perfiles de usuario (vinculados a auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '',
  apellidos text not null default '',
  rol text not null default 'cliente' check (rol in ('admin', 'analista', 'cliente')),
  created_at timestamptz not null default now()
);

-- Proyectos
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text not null default '',
  estado text not null default 'Edición',
  user_id uuid not null references auth.users (id) on delete cascade,
  etapas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, apellidos, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'apellidos', ''),
    coalesce(new.raw_user_meta_data ->> 'rol', 'cliente')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.projects enable row level security;

-- Perfiles
drop policy if exists "perfil_select" on public.profiles;
create policy "perfil_select" on public.profiles for select using (auth.uid() = id);

drop policy if exists "perfil_insert" on public.profiles;
create policy "perfil_insert" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "perfil_update" on public.profiles;
create policy "perfil_update" on public.profiles for update using (auth.uid() = id);

-- Proyectos
drop policy if exists "proyecto_select" on public.projects;
create policy "proyecto_select" on public.projects for select using (auth.uid() = user_id);

drop policy if exists "proyecto_insert" on public.projects;
create policy "proyecto_insert" on public.projects for insert with check (auth.uid() = user_id);

drop policy if exists "proyecto_update" on public.projects;
create policy "proyecto_update" on public.projects for update using (auth.uid() = user_id);

drop policy if exists "proyecto_delete" on public.projects;
create policy "proyecto_delete" on public.projects for delete using (auth.uid() = user_id);
