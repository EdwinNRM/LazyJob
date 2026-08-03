# LazyJob

> Sistema automatizado de busca de vagas, otimização de currículo e candidatura — 100% local.

LazyJob substitui o trabalho manual repetitivo de caçar vagas em múltiplos portais, ajustar currículo para cada oportunidade e preencher formulários de candidatura. Tudo isso vira um pipeline visual num board Kanban: você só precisa arrastar o card para a coluna certa.

---

## O que ele faz

1. **Busca vagas automaticamente** em LinkedIn, Indeed, Gupy e Glassdoor com os termos e localizações que você configurar
2. **Apresenta tudo num board Kanban** (estilo Jira/Notion) com 6 colunas: Descobertas → Em Análise → Ajustar CV → Candidatar → Candidatada → Recusada
3. **Otimiza seu currículo** para cada vaga: usa o **LLM local via Ollama** (padrão `qwen2.5-coder:7b`) para reescrever o CV priorizando as skills e palavras-chave da descrição, e gera um PDF personalizado. Se o Ollama estiver offline, usa fallback por regras inteligentes.
4. **Candidata-se automaticamente**: quando você move um card para "Candidatar", o sistema abre o navegador, preenche o formulário da plataforma, anexa o CV otimizado e submete

---

## Board Kanban (fluxo visual)

| Coluna | Ação |
|---|---|
| **Descobertas** | Vagas encontradas pelos scrapers automáticos (cron diário) |
| **Em Análise** | Você avalia se a vaga interessa |
| **Ajustar CV** | O sistema vai gerar um currículo sob medida para aquela vaga |
| **Candidatar** | Ao mover para cá, a vaga fica pronta para o pipeline — mas **nada é enviado automaticamente**. O auto-apply só dispara se `autoApplyEnabled` estiver ativo (desativado por padrão). |
| **Candidatada** | Vagas onde você já se candidatou (com data e link) |
| **Recusada** | Vagas descartadas |

Basta arrastar e soltar os cards entre as colunas. O sistema usa `@dnd-kit` com `pointerWithin` para detecção de drop em todas as plataformas (mouse, touch e trackpad).

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

> **Nota sobre scrapers e anti-bot:** LinkedIn e Glassdoor bloqueiam scrapers anônimos (exigem login/anti-bot) e podem retornar 0 vagas em modo headless. **Indeed e Gupy funcionam de forma confiável** sem credenciais. O sistema detecta páginas de desafio (Cloudflare/`just a moment`), telas de spam/tráfego incomum e muros de login; quando detecta, aguarda o desafio por alguns segundos e, se não liberar, retorna 0 vagas e registra o motivo nos logs.

**Fluxo de busca e filtragem:**
1. **Salvar tudo** — todas as vagas encontradas são salvas no banco com status `discovered`, sem filtro inicial de localização.
2. **Filtro por LLM** — após o scrape, se um LLM estiver configurado (padrão: Ollama local), ele avalia cada vaga contra as localizações do JSON de configuração e remove as que não fazem sentido (ex.: vaga de São Paulo quando o JSON pede apenas Remoto/São José do Rio Preto). Vagas com localização ambígua ("Não informado") são mantidas por segurança.
3. **Dedup e já candidatadas** — vagas duplicadas (mesmo link ou mesmo título+empresa+plataforma) e vagas com status `applied`/`applying` nunca são re-adicionadas.

As vagas filtradas aparecem no board Kanban e podem ser avaliadas e candidatas manualmente.

Você também pode disparar uma busca manual clicando em "Buscar Vagas" no dashboard.

### 2. CV Engine (otimização de currículo)

Quando uma vaga é movida para "Candidatar" (e o auto-apply está ativo) ou quando você clica em "Candidatar-se" no detalhe da vaga, o CV Engine é acionado em 3 etapas:

1. **Parser** — lê seu currículo base em PDF e extrai o texto estruturado em seções (resumo, experiência, educação, habilidades)
2. **Optimizer** — analisa a descrição da vaga e reescreve o currículo com o **LLM local (Ollama, ex. `qwen2.5-coder:7b`)** priorizando as skills mais alinhadas com a oportunidade. Sem Ollama rodando (ou se a chamada falhar), funciona com regras inteligentes por padrão. Também suporta OpenAI/Anthropic se você preferir (ver Configurações)
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

