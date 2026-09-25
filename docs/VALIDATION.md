# Validação — 24/09/2026

Revisão executada em Windows, Node.js 22.17.0 e Microsoft Edge headless. Os testes usam dados fictícios e bancos temporários; não houve envio de candidaturas.

## Resultado

| Verificação | Resultado |
| --- | --- |
| Instalação limpa, lockfiles, migrações e seed | Passou |
| Build TypeScript do backend e build React/Vite | Passou |
| Backend: regras, PDF e integração HTTP/SQLite | 47 testes passaram |
| Frontend: componentes e hooks | 10 testes passaram |
| Navegador: desktop e celular | 4 testes passaram |
| npm audit, backend e frontend | 0 vulnerabilidades conhecidas |
| PDF A4 de quatro páginas, primeira e última renderizadas | Conteúdo final preservado; sem cortes observados |
| Instalação local existente | 52 vagas preservadas; configurações anteriores mantidas |
| Servidor de produção: saúde, início e configurações | HTTP 200 |

## Cobertura principal

- Cadastro, duplicação, pesquisa, atualização, remoção e datas de candidatura.
- Validação de URLs, configurações atômicas, rejeição de hosts/origens externos.
- Erro por ausência de currículo e bloqueio de geração concorrente.
- Geração por texto revisado sem exigir PDF-base.
- Preservação de contatos e fatos; respostas inválidas da IA usam texto original.
- Edição cria versão e PDF novos sem alterar a versão anterior.
- Extração de texto, fonte incorporada, paginação e caracteres não suportados.
- Importação RSS/API, normalização de URLs, deduplicação e falhas isoladas.
- Coleta parcial, parâmetros inválidos e reclassificação sem mudar candidaturas.
- Seed idempotente e compatibilidade com chaves antigas nas configurações.
- Interface em 1280 × 720 e 390 × 844; teclado, formulários, revisão, download, histórico, registro e remoção.

## Fontes externas

Consulta pública de diagnóstico com termo “desenvolvedor”, sem autenticação:

| Fonte | Resultado observado |
| --- | --- |
| LinkedIn | 14 anúncios extraídos |
| Gupy | 12 anúncios extraídos |
| Nerdin | 8 anúncios extraídos |
| Indeed | HTTP 403; solicitação bloqueada |
| Glassdoor | HTTP 403; proteção de acesso |

Essas contagens representam anúncios extraídos no diagnóstico, antes de revisão de elegibilidade. A disponibilidade depende dos sites. Não é possível garantir coleta permanente. RSS/Atom e APIs foram verificados com fixtures controladas; cada URL externa precisa corresponder ao formato documentado.

## Limites da validação

- Teste local no Windows. O workflow inclui Ubuntu, mas o resultado remoto deve ser consultado no GitHub Actions.
- IA foi validada com respostas simuladas e fallback; não foram usados créditos, chaves pessoais ou currículo real em provedores externos.
- A classificação é heurística; localidades, descrições incompletas e restrições de contratação exigem revisão.
- PDF com imagem exige OCR externo; fontes não cobrem todos os alfabetos ou emojis.
- Aplicação local de usuário único; não é um serviço público com autenticação.

## Reprodução

Na raiz: npm run setup, npm run browser:install e npm run check.

No Windows com Edge instalado, defina PLAYWRIGHT_CHANNEL=msedge antes dos testes para dispensar o download do Chromium. Testes de navegador usam a porta 4317; o servidor normal usa 3001.

O screenshot no README contém somente empresas e vagas fictícias. O currículo-base pessoal foi retirado do rastreamento Git e mantido no disco local; essa alteração não reescreve o histórico anterior.
