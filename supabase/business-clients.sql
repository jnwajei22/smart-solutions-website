-- Additive upgrade for existing installations. Fresh installs use schema.sql.
-- Customer-entered company name is a request-time display snapshot, not authorization.
alter table public.requests
  add column business_name text
  constraint requests_business_name_check
  check (business_name is null or length(btrim(business_name)) between 2 and 160);
