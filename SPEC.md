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
| CV Engine | pdf-parse + OpenAI/Anthropic API + PDF-lib/LibreOffice |
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

## Fluxo de Automação (Pipeline de Candidatura)

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

- **LinkedIn**: Busca por palavras-chave + localização, extrai lista de resultados, clica em cada vaga para obter descrição completa
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
- `llmProvider` — `openai` | `anthropic`
- `llmApiKey` — Chave da API
- `linkedinEmail` / `linkedinPassword` — Credenciais LinkedIn
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
