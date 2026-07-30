# LazyJob

> Sistema automatizado de busca de vagas, otimização de currículo e candidatura — 100% local.

LazyJob substitui o trabalho manual repetitivo de caçar vagas em múltiplos portais, ajustar currículo para cada oportunidade e preencher formulários de candidatura. Tudo isso vira um pipeline visual num board Kanban: você só precisa arrastar o card para a coluna certa.

---

## O que ele faz

1. **Busca vagas automaticamente** em LinkedIn, Indeed, Gupy e Glassdoor com os termos e localizações que você configurar
2. **Apresenta tudo num board Kanban** (estilo Jira/Notion) com 6 colunas: Descobertas → Em Análise → Ajustar CV → Candidatar → Candidatada → Recusada
3. **Otimiza seu currículo** para cada vaga: extrai palavras-chave da descrição, destaca skills relevantes e gera um PDF personalizado
4. **Candidata-se automaticamente**: quando você move um card para "Candidatar", o sistema abre o navegador, preenche o formulário da plataforma, anexa o CV otimizado e submete

---

## Board Kanban (fluxo visual)

| Coluna | Ação |
|---|---|
| **Descobertas** | Vagas encontradas pelos scrapers automáticos (cron diário) |
| **Em Análise** | Você avalia se a vaga interessa |
| **Ajustar CV** | O sistema vai gerar um currículo sob medida para aquela vaga |
| **Candidatar** | **Gatilho automático** — ao mover para cá, o pipeline inteiro dispara |
| **Candidatada** | Vagas onde você já se candidatou (com data e link) |
| **Recusada** | Vagas descartadas |

Basta arrastar e soltar os cards entre as colunas.

---

## Como funciona (arquitetura)

```
                         ┌─────────────────┐
                         │   Frontend React │  (http://localhost:5173)
                         │   Board Kanban   │
                         └────────┬────────┘
                                  │ REST API
                         ┌────────▼────────┐
                         │  Backend Express │  (http://localhost:3001)
                         │   + SQLite       │
                         └──┬──────┬──────┬─┘
                            │      │      │
                    ┌───────┘      │      └───────┐
                    ▼              ▼              ▼
             ┌──────────┐  ┌───────────┐  ┌──────────────┐
             │ Scrapers │  │ CV Engine │  │ Apply Engine │
             │ (diário) │  │ (sob demanda)│  │ (fila async) │
             └──────────┘  └───────────┘  └──────────────┘
```

### 1. Scrapers (busca de vagas)

Rodam automaticamente todo dia às 06:00 e 18:00 (configurável). Cada plataforma tem seu próprio módulo:

- **LinkedIn** — busca por `keywords` + `location` na página de empregos
- **Indeed** — busca no Indeed Brasil com os mesmos parâmetros
- **Gupy** — busca no portal da Gupy
- **Glassdoor** — busca no Glassdoor Brasil

As vagas encontradas são salvas no banco SQLite com status `discovered` e aparecem automaticamente na coluna "Descobertas" do board.

Você também pode disparar uma busca manual clicando em "Buscar Vagas" no dashboard.

### 2. CV Engine (otimização de currículo)

Quando uma vaga é movida para "Candidatar", o CV Engine é acionado em 3 etapas:

1. **Parser** — lê seu currículo base em PDF e extrai o texto estruturado em seções (resumo, experiência, educação, habilidades)
2. **Optimizer** — analisa a descrição da vaga, extrai palavras-chave relevantes e reorganiza seu CV priorizando as skills mais alinhadas com a oportunidade. Pode usar IA (OpenAI ou Anthropic) se configurado, ou funciona com regras inteligentes por padrão
3. **Generator** — gera um PDF final do currículo otimizado salvo em `generated-cvs/cv-{id-da-vaga}.pdf`

### 3. Apply Engine (candidatura automática)

Cada plataforma tem seu próprio módulo de automação via **Playwright** (navegador controlado):

- **LinkedIn** — tenta o Easy Apply; se encontrar o botão, clica e avança o formulário automaticamente
- **Indeed** — clica em "Candidatar-se" e anexa o currículo
- **Gupy** — acessa a página da vaga, clica em "Candidatar-se" e anexa o CV
- **Glassdoor** — fluxo similar com detecção do formulário

