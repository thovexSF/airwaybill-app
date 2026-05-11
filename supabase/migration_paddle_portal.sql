-- Rename stripe_* columns to paddle_* and add portal columns
alter table organizations
  rename column stripe_customer_id     to paddle_customer_id;

alter table organizations
  rename column stripe_subscription_id to paddle_subscription_id;

alter table organizations
  add column if not exists paddle_cancel_url text;
