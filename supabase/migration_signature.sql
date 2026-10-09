-- Firma del firmante (imagen reducida en el navegador) para estampar en documentos que la llevan, como el DGD.
alter table organization_defaults
  add column if not exists signature_url text not null default '';
