# Tribes — Landing Page e Feed Social (TP4 · Empreendimentos em Informática)

Landing Page de validação (Smoke Test + Protótipo Interativo) para a rede social **Tribes**, focada em conectar pessoas a partir de interesses em comum e descomplicar a organização de encontros presenciais, híbridos e online.

## O que esta entrega contempla

1. **Proposta de Valor e Diagnóstico do Problema**: contraste direto entre o isolamento/ruído das redes atuais e grupos de mensagens (WhatsApp, Discord, Instagram) e a organização por comunidades em escala humana da Tribes.
2. **Mockup Interativo no Hero**: demonstração funcional do *Card de Encontro Fixado* com confirmação de presença (RSVP) em 1 clique separada do chat.
3. **Explorador Interativo de Tribos (`#explorar`)**: filtragem por hobby/interesse, formato (`Presencial`, `Híbrido`, `Online`), busca textual e selo **Aberto para iniciantes**, com modal detalhado de cada tribo.
4. **Segmentos do Modelo de Negócios (`#segmentos` e `#planos`)**:
   - **Membros Exploradores (B2C Gratuito)**
   - **Organizadores de Comunidades (Freemium / Tribes Organizador Pro)**
   - **Points & Espaços Parceiros Verificados (B2B Local — cafés, ludotecas, arenas, livrarias)**
5. **Captura de Lista de Espera (`#lista-espera`)**: coleta perfil, cidade/região, interesses e principal dor enfrentada, recomendando tribos compatíveis imediatamente após o envio.
6. **Painel de Métricas de Validação do MVP (`/metricas`)**: acompanhamento de sessões visitantes, interações no protótipo, cliques em planos, taxa de conversão, demanda por interesse/segmento e exportação CSV de cadastros locais de demonstração.
7. **Área autenticada da rede social**: feed cronológico de publicações e eventos das tribos do usuário, busca e participação em tribos, criação de comunidades, curtidas e comentários.

## Organização do projeto

- `frontend/`: aplicação Next.js, componentes, assets e configuração do container de frontend.
- `backend/`: API Node.js, acesso ao PostgreSQL e configuração do container de backend.
- `backend/migrations/`: esquema versionado das contas, tribos, participações, publicações/eventos e interações.
- PostgreSQL roda como o serviço `database` do Compose e persiste os dados da aplicação no volume `postgres_data`.
- A Landing Page continua em `/` para visitantes. Cadastro e login levam à área autenticada, que oferece feed, busca e criação de tribos.
- Contas, sessões, tribos, participações, publicações/eventos, curtidas e comentários são persistidos no PostgreSQL. O cadastro da lista de espera continua separado e seus dados pessoais permanecem apenas no `localStorage` do navegador.

## Tecnologias

- Next.js (App Router) + TypeScript
- Node.js HTTP API
- PostgreSQL
- Tailwind CSS v4 + shadcn/ui
- Lucide Icons
- Cadastro por link de e-mail, senhas derivadas por scrypt e sessões próprias com cookie `HttpOnly`

## Como executar com Docker

```bash
docker compose up
```

O Compose inicia quatro containers: `frontend` (porta `4317`), `backend` (porta interna `4000`), `database` (PostgreSQL na porta interna `5432`) e MailHog (interface na porta `8026`, SMTP interno na porta `1025`). O Next.js encaminha as chamadas `/api/*` para a API. Acesse `http://localhost:4317` para a Landing Page; usuários podem criar conta em `/cadastro` ou entrar em `/entrar`. No cadastro, a pessoa informa o e-mail e recebe um link; ao abri-lo, define o nome e a senha, e entra automaticamente no feed. No login, o link **Esqueci minha senha** envia instruções por e-mail para contas cadastradas e informa quando o e-mail não está cadastrado; após escolher a nova senha pelo link, a pessoa também entra automaticamente no feed. Em desenvolvimento, veja os e-mails capturados em `http://localhost:8026`. Após autenticar, a aplicação abre `/feed`, com atalhos para explorar e criar tribos. O painel de validação continua em `/metricas`. As alterações no frontend e no backend são refletidas durante o desenvolvimento.

## Feed e API social

- `GET /api/auth/me`, `POST /api/auth/register` (solicita link por e-mail), `POST /api/auth/register/complete` (cria a conta e inicia a sessão), `POST /api/auth/password-reset` (solicita redefinição de senha por e-mail), `POST /api/auth/password-reset/complete` (altera a senha e inicia uma nova sessão), `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/feed?tribeId=<uuid>&cursor=<cursor>&limit=20` — timeline cronológica paginada por cursor; o filtro de tribo é validado pela associação ativa do usuário.
- `GET /api/tribes?q=<busca>&mine=true` e `POST /api/tribes`; `POST /api/tribes/:id/join` e `DELETE /api/tribes/:id/membership`
- `POST /api/tribes/:id/posts` e `POST /api/tribes/:id/events`
- `POST|DELETE /api/content/:id/like`, `GET|POST /api/content/:id/comments` e `PATCH|DELETE /api/comments/:id`

As migrações são aplicadas no início do backend e registradas em `schema_migrations`. Os links de cadastro e redefinição de senha expiram em 30 minutos, só podem ser usados uma vez, e seus tokens são armazenados como hash. Ao redefinir uma senha, as sessões anteriores são encerradas. O MailHog recebe e-mails apenas no ambiente local; para outros ambientes, configure `SMTP_URL`, `EMAIL_FROM` e `FRONTEND_URL` no backend. Curtidas são únicas por usuário/conteúdo; comentários só podem ser alterados pelo autor. O feed, as tribos e as interações exigem sessão autenticada.

Para executar testes unitários do backend: `docker compose exec backend npm test`. Com o Compose ativo, os testes de integração contra o PostgreSQL e API são executados com `docker compose exec backend npm run test:integration`.

Para encerrar, pressione `Ctrl+C` ou execute `docker compose down` em outro terminal. Os dados do PostgreSQL são mantidos no volume `postgres_data`. Para atualizar dependências depois de alterar os manifests, atualize os volumes de dependências e recrie os containers:

```bash
docker compose down
docker compose run --rm --no-deps frontend npm ci
docker compose run --rm --no-deps backend npm ci
docker compose up --build
```

Para acompanhar os logs dos três serviços, use `docker compose logs -f`. Para apagar também os dados persistidos no banco, execute `docker compose down --volumes`.
