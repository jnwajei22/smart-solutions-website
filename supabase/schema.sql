-- Run once in a NEW Supabase project. Server mutations use the service role only.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'customer' check(role in ('customer','admin'))
);
create function public.new_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles(id) values(new.id);return new;end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_profile();
insert into public.profiles(id) select id from auth.users on conflict do nothing;
create table public.requests (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id),
 name text not null, email text not null, phone text not null, service text not null check(service in ('cabling','wifi','racks','tv','smart')),
 property_type text not null check(property_type in ('Residential','Commercial')),
 address text not null, city text not null, details text not null, preferred_date date,
 status text not null default 'requested' check(status in ('requested','reviewing','quoted','scheduled','in_progress','completed','cancelled')),
 created_at timestamptz not null default now()
);
create index requests_customer on public.requests(customer_id,created_at desc);
create table public.messages (id uuid primary key default gen_random_uuid(),request_id uuid not null references public.requests(id),author_id uuid not null references auth.users(id),body text not null check(length(body) between 3 and 2000),created_at timestamptz not null default now());
create index messages_request on public.messages(request_id);
create sequence public.invoice_number_seq start 1001;
create table public.invoices (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique references public.requests(id), customer_id uuid not null references auth.users(id),
 number text not null unique default ('DFW-' || nextval('public.invoice_number_seq')),
 title text not null, terms text not null check(length(terms) between 20 and 2000), items jsonb not null, total_cents integer not null check(total_cents between 100 and 5000000),
 deposit_cents integer not null check(deposit_cents>=0 and deposit_cents<=total_cents),
 paid_cents integer not null default 0 check(paid_cents>=0),
 status text not null default 'issued' check(status in ('issued','paid','void')),
 due_date date not null, accepted_at timestamptz, created_at timestamptz not null default now()
);
create index invoices_customer on public.invoices(customer_id);
create table public.payment_attempts (
 id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id),
 customer_id uuid not null references auth.users(id), amount_cents integer not null check(amount_cents>0),
 kind text not null check(kind in ('deposit','balance')), session_id text unique,
 completed boolean not null default false, expires_at timestamptz not null default (now()+interval '35 minutes'), created_at timestamptz not null default now()
);
create index payment_attempts_invoice on public.payment_attempts(invoice_id);
create table public.payments (
 id uuid primary key default gen_random_uuid(),invoice_id uuid not null references public.invoices(id),customer_id uuid not null references auth.users(id),
 amount_cents integer not null check(amount_cents>0),refunded_cents integer not null default 0 check(refunded_cents>=0 and refunded_cents<=amount_cents),
 stripe_session_id text not null unique,stripe_intent_id text not null unique,created_at timestamptz not null default now()
);
create index payments_customer on public.payments(customer_id);
create table public.webhook_events (id text primary key,created_at timestamptz not null default now());
create table public.request_limits (customer_id uuid primary key references auth.users(id),window_start timestamptz not null default now(),used integer not null default 0);
create function public.is_business_admin() returns boolean language sql stable security definer set search_path = public as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin');$$;
alter table public.messages enable row level security;
alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.webhook_events enable row level security;
alter table public.request_limits enable row level security;
create policy messages_read on public.messages for select to authenticated using(public.is_business_admin() or exists(select 1 from public.requests where requests.id=messages.request_id and requests.customer_id=auth.uid()));
create policy own_profile_read on public.profiles for select to authenticated using(id=auth.uid());
create policy requests_read on public.requests for select to authenticated using(customer_id=auth.uid() or public.is_business_admin());
create policy invoices_read on public.invoices for select to authenticated using(customer_id=auth.uid() or public.is_business_admin());
create policy payments_read on public.payments for select to authenticated using(customer_id=auth.uid() or public.is_business_admin());
revoke all on public.profiles,public.requests,public.messages,public.invoices,public.payments,public.payment_attempts,public.webhook_events,public.request_limits from anon,authenticated;
grant select on public.profiles,public.requests,public.messages,public.invoices,public.payments to authenticated;
grant all on public.profiles,public.requests,public.messages,public.invoices,public.payments,public.payment_attempts,public.webhook_events,public.request_limits to service_role;
grant usage,select on public.invoice_number_seq to service_role;
create function public.consume_request_limit(p_user uuid) returns boolean language plpgsql security definer set search_path = public as $$
declare lim public.request_limits;
begin
 insert into public.request_limits(customer_id) values(p_user) on conflict do nothing;
 select * into lim from public.request_limits where customer_id=p_user for update;
 if lim.window_start < now()-interval '24 hours' then update public.request_limits set window_start=now(),used=1 where customer_id=p_user;return true;end if;
 if lim.used>=10 then return false;end if;
 update public.request_limits set used=used+1 where customer_id=p_user;return true;
