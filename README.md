# PEPMH

Prontuário eletrônico e gestão de consultório odontológico.

**Módulos:** início com próximo paciente, agenda (dia/semana, conflitos, confirmação por WhatsApp), pacientes, prontuário (resumo automático, anamnese versionada, odontograma permanente/misto/decíduo com CPO-D, periograma, exame clínico extra/intraoral, evolução, plano de tratamento com orçamento e cobrança, documentos, financeiro, retornos), prescrições e laudos (receituário simples e de controle especial, atestado, declaração, carta, exames, cirurgia, laudo, modelos, checagem de alergia), financeiro, precificador, convênios, relatórios, estoque, marketing (aniversariantes, recall, campanhas), CRM, central de ideias e configurações. Inclui modo demonstração com dados fictícios.

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
