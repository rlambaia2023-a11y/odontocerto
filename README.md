# PEPMH

Prontuário eletrônico e gestão de consultório odontológico.

**Módulos:** início com próximo paciente, agenda (dia/semana, conflitos, confirmação por WhatsApp), pacientes, prontuário (resumo automático, anamnese versionada, odontograma permanente/misto/decíduo com CPO-D, periograma, exame clínico extra/intraoral, evolução, plano de tratamento com orçamento e cobrança, documentos, financeiro, retornos), prescrições e laudos (receituário simples e de controle especial, atestado, declaração, carta, exames, cirurgia, laudo, modelos, checagem de alergia), financeiro, precificador, convênios, relatórios, estoque, marketing (aniversariantes, recall, campanhas), CRM, central de ideias e configurações. Inclui modo demonstração com dados fictícios.

## Dietas e exercícios (`#/guia`)
Guia para a equipe e para o paciente: 8 dietas (prato equilibrado, mediterrânea, MIND, DASH, low carb, cetogênica, cetogênica mediterrânea, jejum intermitente), receitas ricas em proteína, planos semanais de exercício (iniciante, intermediário e avançado) com treino de força em casa, cuidados com tirzepatida e sinais de alerta, suplementos, calculadoras (IMC, água, proteína, gasto calórico e meta) e dica do dia. A equipe envia qualquer conteúdo ao paciente pelo WhatsApp.

## Ícone do sistema
Gerado por `python scripts/make_icons.py` (requer Pillow) em `src/icons/` (SVG e PNG 32/180/192/512/maskable), com o bastão de Asclépio (símbolo da medicina). O build embute os arquivos no servidor. O mesmo símbolo aparece na tela no lugar das letras "PE" (CSS `.mark`).

## Perfis de acesso
- **Responsável** (dono da clínica): tudo, inclusive convites e página pública.
- **Profissional de saúde** (dentista, médico ou outra área): prontuário completo; médicos têm sinais vitais, CID-10 e evolução SOAP.
- **Secretária/recepção**: agenda, cadastro, plano e financeiro — sem conteúdo clínico (bloqueado no banco por RLS).
- **Paciente**: portal com consultas, teleconsulta (Google Meet), receitas, orçamentos, ficha de saúde e dados de contato.

## Agendamento online e teleconsulta
- Página pública `/#/agendar/<endereco>`: paciente novo se cadastra grátis e marca horário livre (presencial ou online).
- Teleconsulta exige aceite do termo de consentimento (Res. CFM 2.314/2022; Res. CFO-SEC-278/2025), registrado na consulta.
- Cada profissional cadastra a própria sala do Google Meet e os horários de atendimento.

## Arquitetura
- Front-end em JavaScript puro, sem dependências (`src/`).
- `scripts/build.py` junta tudo em um único servidor Bun (`dist/index.tsx`).
- Banco de dados e login: Supabase (Postgres + RLS por clínica). Projeto `pepmh`.
- Hospedagem: Railway (Dockerfile).

## Variáveis de ambiente
- `SUPABASE_URL` – URL do projeto Supabase
- `SUPABASE_KEY` – chave publicável (anon/publishable)

## Desenvolvimento
```bash
python3 scripts/build.py
PORT=4173 bun dist/index.tsx
```

## Ginecologia, obstetrícia e emagrecimento
- Solicitação de exames com grupos de GO (rastreamento, hormônios, fertilidade, pré-natal), emagrecimento/metabolismo e imagem, com pacotes prontos (pré-natal por trimestre, rotina ginecológica, SOP, climatério, infertilidade, DIU, ISTs, emagrecimento, GLP-1, pós-bariátrica).
- Tipos novos: **Pedido de exames de imagem**, **Receita de manipulado** e **Pedido de medicação (aplicação)** (migração `20261107_doc_types_go.sql`; sem ela, gravam como exames/receituário).
- Receituário com listas por área; agonistas de GLP-1 e antimicrobianos marcam "duas vias" sozinhos; lista C1 marca controle especial.

## Assinatura no computador (VIDaaS Connect)
Ao salvar com **Salvar, gerar PDF e assinar** no computador, o PDF é baixado (o Chrome abre direto no Acrobat se configurado), a médica assina com o certificado do VIDaaS Connect e o PEPMH vigia a pasta escolhida (File System Access API, Chrome/Edge) e envia o PDF assinado sozinho. Também aceita arrastar o arquivo. No celular continua o fluxo pelo app VIDaaS.