end;$$;
create function public.issue_quote(p_request uuid,p_title text,p_items jsonb,p_total integer,p_deposit integer,p_due date,p_terms text) returns uuid language plpgsql security definer set search_path = public as $$
declare job public.requests; invoice_id uuid; calculated numeric; item jsonb;
begin
 select * into strict job from public.requests where id=p_request for update;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Invalid items';end if;
 calculated:=0;
 for item in select * from jsonb_array_elements(p_items) loop
  if coalesce(length(trim(item->>'description')),0) not between 1 and 200 or (item->>'quantity')::numeric not between 1 and 10000 or (item->>'quantity')::numeric<>trunc((item->>'quantity')::numeric) or (item->>'unit_cents')::numeric not between 0 and 10000000 or (item->>'unit_cents')::numeric<>trunc((item->>'unit_cents')::numeric) then raise exception 'Invalid line item';end if;
  calculated:=calculated+(item->>'quantity')::numeric*(item->>'unit_cents')::numeric;
 end loop;
 if calculated<>p_total or calculated not between 100 and 5000000 then raise exception 'Invalid quote total';end if;
 insert into public.invoices(request_id,customer_id,title,terms,items,total_cents,deposit_cents,due_date) values(job.id,job.customer_id,p_title,p_terms,p_items,p_total,p_deposit,p_due) returning id into invoice_id;
 update public.requests set status='quoted' where id=job.id;
 return invoice_id;
end;$$;
create function public.reserve_checkout(p_invoice uuid,p_customer uuid,p_amount integer,p_kind text) returns table(id uuid,session_id text) language plpgsql security definer set search_path = public as $$
declare inv public.invoices; expected integer; attempt public.payment_attempts;
begin
 select * into strict inv from public.invoices where public.invoices.id=p_invoice for update;
 if inv.customer_id<>p_customer or inv.status<>'issued' or inv.accepted_at is null then raise exception 'Not payable';end if;
 if p_kind='deposit' then expected:=least(inv.total_cents-inv.paid_cents,greatest(0,inv.deposit_cents-inv.paid_cents));elsif p_kind='balance' then expected:=inv.total_cents-inv.paid_cents;else raise exception 'Invalid kind';end if;
 if expected<50 or expected<>p_amount then raise exception 'Invalid amount';end if;
 select * into attempt from public.payment_attempts a where a.invoice_id=p_invoice and not a.completed order by a.created_at desc limit 1;
 if found then
  if attempt.kind<>p_kind then raise exception 'A different checkout is pending';end if;
  if attempt.session_id is not null then return query select attempt.id,attempt.session_id;return;end if;
  raise exception 'Checkout pending';
 end if;
 insert into public.payment_attempts(invoice_id,customer_id,amount_cents,kind) values(p_invoice,p_customer,p_amount,p_kind) returning * into attempt;
 return query select attempt.id,attempt.session_id;
end;$$;
create function public.record_payment(p_event text,p_attempt uuid,p_session text,p_intent text,p_amount integer) returns void language plpgsql security definer set search_path = public as $$
declare attempt public.payment_attempts; inv public.invoices; paid integer;
begin
 if exists(select 1 from public.webhook_events where id=p_event) then return;end if;
 select * into strict attempt from public.payment_attempts where id=p_attempt;
 select * into strict inv from public.invoices where id=attempt.invoice_id for update;
 if attempt.amount_cents<>p_amount or (attempt.session_id is not null and attempt.session_id<>p_session) then raise exception 'Payment mismatch';end if;
 insert into public.payments(invoice_id,customer_id,amount_cents,stripe_session_id,stripe_intent_id) values(inv.id,inv.customer_id,p_amount,p_session,p_intent) on conflict(stripe_session_id) do nothing;
 update public.payment_attempts set completed=true,session_id=p_session where id=p_attempt;
 select coalesce(sum(amount_cents-refunded_cents),0) into paid from public.payments where invoice_id=inv.id;
 update public.invoices set paid_cents=paid,status=case when paid>=total_cents then 'paid' else 'issued' end where id=inv.id;
 insert into public.webhook_events(id) values(p_event) on conflict do nothing;
end;$$;
create function public.record_refund(p_event text,p_intent text,p_refunded integer) returns void language plpgsql security definer set search_path = public as $$
declare payment public.payments; paid integer;
begin
 if exists(select 1 from public.webhook_events where id=p_event) then return;end if;
 select * into strict payment from public.payments where stripe_intent_id=p_intent;
 perform 1 from public.invoices where id=payment.invoice_id for update;
 if p_refunded<0 or p_refunded>payment.amount_cents then raise exception 'Invalid refund';end if;
 -- A late partial-refund event must not overwrite a newer cumulative refund.
 update public.payments set refunded_cents=greatest(refunded_cents,p_refunded) where id=payment.id;
 select coalesce(sum(amount_cents-refunded_cents),0) into paid from public.payments where invoice_id=payment.invoice_id;
 update public.invoices set paid_cents=paid,status=case when paid>=total_cents then 'paid' else 'issued' end where id=payment.invoice_id;
 insert into public.webhook_events(id) values(p_event) on conflict do nothing;
end;$$;
revoke all on function public.new_profile() from public,anon,authenticated;
revoke all on function public.is_business_admin() from public,anon;
grant execute on function public.is_business_admin() to authenticated,service_role;
revoke all on function public.consume_request_limit(uuid),public.issue_quote(uuid,text,jsonb,integer,integer,date,text),public.reserve_checkout(uuid,uuid,integer,text),public.record_payment(text,uuid,text,text,integer),public.record_refund(text,text,integer) from public,anon,authenticated;
grant execute on function public.consume_request_limit(uuid),public.issue_quote(uuid,text,jsonb,integer,integer,date,text),public.reserve_checkout(uuid,uuid,integer,text),public.record_payment(text,uuid,text,text,integer),public.record_refund(text,text,integer) to service_role;
commit;
-- After creating and verifying YOUR account, grant administration in SQL:
-- update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_VERIFIED_EMAIL');
-- Never expose SUPABASE_SERVICE_ROLE_KEY or STRIPE_SECRET_KEY to browser code.
