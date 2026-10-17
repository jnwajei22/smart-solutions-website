-- Apply to the existing customer platform. No historical notifications are backfilled.
begin;
alter table public.invoices add column collection_paused_at timestamptz,
 add column cancellation_reason text check(cancellation_reason is null or length(btrim(cancellation_reason)) between 3 and 500),
 add column cancellation_actor uuid references auth.users(id),
 add column cancel_project_requested boolean not null default false,
 add column voided_at timestamptz;
alter table public.invoices drop constraint invoices_request_id_key;
create unique index invoices_one_active_request on public.invoices(request_id) where status <> 'void';
create or replace function public.issue_quote(p_request uuid,p_title text,p_items jsonb,p_total integer,p_deposit integer,p_due date,p_terms text) returns uuid language plpgsql security invoker set search_path = public as $$
declare job public.requests; invoice_id uuid; calculated numeric; item jsonb;
begin
 select * into strict job from public.requests where id=p_request for update;
 if job.status='cancelled' then raise exception 'Project cancelled';end if;
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
create or replace function public.reserve_checkout(p_invoice uuid,p_customer uuid,p_amount integer,p_kind text) returns table(id uuid,session_id text) language plpgsql security invoker set search_path = public as $$
declare inv public.invoices; expected integer; attempt public.payment_attempts;
begin
 select * into strict inv from public.invoices where public.invoices.id=p_invoice for update;
 if inv.customer_id<>p_customer or inv.status<>'issued' or inv.collection_paused_at is not null or inv.accepted_at is null then raise exception 'Not payable';end if;
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
create or replace function public.record_payment(p_event text,p_attempt uuid,p_session text,p_intent text,p_amount integer) returns void language plpgsql security invoker set search_path = public as $$
declare attempt public.payment_attempts; inv public.invoices; paid integer;
begin
 if exists(select 1 from public.webhook_events where id=p_event) then return;end if;
 select * into strict attempt from public.payment_attempts where id=p_attempt;
 select * into strict inv from public.invoices where id=attempt.invoice_id for update;
 if attempt.amount_cents<>p_amount or (attempt.session_id is not null and attempt.session_id<>p_session) then raise exception 'Payment mismatch';end if;
 insert into public.payments(invoice_id,customer_id,amount_cents,stripe_session_id,stripe_intent_id) values(inv.id,inv.customer_id,p_amount,p_session,p_intent) on conflict(stripe_session_id) do nothing;
 update public.payment_attempts set completed=true,session_id=p_session where id=p_attempt;
 select coalesce(sum(amount_cents-refunded_cents),0) into paid from public.payments where invoice_id=inv.id;
 update public.invoices set paid_cents=paid,status=case when status='void' then 'void' when paid>=total_cents then 'paid' else 'issued' end where id=inv.id;
 insert into public.webhook_events(id) values(p_event) on conflict do nothing;
end;$$;
create or replace function public.record_refund(p_event text,p_intent text,p_refunded integer) returns void language plpgsql security invoker set search_path = public as $$
declare payment public.payments; paid integer;
begin
 if exists(select 1 from public.webhook_events where id=p_event) then return;end if;
 select * into strict payment from public.payments where stripe_intent_id=p_intent;
 perform 1 from public.invoices where id=payment.invoice_id for update;
 if p_refunded<0 or p_refunded>payment.amount_cents then raise exception 'Invalid refund';end if;
 -- A late partial-refund event must not overwrite a newer cumulative refund.
 update public.payments set refunded_cents=greatest(refunded_cents,p_refunded) where id=payment.id;
 select coalesce(sum(amount_cents-refunded_cents),0) into paid from public.payments where invoice_id=payment.invoice_id;
 update public.invoices set paid_cents=paid,status=case when status='void' then 'void' when paid>=total_cents then 'paid' else 'issued' end where id=payment.invoice_id;
 insert into public.webhook_events(id) values(p_event) on conflict do nothing;
end;$$;

create function public.begin_invoice_cancellation(p_invoice uuid,p_actor uuid,p_reason text,p_cancel_project boolean) returns void language plpgsql security invoker set search_path=public as $$
declare inv public.invoices;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'Admin required';end if;
 if coalesce(length(btrim(p_reason)),0) not between 3 and 500 or p_cancel_project is null then raise exception 'Reason required';end if;
 perform 1 from public.requests where id=(select request_id from public.invoices where id=p_invoice) for update;
 select * into strict inv from public.invoices where id=p_invoice for update;
 if inv.status='void' then return;end if;
 update public.invoices set collection_paused_at=coalesce(collection_paused_at,now()),
 cancellation_reason=coalesce(cancellation_reason,btrim(p_reason)),cancellation_actor=coalesce(cancellation_actor,p_actor),
 cancel_project_requested=cancel_project_requested or p_cancel_project where id=p_invoice;
end;$$;
create function public.finish_invoice_cancellation(p_invoice uuid) returns void language plpgsql security invoker set search_path=public as $$
declare inv public.invoices;
begin
 perform 1 from public.requests where id=(select request_id from public.invoices where id=p_invoice) for update;
 select * into strict inv from public.invoices where id=p_invoice for update;
 if inv.status='void' then return;end if;
 if inv.collection_paused_at is null then raise exception 'Cancellation not started';end if;
 if inv.paid_cents<>0 or exists(select 1 from public.payments where invoice_id=p_invoice and amount_cents<>refunded_cents) then raise exception 'Refund retained payments first';end if;
 if exists(select 1 from public.payment_attempts where invoice_id=p_invoice and not completed) then raise exception 'Checkout unresolved';end if;
 update public.invoices set status='void',voided_at=now() where id=p_invoice;
 if inv.cancel_project_requested then update public.requests set status='cancelled' where id=inv.request_id;end if;