Antes de cada execução, o scheduler lê as configurações do banco (`searchQueries` e `searchLocations`) para saber o que buscar. Se não houver configuração salva, usa os defaults focados em **Analista de Desenvolvimento de Sistemas Pleno**: `["analista de desenvolvimento de sistemas pleno", "analista de sistemas pleno", "analista desenvolvedor pleno"]` nas localizações `["Remoto", "São José do Rio Preto"]`.

> **Dica de scraping:** os scrapers usam um único navegador reaproveitado entre plataformas e `domcontentloaded` (em vez de `networkidle`, que causava timeouts em sites modernos). Cada plataforma pode bloquear scrapers anônimos (CAPTCHA/login) — verifique os logs em `GET /api/scrape/logs` para saber se a busca falhou ou retornou 0 vagas.

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
| `llmProvider` | Provedor de IA para otimização | `ollama`, `openai`, `anthropic` ou `none` |
| `llmModel` | Modelo a usar no provedor | `qwen2.5-coder:7b` (Ollama) |
| `llmBaseUrl` | URL do servidor LLM | `http://localhost:11434` (Ollama) |
| `llmApiKey` | Chave da API (só OpenAI/Anthropic) | `sk-...` |
| `autoApplyEnabled` | Auto-apply ao mover para "Candidatar" | `true` ou `false` |
| `browserHeadless` | Navegador invisível nas automações | `true` ou `false` |

> **LLM local via Ollama (padrão):** a otimização do CV usa por padrão o **Ollama** com o modelo **`qwen2.5-coder:7b`** em `http://localhost:11434` — 100% local, sem custo e sem enviar seu currículo para a nuvem. Instale com `ollama pull qwen2.5-coder:7b` e deixe o servidor rodando. Se o Ollama não estiver acessível, o sistema cai automaticamente para a otimização por regras locais.

---

## Como executar

> **Importante:** por padrão `autoApplyEnabled` é `false` — o sistema **nunca envia uma candidatura automaticamente**. Você valida vagas, CVs gerados e scrapers antes de clicar em "Candidatar-se".

```bash
# 1. Setup completo (uma vez)
cd lazyjob
bash scripts/setup.sh

# 2. Coloque seu currículo na pasta do backend
cp ~/Documentos/meu-curriculo.pdf backend/cv-base.pdf
# (ou configure o caminho em Configurações → cvBasePath)

# 3. Aplique as configurações padrão (CV, buscas, auto-apply off)
cd backend && npx tsx scripts/seed-defaults.ts

# 4. Inicie o backend (Terminal 1)
cd backend && npm run dev

# 5. Inicie o frontend (Terminal 2)
cd frontend && npm run dev

# 6. Acesse http://localhost:5173
```

> **Pré-requisito (LLM local):** instale e rode o Ollama com o modelo padrão — `ollama pull qwen2.5-coder:7b` e depois `ollama serve` (ou o app de bandeja). O LazyJob usa `http://localhost:11434`. Sem Ollama, a otimização usa regras locais.

### No Windows (sem bash)

```powershell
cd backend; npm install; npx prisma migrate dev --name init; npx tsx scripts/seed-defaults.ts
cd ..\frontend; npm install
# Terminal 1: cd backend; npm run dev
# Terminal 2: cd frontend; npm run dev
```

Depois de iniciar, vá em **Configurações** para revisar o caminho do currículo, os termos de busca e as localizações (padrão: analista pleno, Remoto/São José do Rio Preto). Clique em "Buscar Vagas" no dashboard para testar os scrapers antes de qualquer candidatura.

### Limpeza de vagas antigas

Se o banco contiver vagas de execuções anteriores (antes dos filtros de localização/duplicidade), rode:

```powershell
cd backend; npx tsx scripts/cleanup-jobs.ts
```

Esse script apaga vagas fora das localizações esperadas (Remoto/São José do Rio Preto) e duplicatas (mesmo link ou mesmo `jk` do Indeed / mesmo título+empresa+plataforma), mantendo apenas 1 exemplar por vaga.

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
# Backend (17 testes)
cd backend && npm test

# Frontend (10 testes)
cd frontend && npm test
```

---

## Licença

MIT
