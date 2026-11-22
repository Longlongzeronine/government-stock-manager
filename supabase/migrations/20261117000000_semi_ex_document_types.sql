alter table public.ppe_documents
  drop constraint if exists ppe_documents_document_type_check;

alter table public.ppe_documents
  add constraint ppe_documents_document_type_check
  check (document_type in (
    'ppe-ledger', 'par', 'ptr', 'rpcppe', 'iirup', 'rlsddp', 'rrpe',
    'splc', 'itr', 'rpcsp'
  ));