end;$$;
create function public.set_project_status(p_request uuid,p_status text) returns void language plpgsql security invoker set search_path=public as $$
begin
 perform 1 from public.requests where id=p_request for update;
 if p_status='cancelled' and exists(select 1 from public.invoices where request_id=p_request and status<>'void') then raise exception 'Cancel invoice first';end if;
 update public.requests set status=p_status where id=p_request;
end;$$;
revoke all on function public.begin_invoice_cancellation(uuid,uuid,text,boolean),public.finish_invoice_cancellation(uuid),public.set_project_status(uuid,text) from public,anon,authenticated;
grant execute on function public.begin_invoice_cancellation(uuid,uuid,text,boolean),public.finish_invoice_cancellation(uuid),public.set_project_status(uuid,text) to service_role;

create table public.notification_outbox (
 id uuid primary key default gen_random_uuid(),event_key text not null unique,
 kind text not null check(kind in ('request_received','client_message','business_message','quote_ready','invoice_void','project_status','payment_received','refund_recorded')),
 request_id uuid not null references public.requests(id),customer_id uuid not null references auth.users(id),
 audience text not null check(audience in ('business','customer')),
 status text not null default 'pending' check(status in ('pending','sending','sent','failed')),
 attempts integer not null default 0,next_attempt_at timestamptz not null default now(),
 claimed_until timestamptz,claim_token uuid,sent_at timestamptz,last_error text,
 created_at timestamptz not null default now()
);
alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from public,anon,authenticated;
grant all on public.notification_outbox to service_role;
create index invoices_cancellation_actor on public.invoices(cancellation_actor);
create index notification_request on public.notification_outbox(request_id);
create index notification_customer on public.notification_outbox(customer_id);
create index notification_pending on public.notification_outbox(next_attempt_at) where status in ('pending','sending');
-- All business writes already use service_role. Triggers deliberately use invoker privileges.
create function private.queue_notification() returns trigger language plpgsql security invoker set search_path=public as $$
declare rid uuid;cid uuid;k text;aud text:='customer';key text;
begin
 if tg_table_name='requests' then
  rid:=new.id;cid:=new.customer_id;
  if tg_op='INSERT' then k:='request_received';aud:='business';key:='request:'||new.id;
  elsif new.status is distinct from old.status then k:='project_status';key:='status:'||new.id||':'||gen_random_uuid();else return new;end if;
 elsif tg_table_name='messages' then
  rid:=new.request_id;select customer_id into cid from public.requests where id=rid;
  if new.author_id=cid then k:='client_message';aud:='business';else k:='business_message';end if;
  key:='message:'||new.id;
 elsif tg_table_name='invoices' then
  rid:=new.request_id;cid:=new.customer_id;
  if tg_op='INSERT' then k:='quote_ready';key:='quote:'||new.id;
  elsif new.status='void' and old.status<>'void' then k:='invoice_void';key:='void:'||new.id;else return new;end if;
 else
  select request_id into rid from public.invoices where id=new.invoice_id;cid:=new.customer_id;
  if tg_op='INSERT' then k:='payment_received';key:='payment:'||new.id;
  elsif new.refunded_cents>old.refunded_cents then k:='refund_recorded';key:='refund:'||new.id||':'||new.refunded_cents;else return new;end if;
 end if;
 insert into public.notification_outbox(event_key,kind,request_id,customer_id,audience) values(key,k,rid,cid,aud) on conflict(event_key) do nothing;
 -- A receipt goes to the client as well as the business, with no payment details in email.
 if k in ('request_received','payment_received','refund_recorded') then
  insert into public.notification_outbox(event_key,kind,request_id,customer_id,audience) values(key||':copy',k,rid,cid,case when aud='business' then 'customer' else 'business' end) on conflict(event_key) do nothing;
 end if;
 return new;
end;$$;
revoke all on function private.queue_notification() from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.queue_notification() to service_role;
create trigger requests_notify after insert or update on public.requests for each row execute function private.queue_notification();
create trigger messages_notify after insert on public.messages for each row execute function private.queue_notification();
create trigger invoices_notify after insert or update on public.invoices for each row execute function private.queue_notification();
create trigger payments_notify after insert or update on public.payments for each row execute function private.queue_notification();
create function public.claim_notifications(p_limit integer) returns setof public.notification_outbox language plpgsql security invoker set search_path=public as $$
 begin
 update public.notification_outbox set status='failed',claimed_until=null,last_error='Worker stopped after final attempt; review delivery before retrying.' where status='sending' and attempts>=8 and claimed_until<now();
 return query update public.notification_outbox set status='sending',attempts=attempts+1,claim_token=gen_random_uuid(),claimed_until=now()+interval '5 minutes'
 where id in (select id from public.notification_outbox where attempts<8 and ((status='pending' and next_attempt_at<=now()) or (status='sending' and claimed_until<now())) order by created_at for update skip locked limit least(greatest(p_limit,1),5)) returning *;
 end;$$;
revoke all on function public.claim_notifications(integer) from public,anon,authenticated;
grant execute on function public.claim_notifications(integer) to service_role;
commit;
