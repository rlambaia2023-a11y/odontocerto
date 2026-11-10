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
