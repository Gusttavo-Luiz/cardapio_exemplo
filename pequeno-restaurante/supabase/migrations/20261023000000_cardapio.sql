-- Cardápio digital do Pequeno Restaurante: tabelas, permissões e armazenamento de imagens.
-- Execute no SQL Editor do Supabase (ou com `supabase db push`). O script pode ser rodado
-- uma única vez em um projeto novo.
--
-- Regras de acesso (Row Level Security):
--   * Qualquer visitante lê as configurações, as categorias, os pratos publicados
--     e as regiões de entrega ativas.
--   * Só usuários cadastrados na tabela public.admins podem criar, alterar ou excluir.
--   * Ninguém se cadastra como administrador pelo site: o proprietário inclui o próprio
--     usuário em public.admins pelo SQL Editor (veja o README).

-- ---------------------------------------------------------------------------
-- Administradores
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "admin vê o próprio cadastro" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- security definer: consulta admins sem depender das políticas da própria tabela.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Valida a lista de variações: [{ "id": "...", "label": "...", "priceCents": 1234 }, ...]
create function public.valid_options(options jsonb) returns boolean
language sql immutable set search_path = ''
as $$
  select jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) <= 12
    and not exists (
      select 1 from jsonb_array_elements(options) as o
      where jsonb_typeof(o) <> 'object'
        or jsonb_typeof(o -> 'id') <> 'string'
        or jsonb_typeof(o -> 'label') <> 'string'
        or jsonb_typeof(o -> 'priceCents') <> 'number'
        or length(o ->> 'id') not between 1 and 80
        or length(btrim(o ->> 'label')) not between 1 and 60
        or (o ->> 'priceCents')::numeric not between 0 and 1000000
        or (o ->> 'priceCents')::numeric <> trunc((o ->> 'priceCents')::numeric)
    );
$$;

