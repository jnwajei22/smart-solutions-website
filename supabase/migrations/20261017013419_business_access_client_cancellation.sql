begin;
-- Explicit email allowlist. Customers cannot list or mutate team permissions.
create table public.business_access (
 email text primary key check(email=lower(btrim(email)) and length(email) between 3 and 254),
 role text not null check(role in ('manager','viewer')),
 granted_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.business_access enable row level security;
revoke all on public.business_access from public,anon,authenticated;
grant all on public.business_access to service_role;
create index business_access_granted_by on public.business_access(granted_by);
-- Narrow definer lookups are necessary because auth.users and the allowlist are private.
-- Parameterized lookup is service-only; the authenticated wrapper exposes only one's own role.
create function private.business_role_for(p_user uuid) returns text language sql stable security definer set search_path='' as $$
 select case when p.role='admin' then 'admin' else a.role end
 from auth.users u join public.profiles p on p.id=u.id
 left join public.business_access a on a.email=lower(u.email)
 where u.id=p_user and u.email_confirmed_at is not null;
$$;
revoke all on function private.business_role_for(uuid) from public,anon,authenticated;
grant execute on function private.business_role_for(uuid) to service_role;
create function private.current_business_role() returns text language sql stable security definer set search_path='' as $$
 select private.business_role_for((select auth.uid())) where (select auth.uid()) is not null;
$$;
revoke all on function private.current_business_role() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.current_business_role() to authenticated,service_role;
create function public.is_business_member() returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce(private.current_business_role() in ('admin','manager','viewer'),false);
$$;
revoke all on function public.is_business_member() from public,anon;
grant execute on function public.is_business_member() to authenticated,service_role;
alter policy requests_read on public.requests using(customer_id=(select auth.uid()) or (select public.is_business_member()));
alter policy invoices_read on public.invoices using(customer_id=(select auth.uid()) or (select public.is_business_member()));
alter policy payments_read on public.payments using(customer_id=(select auth.uid()) or (select public.is_business_member()));
alter policy messages_read on public.messages using((select public.is_business_member()) or exists(select 1 from public.requests where requests.id=messages.request_id and requests.customer_id=(select auth.uid())));

alter table public.invoices
 add column client_cancellation_reason text check(client_cancellation_reason is null or length(btrim(client_cancellation_reason)) between 3 and 500),
 add column client_cancellation_requested_at timestamptz;
-- Client identity is supplied only by the authenticated server. Lock in the same order as payment/cancellation routines.
create function public.request_invoice_cancellation(p_invoice uuid,p_customer uuid,p_reason text) returns void language plpgsql security invoker set search_path=public as $$
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
 insert into public.messages(request_id,author_id,body) values(rid,p_customer,'Cancellation requested. Reason: '||btrim(p_reason));
end;$$;
revoke all on function public.request_invoice_cancellation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.request_invoice_cancellation(uuid,uuid,text) to service_role;
create or replace function public.begin_invoice_cancellation(p_invoice uuid,p_actor uuid,p_reason text,p_cancel_project boolean) returns void language plpgsql security invoker set search_path=public as $$
declare inv public.invoices;rid uuid;
begin
 if coalesce(private.business_role_for(p_actor),'') not in ('admin','manager') then raise exception 'Project management required';end if;
 select request_id into strict rid from public.invoices where id=p_invoice;
 perform 1 from public.requests where id=rid for update;
 select * into strict inv from public.invoices where id=p_invoice for update;
 if inv.status='void' then return;end if;
 if inv.client_cancellation_reason is null then raise exception 'Client cancellation request required';end if;
 -- Ignore caller-supplied reason/flag; only the client controls their reason.
 update public.invoices set collection_paused_at=coalesce(collection_paused_at,now()),
 cancellation_reason=inv.client_cancellation_reason,cancellation_actor=p_actor,
 cancel_project_requested=true where id=p_invoice;
end;$$;
commit;
