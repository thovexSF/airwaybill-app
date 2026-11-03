-- Already-applied migration_free_lifetime_limit.sql set free_doc_limit() to 3.
-- Raise the free allowance to 10 lifetime documents. Keep in step with FREE_DOC_LIMIT.
create or replace function free_doc_limit() returns int
language sql immutable as $$ select 10 $$;
