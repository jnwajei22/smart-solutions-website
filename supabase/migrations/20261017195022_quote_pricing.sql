-- Additive quote calculator release. Existing invoice amounts remain unchanged.
begin;
create table private.quote_pricing_release_20261017 as
 select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='issue_quote';
alter table private.quote_pricing_release_20261017 enable row level security;
revoke all on private.quote_pricing_release_20261017 from public,anon,authenticated;
alter table public.requests add column qualification jsonb not null default '{}'::jsonb
 check(jsonb_typeof(qualification)='object' and octet_length(qualification::text)<=16000);
alter table public.invoices drop constraint invoices_terms_check;
alter table public.invoices add constraint invoices_terms_check check(length(terms) between 20 and 6000);
create table public.price_books (
 id boolean primary key default true check(id),
 book jsonb not null check(jsonb_typeof(book)='object' and length(book->>'version') between 1 and 80 and octet_length(book::text)<=20000),
 updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create table public.quote_pricing_audits (
 invoice_id uuid primary key references public.invoices(id),
 actor_id uuid not null references auth.users(id), price_book_version text not null,
 audit jsonb not null check(jsonb_typeof(audit)='object' and octet_length(audit::text)<=40000),
 created_at timestamptz not null default now()
);
alter table public.price_books enable row level security;
alter table public.quote_pricing_audits enable row level security;
revoke all on public.price_books,public.quote_pricing_audits from public,anon,authenticated;
grant select,insert,update on public.price_books to service_role;
grant select,insert on public.quote_pricing_audits to service_role;
insert into public.price_books(id,book) values(true,$seed${"version":"launch-draft-1","loadedLaborCentsPerHour":3500,"additionalLaborCentsPerHour":8500,"vehicleCentsPerMile":75,"overheadCents":2000,"adminMinutes":30,"cardReserveBps":300,"callbackReserveBps":500,"targetMarginBps":2000,"regionalTravelCents":4900,"regionalMinimumCents":29900,"distantTravelCents":9900,"distantMinimumCents":59900,"packages":[{"id":"wifi","name":"Wi-Fi Troubleshooting","laborCents":21900,"onsiteMinutes":90,"crew":1,"scope":"Up to 90 minutes diagnosing existing Wi-Fi equipment, adjusting configuration and testing connectivity. New equipment and cabling are separate."},{"id":"mesh","name":"Home Network Setup","laborCents":34900,"onsiteMinutes":180,"crew":1,"scope":"Configure one compatible router/mesh system with up to three nodes and five client devices, test coverage and provide a handoff. Hardware and new cabling are separate."},{"id":"smart","name":"Smart-Home Starter","laborCents":21900,"onsiteMinutes":90,"crew":1,"scope":"Configure up to three compatible plug-in devices and two routines. Excludes wired switches, security systems and new wiring. Hardware is separate."},{"id":"tv","name":"Standard TV Mounting","laborCents":29900,"onsiteMinutes":60,"crew":2,"scope":"Mount one TV up to 65 inches on suitable wood-stud/drywall with an approved mount, basic device connection and surface cable tidying. Photo and access review required; TV, mount and raceway are separate."},{"id":"cabling","name":"Ethernet Installation","laborCents":44900,"onsiteMinutes":120,"crew":2,"scope":"Labor for one reviewed, accessible Ethernet run up to 75 feet, terminations, labeling and wire-map testing. Cable and hardware are separately itemized. Excludes category certification, electrical and security work."},{"id":"business","name":"Small-Business Network Cleanup","laborCents":44900,"onsiteMinutes":180,"crew":1,"scope":"Up to three hours documenting and organizing an existing small network, labeling up to 12 connections and checking operation. Hardware, new cabling and major configuration changes are separate."}]}$seed$::jsonb);
create function public.save_price_book(p_expected text,p_book jsonb,p_actor uuid) returns void
 language plpgsql security invoker set search_path=public as $$
begin
 if jsonb_typeof(p_book) is distinct from 'object' or nullif(p_book->>'version','') is null then raise exception 'Invalid price book';end if;
 update public.price_books set book=p_book,updated_by=p_actor,updated_at=now() where id=true and book->>'version'=p_expected;
 if not found then raise exception 'Price book changed';end if;
end;$$;
create or replace function public.issue_quote(p_request uuid,p_title text,p_items jsonb,p_total integer,p_deposit integer,p_due date,p_terms text) returns uuid
 language plpgsql security invoker set search_path=public as $$
declare job public.requests; invoice_id uuid; calculated numeric:=0; item jsonb; qty numeric; cents numeric; kind text;
begin
 select * into strict job from public.requests where id=p_request for update;
 if job.status in ('cancelled','completed') then raise exception 'Project closed';end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Invalid items';end if;
 if jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Invalid items';end if;
 for item in select * from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item->'description') is distinct from 'string' or coalesce(length(trim(item->>'description')),0) not between 1 and 200
   or jsonb_typeof(item->'quantity') is distinct from 'number' or jsonb_typeof(item->'unit_cents') is distinct from 'number'
   then raise exception 'Invalid line item';end if;
  qty:=(item->>'quantity')::numeric;cents:=(item->>'unit_cents')::numeric;kind:=item->>'kind';
  if qty not between 1 and 10000 or qty<>trunc(qty) or cents<>trunc(cents) or abs(cents)>10000000
   or (kind is not null and kind not in ('labor','material','travel','discount','tax'))
   or (cents<0 and (kind is distinct from 'discount' or qty<>1))
   or (kind='discount' and cents>=0) then raise exception 'Invalid line item';end if;
  calculated:=calculated+qty*cents;
 end loop;
 if p_total is null or calculated<>p_total or calculated not between 100 and 5000000 then raise exception 'Invalid quote total';end if;
 insert into public.invoices(request_id,customer_id,title,terms,items,total_cents,deposit_cents,due_date)
 values(job.id,job.customer_id,p_title,p_terms,p_items,p_total,p_deposit,p_due) returning id into invoice_id;
 update public.requests set status='quoted' where id=job.id;
 return invoice_id;
end;$$;
create function public.issue_priced_quote(p_request uuid,p_title text,p_items jsonb,p_total integer,p_deposit integer,p_due date,p_terms text,p_expected_version text,p_actor uuid,p_audit jsonb) returns uuid
 language plpgsql security invoker set search_path=public as $$
declare price_book jsonb; result uuid;
begin
 select book into strict price_book from public.price_books where id=true for share;
 if p_expected_version is distinct from price_book->>'version' then raise exception 'Price book changed';end if;
 if jsonb_typeof(p_audit) is distinct from 'object' then raise exception 'Invalid pricing audit';end if;
 result:=public.issue_quote(p_request,p_title,p_items,p_total,p_deposit,p_due,p_terms);
 insert into public.quote_pricing_audits(invoice_id,actor_id,price_book_version,audit)
 values(result,p_actor,p_expected_version,p_audit || jsonb_build_object('priceBook',price_book));
 return result;
end;$$;
revoke all on function public.save_price_book(text,jsonb,uuid),public.issue_priced_quote(uuid,text,jsonb,integer,integer,date,text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_price_book(text,jsonb,uuid),public.issue_priced_quote(uuid,text,jsonb,integer,integer,date,text,text,uuid,jsonb) to service_role;
commit;
