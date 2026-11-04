-- =====================================================================
-- RutaExpress · Reseñas en Supabase
-- Ejecutar UNA vez en: Supabase › SQL Editor › New query › pegar › Run
-- =====================================================================

-- 1) Tabla
create table if not exists public.resenas (
  id         uuid primary key,                        -- lo genera el celular (permite reintentos sin duplicar)
  parada_id  text not null check (parada_id ~ '^[a-z0-9-]{1,64}$'),
  autor      text not null default 'Anónimo' check (char_length(autor) between 1 and 40),
  texto      text not null check (char_length(btrim(texto)) between 3 and 500),
  fecha      timestamptz not null default now(),      -- cuándo lo escribió el usuario (puede ser offline)
  recibida   timestamptz not null default now(),      -- cuándo llegó al servidor
  reportes   integer not null default 0,
  oculta     boolean not null default false
);

create index if not exists resenas_parada_fecha on public.resenas (parada_id, fecha desc);

-- 2) Seguridad (Row Level Security): leer y publicar sí; editar y borrar no
alter table public.resenas enable row level security;

drop policy if exists "Leer reseñas visibles" on public.resenas;
create policy "Leer reseñas visibles" on public.resenas
  for select to anon, authenticated
  using (not oculta);

drop policy if exists "Publicar reseñas" on public.resenas;
create policy "Publicar reseñas" on public.resenas
  for insert to anon, authenticated
  with check (
    not oculta and reportes = 0
    and fecha <= now() + interval '5 minutes'
    and fecha >= now() - interval '30 days'          -- una reseña offline puede llegar días después
  );
-- (No hay políticas de UPDATE ni DELETE: nadie puede modificar ni borrar desde la app.)

-- Solo las columnas necesarias para anónimos
revoke all on public.resenas from anon, authenticated;
grant select (id, parada_id, autor, texto, fecha) on public.resenas to anon, authenticated;
grant insert (id, parada_id, autor, texto, fecha) on public.resenas to anon, authenticated;

-- 3) Antispam: máximo 8 comentarios por minuto en una misma parada
create or replace function public.antes_de_insertar_resena()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.resenas
      where parada_id = new.parada_id and recibida > now() - interval '1 minute') >= 8 then
    -- PT429 → la API responde HTTP 429 y la app reintenta más tarde
    raise exception 'Demasiados comentarios en esta parada, intenta en un minuto' using errcode = 'PT429';
  end if;
  new.texto    := btrim(new.texto);
  new.autor    := coalesce(nullif(btrim(new.autor), ''), 'Anónimo');
  new.recibida := now();
  new.reportes := 0;
  new.oculta   := false;
  return new;
end;
$$;

drop trigger if exists resenas_antes_insertar on public.resenas;
create trigger resenas_antes_insertar
  before insert on public.resenas
  for each row execute function public.antes_de_insertar_resena();

-- 4) Reportar: con 3 reportes la reseña se oculta sola
create or replace function public.reportar_resena(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.resenas
     set reportes = reportes + 1,
         oculta   = (reportes + 1) >= 3
   where id = p_id;
$$;
revoke all on function public.reportar_resena(uuid) from public;
grant execute on function public.reportar_resena(uuid) to anon, authenticated;

-- 5) Tiempo real: avisar a los celulares cuando llega una reseña nueva
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'resenas'
  ) then
    alter publication supabase_realtime add table public.resenas;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Moderación manual (ejecutar cuando haga falta, NO forma parte de la instalación):
--   select id, parada_id, autor, texto, reportes, oculta from resenas order by recibida desc;
--   update resenas set oculta = true  where id = '...';   -- ocultar
--   update resenas set oculta = false, reportes = 0 where id = '...';  -- restaurar
--   delete from resenas where id = '...';                -- borrar definitivamente
-- ---------------------------------------------------------------------
