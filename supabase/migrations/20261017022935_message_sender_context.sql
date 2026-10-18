begin;
alter table public.messages add column sender_type text check(sender_type in ('client','business'));
create or replace function private.queue_notification() returns trigger language plpgsql security invoker set search_path=public as $$
declare rid uuid;cid uuid;k text;aud text:='customer';key text;
begin
 if tg_table_name='requests' then
  rid:=new.id;cid:=new.customer_id;
  if tg_op='INSERT' then k:='request_received';aud:='business';key:='request:'||new.id;
  elsif new.status is distinct from old.status then k:='project_status';key:='status:'||new.id||':'||gen_random_uuid();else return new;end if;
 elsif tg_table_name='messages' then
  rid:=new.request_id;select customer_id into cid from public.requests where id=rid;
  if coalesce(new.sender_type,case when new.author_id=cid then 'client' else 'business' end)='client' then k:='client_message';aud:='business';else k:='business_message';end if;
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
create or replace function public.request_invoice_cancellation(p_invoice uuid,p_customer uuid,p_reason text) returns void language plpgsql security invoker set search_path=public as $$
declare inv public.invoices;rid uuid;
begin
 if coalesce(length(btrim(p_reason)),0) not between 3 and 500 then raise exception 'Reason required';end if;
 select request_id into strict rid from public.invoices where id=p_invoice and customer_id=p_customer;
 perform 1 from public.requests where id=rid for update;
 select * into strict inv from public.invoices where id=p_invoice and customer_id=p_customer for update;
 if inv.status='void' then raise exception 'Cancellation already completed';end if;
 update public.invoices set client_cancellation_reason=btrim(p_reason),
 client_cancellation_requested_at=coalesce(client_cancellation_requested_at,now()),
 collection_paused_at=coalesce(collection_paused_at,now()),cancel_project_requested=true where id=p_invoice;
 -- A normal project message queues a business alert through the existing notification system.
 insert into public.messages(request_id,author_id,sender_type,body) values(rid,p_customer,'client','Cancellation requested. Reason: '||btrim(p_reason));
end;$$;
commit;
