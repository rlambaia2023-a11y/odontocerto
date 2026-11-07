-- Novos tipos de documento: pedido de imagem, receita de manipulado e pedido de medicação (aplicação)
alter table public.documents drop constraint if exists documents_doc_type_check;
alter table public.documents add constraint documents_doc_type_check check (doc_type = any (array['receituario','atestado','declaracao','carta','exames','cirurgia','laudo','orcamento','imagem','manipulado','medicacao']));