O navegador roda em modo visível por padrão (para você acompanhar) ou headless se configurado.

---

## Schedulers e Workers

### Scheduler (agendador de buscas)

Definido em `backend/src/services/scheduler.ts`. Usa `node-cron` com dois horários:

```
0 6 * * *   → 06:00 (scrape matinal)
0 18 * * *  → 18:00 (scrape vespertino)
```

Antes de cada execução, o scheduler lê as configurações do banco (`searchQueries` e `searchLocations`) para saber o que buscar. Se não houver configuração salva, usa os defaults: `["developer", "software engineer", "frontend", "backend", "full stack"]` nas localizações `["Brasil", "Remoto"]`.

### Worker de candidatura (fila assíncrona)

Definido em `backend/src/services/apply/apply-worker.ts`. Roda em loop a cada 10 segundos verificando se há vagas com status `applying` no banco. Quando encontra:

1. Pega até 3 vagas pendentes por ciclo
2. Processa cada uma chamando `applyForJob()` (que executa CV Engine + Apply Engine)
3. Aguarda de 5 a 15 segundos entre cada candidatura (delay aleatório anti-bloqueio)
4. Atualiza o status para `applied` em caso de sucesso ou `analyzing` em caso de falha

Isso significa que você pode mover vários cards para "Candidatar" de uma vez que o sistema processa um por vez, em fila.

---

## Configuração

Toda a configuração é feita pela interface web em **Configurações** (`/settings`) e salva no SQLite local.

| Configuração | Descrição | Exemplo |
|---|---|---|
| `cvBasePath` | Caminho absoluto do seu currículo PDF | `/home/user/Documentos/curriculo.pdf` |
| `searchQueries` | Termos de busca (JSON array) | `["developer", "react", "frontend"]` |
| `searchLocations` | Localizações (JSON array) | `["São Paulo", "Remoto", "Brasil"]` |
| `llmProvider` | Provedor de IA para otimização | `openai` ou `anthropic` |
| `llmApiKey` | Chave da API de IA | `sk-...` |
| `autoApplyEnabled` | Auto-apply ao mover para "Candidatar" | `true` ou `false` |
| `browserHeadless` | Navegador invisível nas automações | `true` ou `false` |

---

## Como executar

```bash
# 1. Setup completo (uma vez)
cd ~/Documentos/Personal/new
bash scripts/setup.sh

# 2. Coloque seu currículo na pasta do backend
cp ~/Documentos/meu-curriculo.pdf backend/cv-base.pdf

# 3. Inicie o backend (Terminal 1)
cd backend && npm run dev

# 4. Inicie o frontend (Terminal 2)
cd frontend && npm run dev

# 5. Acesse http://localhost:5173
```

Depois de iniciar, vá em **Configurações**, defina o caminho do seu currículo e os termos de busca. Clique em "Buscar Vagas" no dashboard para começar.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, dnd-kit, React Query, React Router |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Banco | SQLite (zero configuração, dados locais) |
| Automação | Playwright (Chromium headless/visível) |
| CV | pdf-parse, pdf-lib (sem depender de LibreOffice) |
| Agendamento | node-cron |

---

## Vantagens

- **100% local** — seus dados, credenciais e currículo nunca saem da sua máquina
- **Board visual** — gerencie dezenas de vagas de uma vez com drag-and-drop
- **Pipeline automático** — moveu para "Candidatar"? O sistema faz o resto
- **Multi-plataforma** — LinkedIn, Indeed, Gupy e Glassdoor num lugar só
- **CV inteligente** — cada vaga recebe um currículo otimizado com as palavras-chave certas
- **Anti-bloqueio** — delays aleatórios, user-agent rotation, perfil de navegador persistente
- **Sem assinatura** — você só paga se quiser usar IA (OpenAI/Anthropic), mas o sistema funciona sem
- **Open source** — código livre para modificar, adaptar e melhorar

---

## Testes

```bash
# Backend (12 testes)
cd backend && npm test

# Frontend (10 testes)
cd frontend && npm test
```

---

## Licença

MIT
