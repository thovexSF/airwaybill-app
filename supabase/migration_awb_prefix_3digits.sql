-- El prefijo IATA de la aerolínea tiene siempre 3 dígitos ("006"); el importador antiguo
-- guardó "6" o "45". Se rellena con ceros en el prefijo y en la referencia al MAWB de los HAWB.
update awb_documents
set data = jsonb_set(data, '{awbPrefix}', to_jsonb(lpad(data->>'awbPrefix', 3, '0')))
where data->>'awbPrefix' ~ '^[0-9]{1,2}$';

update awb_documents
set data = jsonb_set(
  data, '{mawbReference}',
  to_jsonb(lpad(split_part(data->>'mawbReference', '-', 1), 3, '0') || '-' || split_part(data->>'mawbReference', '-', 2))
)
where data->>'mawbReference' ~ '^[0-9]{1,2}-[0-9]+$';
