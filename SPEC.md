# LazyJob — Sistema Automatizado de Busca e Candidatura de Vagas

## Visão Geral

LazyJob é um sistema full-stack local que automatiza o fluxo completo de busca de vagas de emprego, ajuste de currículo e candidatura. Utiliza um board Kanban estilo Jira para gerenciar visualmente o pipeline de oportunidades.

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, dnd-kit, React Query |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Banco | SQLite |
| Automação | Playwright |
| CV Engine | pdf-parse + Ollama (qwen2.5-coder:7b) / OpenAI / Anthropic + PDF-lib |
| Agendamento | node-cron |

## Estrutura do Projeto

```
lazyjob/
├── frontend/
│   ├── src/
│   │   ├── components/kanban/
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   └── JobCard.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── JobDetail.tsx
│   │   ├── hooks/
│   │   │   └── useJobs.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── jobs.ts
│   │   │   ├── settings.ts
│   │   │   └── scraper.ts
│   │   ├── services/
│   │   │   ├── scraper/
│   │   │   │   ├── index.ts
│   │   │   │   ├── linkedin.ts
│   │   │   │   ├── indeed.ts
│   │   │   │   ├── gupy.ts
│   │   │   │   └── glassdoor.ts
│   │   │   ├── cv-engine/
│   │   │   │   ├── index.ts
│   │   │   │   ├── parser.ts
│   │   │   │   ├── optimizer.ts
│   │   │   │   └── generator.ts
│   │   │   ├── apply/
│   │   │   │   ├── index.ts
│   │   │   │   ├── linkedin-apply.ts
│   │   │   │   ├── indeed-apply.ts
│   │   │   │   ├── gupy-apply.ts
│   │   │   │   └── glassdoor-apply.ts
│   │   │   └── scheduler.ts
│   │   ├── workers/
│   │   │   └── apply-worker.ts
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── scripts/
│   │   └── setup.sh
│   ├── package.json
│   └── tsconfig.json
└── scripts/
    └── setup.sh
```

## Modelo de Dados (Prisma)

### Job
- `id` (UUID) — identificador único
- `title` — título da vaga
- `company` — nome da empresa
- `platform` — plataforma de origem (linkedin, indeed, gupy, glassdoor)
- `url` — link original da vaga (único)
- `description` — descrição completa
- `salary` — faixa salarial (opcional)
- `location` — localização
- `status` — coluna no Kanban: `discovered | analyzing | adjusting_cv | applying | applied | rejected`
- `columnOrder` — ordem dentro da coluna
- `appliedAt` — data da candidatura
- `cvPath` — caminho do CV personalizado gerado
- `notes` — anotações do usuário
- `createdAt` / `updatedAt` — timestamps

### Settings
- `id` (UUID)
- `key` — chave da configuração
- `value` — valor (JSON)
- `updatedAt` — timestamp

### ScrapeLog
- `id` (UUID)
- `platform` — plataforma
- `query` — termo buscado
- `resultsCount` — quantidade de resultados
- `success` — sucesso ou falha
- `errorMessage` — mensagem de erro (se houver)
- `createdAt` — timestamp

## API REST

### Jobs
| Método | Rota | Descrição |
|---|---|---|
| GET | /api/jobs | Listar vagas (filtro por status, plataforma, query) |
| GET | /api/jobs/:id | Detalhes de uma vaga |
| POST | /api/jobs | Criar vaga manualmente |
| PATCH | /api/jobs/:id | Atualizar vaga (mover coluna, alterar dados) |
| DELETE | /api/jobs/:id | Remover vaga |
| POST | /api/jobs/:id/apply | Gatilho de candidatura automática |

### Scrapers
| Método | Rota | Descrição |
|---|---|---|
| POST | /api/scrape/run | Executar scrape manual |
| GET | /api/scrape/status | Status do último scrape |
| GET | /api/scrape/logs | Histórico de scrapes |

### Settings
| Método | Rota | Descrição |
|---|---|---|
| GET | /api/settings | Listar configurações |
| PUT | /api/settings/:key | Atualizar configuração |

## Board Kanban — Colunas

1. **Descobertas** — Vagas encontradas pelos scrapers automáticos
2. **Em Análise** — Vagas sendo avaliadas pelo usuário
3. **Ajustar CV** — Vagas que precisam de currículo personalizado
4. **Candidatar** — **Gatilho automático**: ao mover para cá, o sistema inicia o pipeline de candidatura
5. **Candidatada** — Vagas já aplicadas
6. **Recusada/Arquivada** — Vagas descartadas

## Plano: Ajustar CV (Coluna "Ajustar CV")

### Problema
Atualmente, mover um card para "Ajustar CV" não dispara nenhuma ação. O CV Engine só é chamado quando o card chega em "Candidatar" (auto-apply). O usuário quer poder ajustar o CV manualmente antes de candidatar.

### Solução
Quando um card é movido para `adjusting_cv`, o backend dispara o CV Engine para gerar o PDF otimizado e salva o caminho em `cvPath`. O status muda para `adjusting_cv`. O usuário pode revisar o CV gerado no modal de detalhes e decidir se candidatar (mover para "Candidatar") ou recusar.

### Fluxo atualizado
```
1. Usuário move card para "Ajustar CV"
2. Backend recebe PATCH /api/jobs/:id (status: adjusting_cv)
3. CV Engine é acionado (mesmo fluxo de "Candidatar"):
   a. Parse do CV base (PDF)
   b. Extração de skills e experiência
   c. Análise da descrição da vaga (via LLM local Ollama)
   d. Geração de CV otimizado (PDF) em generated-cvs/cv-{id}.pdf
4. Status atualizado para "adjusting_cv", cvPath salvo
5. Usuário revisa o CV no modal de detalhes
6. Usuário decide: mover para "Candidatar" (dispara auto-apply) ou "Recusada"
```

