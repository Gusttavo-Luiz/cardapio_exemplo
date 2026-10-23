-- Testes das permissões. Cada bloco falha com exceção se a regra não for respeitada.
\set ON_ERROR_STOP on

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', 'dono@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'outro@example.com');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000000a');

insert into public.products (category_id, name, price_cents, published)
select id, 'Prato publicado', 2500, true from public.categories where slug = 'pratos-do-dia';
insert into public.products (category_id, name, price_cents, published)
select id, 'Rascunho', 1000, false from public.categories where slug = 'pratos-do-dia';

create function pg_temp.expect_denied(sql text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'deveria ter sido recusado: %', sql;
exception when insufficient_privilege or check_violation then null;
end $$;

-- Visitante anônimo
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  if (select count(*) from public.products) <> 1 then raise exception 'anon deveria ver só o prato publicado'; end if;
  if (select count(*) from public.settings) <> 1 then raise exception 'anon deveria ler as configurações'; end if;
  if public.is_admin() then raise exception 'anon não é admin'; end if;
end $$;
select pg_temp.expect_denied($$insert into public.products (name, price_cents) values ('Invasão', 1)$$);
select pg_temp.expect_denied($$update public.products set price_cents = 1$$);
select pg_temp.expect_denied($$update public.settings set whatsapp = '11999999999'$$);
select pg_temp.expect_denied($$delete from public.products$$);
reset role;
do $$ begin
  if exists (select 1 from public.products where price_cents = 1) then raise exception 'anon alterou preço'; end if;
  if (select whatsapp from public.settings) <> '(11) 3315-9015' then raise exception 'anon alterou configurações'; end if;
  if (select count(*) from public.products) <> 2 then raise exception 'anon excluiu pratos'; end if;
end $$;

-- Usuário autenticado que não é administrador
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  if (select count(*) from public.products) <> 1 then raise exception 'não-admin não vê rascunhos'; end if;
  if public.is_admin() then raise exception 'usuário comum não é admin'; end if;
  if exists (select 1 from public.admins) then raise exception 'não-admin não vê a lista de admins'; end if;
end $$;
select pg_temp.expect_denied($$insert into public.products (name, price_cents) values ('Invasão', 1)$$);
select pg_temp.expect_denied($$insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000000b')$$);
select pg_temp.expect_denied($$insert into storage.objects (bucket_id, name) values ('cardapio', 'x.jpg')$$);
-- RLS: as alterações abaixo não afetam nenhuma linha
update public.products set price_cents = 1;
update public.settings set whatsapp = '11999999999';
delete from public.products;
reset role;
do $$ begin
  if exists (select 1 from public.products where price_cents = 1) then raise exception 'não-admin alterou preço'; end if;
  if (select whatsapp from public.settings) <> '(11) 3315-9015' then raise exception 'não-admin alterou configurações'; end if;
  if (select count(*) from public.products) <> 2 then raise exception 'não-admin excluiu pratos'; end if;
end $$;

-- Administrador
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  if not public.is_admin() then raise exception 'dono deveria ser admin'; end if;
  if (select count(*) from public.products) <> 2 then raise exception 'admin vê rascunhos'; end if;
end $$;
insert into public.products (name, price_cents, options, published)
values ('Com variações', 2000, '[{"id":"p","label":"P","priceCents":2000},{"id":"g","label":"G","priceCents":3500}]', true);
update public.products set price_cents = 2790 where name = 'Prato publicado';
update public.settings set whatsapp = '(11) 3315-9015', whatsapp_confirmed = true,
  daily_product_id = (select id from public.products where name = 'Prato publicado');
insert into public.delivery_zones (name, fee_cents) values ('Bom Retiro', 500);
insert into storage.objects (bucket_id, name) values ('cardapio', 'pratos/foto.webp');
select pg_temp.expect_denied($$insert into storage.objects (bucket_id, name) values ('outro', 'x.jpg')$$);

-- Restrições de dados (valem até para o admin)
select pg_temp.expect_denied($$insert into public.products (name, price_cents) values ('Negativo', -1)$$);
select pg_temp.expect_denied($$insert into public.products (name, price_cents) values ('X', 100)$$);
select pg_temp.expect_denied($$insert into public.products (name, price_cents, image_url) values ('Imagem', 100, 'javascript:alert(1)')$$);
select pg_temp.expect_denied($$insert into public.products (name, price_cents, options) values ('Opção ruim', 100, '[{"id":"a","label":"A","priceCents":-5}]')$$);
select pg_temp.expect_denied($$insert into public.products (name, price_cents, options) values ('Opção ruim', 100, '[{"id":"a","label":"A","priceCents":10.5}]')$$);
select pg_temp.expect_denied($$update public.settings set whatsapp = 'abc', whatsapp_confirmed = true$$);
select pg_temp.expect_denied($$update public.settings set hours = '[{"days":[1],"opens":"25:00","closes":"14:00"}]'$$);
select pg_temp.expect_denied($$update public.settings set hours = '[{"days":[7],"opens":"11:00","closes":"14:00"}]'$$);
select pg_temp.expect_denied($$update public.settings set hours = '[{"days":[1],"opens":"15:00","closes":"14:00"}]'$$);
update public.settings set hours = '[{"days":[1,2,3,4,5],"opens":"11:30","closes":"14:00"},{"days":[6],"opens":"11:00","closes":"15:00"}]';
select pg_temp.expect_denied($$update public.settings set delivery_fee_mode = 'gratis'$$);
select pg_temp.expect_denied($$insert into public.settings (id, restaurant_name, hero_title) values (2, 'Outro', 'Outro')$$);
reset role;

do $$ begin
  if (select price_cents from public.products where name = 'Prato publicado') <> 2790 then raise exception 'admin não alterou preço'; end if;
  if (select daily_product_id from public.settings) is null then raise exception 'prato do dia não salvo'; end if;
end $$;

-- Excluir o prato do dia limpa a referência
delete from public.products where name = 'Prato publicado';
do $$ begin
  if (select daily_product_id from public.settings) is not null then raise exception 'prato do dia deveria ficar vazio'; end if;
end $$;

select 'OK: todas as regras de acesso e validação passaram' as resultado;
