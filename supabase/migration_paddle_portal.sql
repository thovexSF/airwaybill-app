-- Store Paddle customer ID and subscription cancel URL
alter table organizations
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_cancel_url   text;