## Protocolo de obesidade (receituário)
Em **Prescrições → Modelo** (médicos) aparecem os protocolos da clínica: receita do protocolo de obesidade (Pantogar, Buscopan Composto, Lactulona, Ondif 8 mg), suplementos e dieta (dieta hiperproteica de 900 kcal, whey, creatina + Peptstrong, ômega 3) e os dois juntos. A ficha do paciente em Emagrecimento tem atalhos que abrem a receita já preenchida (`#/prescrever?p=<id>&proto=obesidade|suplementos|completo`).

## Mala direta para pacientes ausentes
Marketing → **Pacientes ausentes · mala direta**: escolhe o período sem consulta, edita a mensagem ({nome} vira o primeiro nome), seleciona todos de uma vez e o sistema abre um envio por paciente, com o nome de cada um, o WhatsApp e o e-mail da clínica. Sem celular, vai por e-mail.

## Precificador
Cada procedimento tem botão **Excluir** (na tabela e na edição). Planos que já usaram o procedimento mantêm a descrição e o valor.

## Cadastro obrigatório para liberar a agenda
Todo paciente com conta precisa ter **nome completo, CPF, data de nascimento, e-mail e senha** para marcar consulta (página pública, portal e pedidos de consulta). Quem estiver com a ficha incompleta vê o formulário "Complete seu cadastro" no lugar da agenda; nome, CPF e nascimento só podem ser preenchidos pelo paciente quando estão vazios. O banco também barra o agendamento (migração `20261110_cadastro_obrigatorio_agenda.sql`).

## Senha do paciente pelo responsável
Em **Editar paciente** (e em "Acesso do paciente"), o responsável (master) pode **criar o acesso** de quem ainda não tem conta ou **alterar a senha** de quem já tem. Pode digitar a senha ou deixar em branco para gerar uma provisória — nesse caso o paciente cria uma senha dele no primeiro acesso. A tela já monta a mensagem para enviar pelo WhatsApp ou por e-mail. Usa a função `reset-link` (`mode: create | password`).

## Receita com medicamento livre
Em **Prescrições e laudos → Receita** (e também em manipulado e medicação), o médico escolhe da lista ou escreve qualquer medicamento: nome comercial, princípio ativo ou fórmula, com via de uso, composição da fórmula (um ativo por linha), quantidade e posologia. A checagem de alergia vale para o que for digitado.

## Assinado substitui o não assinado
Quando o PDF assinado de um documento chega (pasta vigiada, arrastar, celular ou "Anexar documento assinado"), o PEPMH:
- confere que o PDF é **daquele documento** pelo código de verificação impresso no rodapé (PDF de outro documento ou de outro paciente é recusado);
- lê a **data e a hora gravadas na assinatura** (signingTime do certificado) e recusa assinatura anterior à emissão ou no futuro (folga de 15 min); a hora fica no prontuário e na verificação pública;
- mantém as conferências de antes (ICP-Brasil, nome de quem emitiu, arquivo não alterado depois de assinado);
- tira do prontuário as cópias idênticas que ficaram sem assinatura (mesmo paciente, tipo, profissional e conteúdo) — vão para "Documentos excluídos" com o motivo;
- em "Anexar documento assinado", se o PDF é de um documento que já está aguardando assinatura, a assinatura entra nele em vez de criar outro;
- na pasta vigiada do computador, apaga o PDF original sem assinatura do mesmo documento (precisa da permissão de leitura e escrita na pasta).
Banco: migração `20261111_assinado_substitui_nao_assinado.sql` (colunas `sig_time`/`sig_signer`, conferência de data no banco e gatilho que exclui as cópias sem assinatura). Sem ela, o sistema faz o mesmo pela tela.

## Cadastro do paciente novo (nov/2026)
No cadastro online (link de cadastro e agendamento) são obrigatórios: **nome completo, data de nascimento, celular com WhatsApp, e-mail, CPF e "Qual tipo de consulta?"** (Ginecologia, Pré-natal, Emagrecimento, Retorno ou Outro — lista em `CONSULT_TYPES`, `src/core.js`). O tipo aparece no cabeçalho do prontuário e pode ser trocado em Editar paciente. O celular com WhatsApp também passou a ser exigido para liberar a agenda. Banco: migração `20261111_cadastro_tipo_consulta_whatsapp.sql` (coluna `consult_type`, exigência do celular e cópia do tipo para a ficha).

## Exames pós-consulta
No prontuário, aba **Exames pós-consulta**: o médico/dentista anexa PDFs ou imagens (resultados, laudos, orientações) com título, data e recado. O paciente vê na área dele, em **Exames pós-consulta** (menu e atalho no início), de qualquer lugar, e recebe um e-mail avisando (um aviso por envio, mesmo com vários arquivos). A equipe vê se o paciente já abriu e pode excluir arquivo errado. A recepção não tem acesso. Migração `20261112_exames_pos_consulta.sql` (tabela `post_consult_exams` e bucket privado `post-consult`).