-- Valida os horários: [{ "days": [1,2,3,4,5], "opens": "11:30", "closes": "14:00" }, ...]
create function public.valid_hours(hours jsonb) returns boolean
language sql immutable set search_path = ''
as $$
  select jsonb_typeof(hours) = 'array'
    and jsonb_array_length(hours) <= 14
    and not exists (
      select 1 from jsonb_array_elements(hours) as h
      where jsonb_typeof(h) <> 'object'
        or jsonb_typeof(h -> 'days') <> 'array'
        or jsonb_array_length(h -> 'days') not between 1 and 7
        or exists (
          select 1 from jsonb_array_elements(h -> 'days') as d
          where jsonb_typeof(d) <> 'number' or d::text !~ '^[0-6]$'
        )
        or coalesce(h ->> 'opens', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or coalesce(h ->> 'closes', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or (h ->> 'opens') >= (h ->> 'closes')
    );
$$;

-- Endereço de imagem: vazio ou https. Caminhos locais e data: URLs só existem no modo de demonstração.
create function public.valid_url(url text) returns boolean
language sql immutable set search_path = ''
as $$
  select url is null or (length(url) <= 1000 and url ~ '^https://[^[:space:]]+$');
$$;

-- ---------------------------------------------------------------------------
-- Categorias
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  position integer not null default 0 check (position between 0 and 100000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_updated_at before update on public.categories
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Pratos
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null check (length(btrim(name)) between 2 and 120),
  description text not null default '' check (length(description) <= 1000),
  price_cents integer not null check (price_cents between 0 and 1000000),
  options jsonb not null default '[]'::jsonb check (public.valid_options(options)),
  image_url text check (public.valid_url(image_url)),
  image_is_placeholder boolean not null default false,
  available boolean not null default true,
  published boolean not null default false,
  position integer not null default 0 check (position between 0 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_idx on public.products (category_id);

create trigger products_updated_at before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Regiões de entrega (opcional)
-- ---------------------------------------------------------------------------

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 80),
  fee_cents integer not null check (fee_cents between 0 and 1000000),
  active boolean not null default true,
  position integer not null default 0 check (position between 0 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger delivery_zones_updated_at before update on public.delivery_zones
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Configurações do restaurante (linha única, id = 1)
-- ---------------------------------------------------------------------------

create table public.settings (
  id smallint primary key default 1 check (id = 1),
  restaurant_name text not null check (length(btrim(restaurant_name)) between 2 and 80),
  tagline text not null default '' check (length(tagline) <= 120),
  hero_title text not null check (length(btrim(hero_title)) between 2 and 120),
  hero_subtitle text not null default '' check (length(hero_subtitle) <= 200),
  hero_image_url text check (public.valid_url(hero_image_url)),
  hero_image_is_placeholder boolean not null default false,

  address_line text not null default '' check (length(address_line) <= 160),
  district text not null default '' check (length(district) <= 80),
  city text not null default '' check (length(city) <= 80),
  state text not null default '' check (length(state) <= 2),
  postal_code text not null default '' check (postal_code ~ '^([0-9]{5}-?[0-9]{3})?$'),
  maps_url text not null default '' check (maps_url = '' or public.valid_url(maps_url)),
  address_confirmed boolean not null default false,

  phone text not null default '' check (length(phone) <= 30),
  phone_confirmed boolean not null default false,
  whatsapp text not null default '' check (length(whatsapp) <= 30),
  whatsapp_confirmed boolean not null default false,
  instagram text not null default '' check (length(instagram) <= 60),
  instagram_confirmed boolean not null default false,

  hours jsonb not null default '[]'::jsonb check (public.valid_hours(hours)),
  hours_note text not null default '' check (length(hours_note) <= 200),
  hours_confirmed boolean not null default false,

  dine_in boolean not null default false,
  pickup boolean not null default false,
  delivery boolean not null default false,
  services_confirmed boolean not null default false,

  payment_methods text[] not null default '{}' check (cardinality(payment_methods) <= 12),
  payments_confirmed boolean not null default false,

  delivery_fee_mode text not null default 'none' check (delivery_fee_mode in ('none', 'fixed', 'zones')),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents between 0 and 1000000),
  delivery_note text not null default '' check (length(delivery_note) <= 300),

  daily_product_id uuid references public.products (id) on delete set null,

  privacy_controller text not null default '' check (length(privacy_controller) <= 160),
  privacy_contact text not null default '' check (length(privacy_contact) <= 160),

  updated_at timestamptz not null default now(),

  -- O WhatsApp só pode ser marcado como confirmado com um número brasileiro completo.
  constraint whatsapp_confirmed_needs_number check (
    not whatsapp_confirmed
    or regexp_replace(whatsapp, '[^0-9]', '', 'g') ~ '^(55)?[0-9]{10,11}$'
  )
);

create trigger settings_updated_at before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.settings enable row level security;

-- Visitantes só leem. Quem não está logado não recebe nem o privilégio de escrita
-- (o Supabase concede tudo por padrão; aqui isso é retirado).
revoke insert, update, delete, truncate on public.categories, public.products, public.delivery_zones,
  public.settings, public.admins from anon;
revoke insert, update, delete, truncate on public.admins from authenticated;
revoke insert, delete, truncate on public.settings from authenticated;
grant select on public.categories, public.products, public.delivery_zones, public.settings to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.delivery_zones to authenticated;
grant update on public.settings to authenticated;
grant select on public.admins to authenticated;

-- Todas as categorias são legíveis: o site esconde as desativadas e os pratos delas.
create policy "leitura pública de categorias" on public.categories
  for select to anon, authenticated using (true);
create policy "admin cria categorias" on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin altera categorias" on public.categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin exclui categorias" on public.categories
  for delete to authenticated using ((select public.is_admin()));

create policy "leitura pública de pratos publicados" on public.products
  for select to anon, authenticated using (published or (select public.is_admin()));
create policy "admin cria pratos" on public.products
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin altera pratos" on public.products
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin exclui pratos" on public.products
  for delete to authenticated using ((select public.is_admin()));

create policy "leitura pública de regiões ativas" on public.delivery_zones
  for select to anon, authenticated using (active or (select public.is_admin()));
create policy "admin cria regiões" on public.delivery_zones
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin altera regiões" on public.delivery_zones
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin exclui regiões" on public.delivery_zones
  for delete to authenticated using ((select public.is_admin()));

create policy "leitura pública das configurações" on public.settings
  for select to anon, authenticated using (true);
create policy "admin altera configurações" on public.settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Imagens (Supabase Storage): leitura pública, envio só por administradores.
-- Até 5 MB por arquivo, somente JPEG, PNG ou WebP.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cardapio', 'cardapio', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "admin envia imagens do cardápio" on storage.objects
  for insert to authenticated with check (bucket_id = 'cardapio' and (select public.is_admin()));
create policy "admin altera imagens do cardápio" on storage.objects
  for update to authenticated using (bucket_id = 'cardapio' and (select public.is_admin()));
create policy "admin exclui imagens do cardápio" on storage.objects
  for delete to authenticated using (bucket_id = 'cardapio' and (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Dados iniciais: só as informações públicas de referência, todas como "a confirmar".
-- Nenhum prato é criado: o restaurante cadastra os próprios pratos pelo painel.
-- ---------------------------------------------------------------------------

insert into public.settings (
  id, restaurant_name, tagline, hero_title, hero_subtitle,
  address_line, district, city, state, postal_code, maps_url,
  phone, whatsapp, instagram, hours, dine_in, pickup, delivery
) values (
  1,
  'Pequeno Restaurante',
  'Comida caseira, feita com carinho',
  'Seu almoço com sabor de comida caseira',
  'Confira as opções do dia e monte seu pedido',
  'Rua Amazonas, 26', 'Bom Retiro', 'São Paulo', 'SP', '01121-030',
  'https://www.google.com/maps/search/?api=1&query=Rua+Amazonas+26+Bom+Retiro+Sao+Paulo',
  '(11) 3315-9015', '(11) 3315-9015', 'pequeno_restaurante',
  '[{"days": [1, 2, 3, 4, 5], "opens": "11:30", "closes": "14:00"}]'::jsonb,
  true, true, true
);

insert into public.categories (name, slug, position) values
  ('Pratos do dia', 'pratos-do-dia', 10),
  ('Pratos executivos', 'pratos-executivos', 20),
  ('Carnes e aves', 'carnes-e-aves', 30),
  ('Peixes', 'peixes', 40),
  ('Acompanhamentos', 'acompanhamentos', 50),
  ('Bebidas', 'bebidas', 60),
  ('Sobremesas', 'sobremesas', 70);
