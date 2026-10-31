# OdontoCerto

Mini aplicativo em formato de ebook para os PDFs de odontologia que você já tem.

## O que está dentro
- **77 livros**, os mesmos PDFs já classificados por matéria (Estomatologia 15, Dentística Restauradora 14, Periodontia 11, Radiologia Odontológica 9, Endodontia 8, Anestesiologia 7, Cirurgia Oral 3, Semiologia 2, Prótese Parcial e Fixa 2, Prótese Total e Removível 2, Anatomia Dental 1, Implantodontia 1, Odontopediatria 1, Ortodontia 1).
- O repositório contém **só o código e o catálogo** (`catalog.json`: título, matéria, páginas, tamanho). Os PDFs (200 MB) e o texto completo **não vão para o GitHub**: eles vivem no volume da Railway (`/app/data`) e são enviados depois do deploy.

## Modo interativo
- Biblioteca com busca por título/matéria, filtro por matéria e ordenação.
- Leitor com visualizador de PDF do navegador: ir para página, anterior/próxima, setas do teclado, zoom e temas claro/sépia/escuro.
- **Busca dentro do livro**, usando o texto já extraído dos PDFs, com salto para a página do resultado.
- **Páginas**: lista com o início de cada página para navegar como sumário.
- **Anotações por página, páginas marcadas e progresso de leitura**, salvos no navegador (localStorage).
- **Continuar lendo**: a biblioteca mostra o último livro e a página onde você parou.
- A biblioteca mostra honestamente quantos PDFs já estão neste servidor (`/api/status`).

## Rodar local
```bash
node server.mjs
# abre em http://localhost:3107
# outra porta: PORT=3108 node server.mjs
```

## Deploy na Railway
1. Projeto a partir deste repositório no GitHub, com deploy automático.
2. Volume montado em `/app/data` (sem volume, os PDFs somem a cada redeploy).
3. Variáveis: `DATA_DIR=/app/data` e, para proteger a biblioteca, `APP_USER` e `APP_PASSWORD` (valores definidos por você no painel, nunca no código).
4. Gerar o domínio público e conferir `/api/health` (livros, PDFs presentes, fonte).
5. Enviar os PDFs, no PC onde `APP_USER`/`APP_PASSWORD` já estão no ambiente:
```bash
node scripts/upload-railway.mjs https://<seu-dominio>.up.railway.app
```
O script pula o que já existe e, no fim, envia o manifesto com o texto para a busca dentro do livro funcionar.

Sem dependências, sem IA. A senha do app é só a que você definir no painel da Railway.
