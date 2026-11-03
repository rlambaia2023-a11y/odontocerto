# PEPMH

Prontuário eletrônico e gestão de consultório odontológico.

**Módulos:** início com próximo paciente, agenda (dia/semana, conflitos, confirmação por WhatsApp), pacientes, prontuário (resumo automático, anamnese versionada, odontograma permanente/decíduo, evolução, plano de tratamento com orçamento e cobrança, documentos, financeiro, retornos), prescrições e laudos (receituário simples e de controle especial, atestado, declaração, carta, exames, cirurgia, laudo, modelos, checagem de alergia), financeiro, precificador, convênios, relatórios, estoque, marketing (aniversariantes, recall, campanhas), CRM, central de ideias e configurações. Inclui modo demonstração com dados fictícios.

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
