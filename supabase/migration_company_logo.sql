-- Logo de la empresa (data URL reducida en el navegador) para los documentos que lo llevan, como el DGD.
alter table organization_defaults
  add column if not exists company_logo_url text not null default '';