### Implementação necessária
- `backend/src/routes/jobs.ts`: PATCH handler para `adjusting_cv` deve chamar `processCV` e salvar `cvPath`
- `backend/src/services/apply/index.ts`: refatorar `applyForJob` para extrair a lógica de geração de CV em uma função reutilizável `generateOptimizedCV` chamada tanto por `adjusting_cv` quanto por `applying`
- `frontend/src/pages/Dashboard.tsx`: ao abrir o modal de detalhes de uma vaga em `adjusting_cv`, mostrar o botão "Abrir CV Gerado" com link para o PDF

### Critérios de aceite
- Mover para "Ajustar CV" gera o PDF otimizado sem candidatar
- O PDF fica disponível para download/revisão no modal de detalhes
- Mover de "Ajustar CV" para "Candidatar" dispara o auto-apply normalmente
- Se o LLM estiver offline, usa fallback por regras locais (comportamento atual)

```
1. Usuário move card para coluna "Candidatar"
2. Backend recebe PATCH /api/jobs/:id (status: applying)
3. CV Engine é acionado:
   a. Parse do CV base (PDF)
   b. Extração de skills e experiência
   c. Análise da descrição da vaga (via LLM)
   d. Geração de CV otimizado (PDF)
4. Apply Engine é acionado:
   a. Playwright abre navegador (perfil salvo)
   b. Navega até a página de candidatura
   c. Preenche formulário
   d. Anexa CV personalizado
   e. Submete
5. Status atualizado para "applied" (ou erro com logs)
```

### Scrapers

Cada scraper utiliza Playwright para navegar e extrair vagas:

- **LinkedIn**: Busca por palavras-chave + localização via URL com `f_WT=2` (remote filter) e `geoId=106057199` (Brasil) para vagas remotas; usa `location=` param para buscas por cidade. Clica em cada vaga para obter descrição completa. **Problema conhecido**: LinkedIn frequentemente bloqueia scrapers anônimos exigindo login. Mesmo com modo não-headless, pode retornar 0 vagas sem credenciais de sessão. Solução planejada: suporte a cookies de sessão salvos nas configurações (`linkedinSessionCookie`) para contornar o bloqueio anti-bot.
- **Indeed**: Busca por palavras-chave, extrai resultados com paginação
- **Gupy**: Busca por palavras-chave no portal Gupy
- **Glassdoor**: Busca por palavras-chave + localização

### CV Engine

1. **Parser**: Extrai texto do PDF base (pdf-parse) e estrutura em seções (resumo, experiência, educação, habilidades)
2. **Optimizer**: Envia descrição da vaga + CV para LLM (OpenAI/Anthropic) e recebe versão otimizada priorizando skills relevantes
3. **Generator**: Converte CV otimizado para PDF final usando PDF-lib ou conversão via LibreOffice

### Apply Engine

Cada plataforma tem seu próprio módulo de automação:
- LinkedIn Easy Apply (quando disponível)
- Indeed Quick Apply
- Gupy (formulário completo)
- Glassdoor (aplicação rápida)

Estratégias anti-detecção:
- User-agent rotation
- Delays aleatórios entre ações
- Mouse movement simulation
- Perfil de navegador persistente (cookies salvos)
- Detecção de CAPTCHA com notificação ao usuário

## Configurações do Usuário

- `cvBasePath` — Caminho do arquivo PDF do currículo base
- `llmProvider` — `ollama` | `openai` | `anthropic` | `none`
- `llmModel` — Nome do modelo (ex.: `qwen2.5-coder:7b` para Ollama)
- `llmBaseUrl` — URL do servidor LLM (padrão: `http://localhost:11434`)
- `llmApiKey` — Chave da API (só OpenAI/Anthropic)
- `linkedinSessionCookie` — Cookie de sessão do LinkedIn para contornar anti-bot (opcional)
- `indeedEmail` / `indeedPassword` — Credenciais Indeed
- `gupyEmail` / `gupyPassword` — Credenciais Gupy
- `glassdoorEmail` / `glassdoorPassword` — Credenciais Glassdoor
- `searchQueries` — Lista de queries de busca (JSON)
- `searchLocations` — Lista de localizações
- `autoApplyEnabled` — Boolean para ativar/desativar auto-apply
- `browserHeadless` — Boolean para modo headless do Playwright

## Testes

### Backend
- Testes unitários para serviços (Jest)
- Testes de API (Supertest)
- Testes de scrapers com mocks (npx playwright test)

### Frontend
- Testes de componentes (React Testing Library + Vitest)
- Testes de integração (Vitest)

## Setup e Execução

```bash
# 1. Clonar / entrar no diretório
cd lazyjob

# 2. Instalar dependências
cd backend && npm install
cd ../frontend && npm install
cd ..

# 3. Configurar banco
cd backend && npx prisma migrate dev --name init

# 4. Copiar CV base
cp ~/meu-curriculo.pdf backend/cv-base.pdf

# 5. Configurar credenciais (via API ou settings.json)
#    http://localhost:3001/api/settings

# 6. Iniciar
# Terminal 1:
cd backend && npm run dev
# Terminal 2:
cd frontend && npm run dev
```

## Variáveis de Ambiente

```
PORT=3001                    # Porta do backend
VITE_API_URL=http://localhost:3001/api
DATABASE_URL=file:./dev.db
LLM_API_KEY=sk-...
BROWSER_HEADLESS=false
```

## Segurança

- Credenciais armazenadas localmente em SQLite (máquina do usuário)
- LLM API key configurada via settings (não em .env commitado)
- Perfil de navegador isolado
- Modo headless configurável (recomendado false para debugging)
