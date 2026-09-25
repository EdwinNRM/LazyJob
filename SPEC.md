# LazyJob — comportamento implementado

Aplicação local de usuário único para organizar vagas, revisar currículos e registrar candidaturas manuais.

## Fluxo

Etapas: discovered, analyzing, adjusting_cv, ready_to_apply, applied e rejected. Entrar em Ajustar CV inicia uma geração. Marcar Candidatada registra a data; repetir preserva a data original; sair da etapa limpa a data.

A classificação é independente da etapa. Reclassificar não desfaz candidaturas. Vagas excluídas ficam armazenadas e podem ser exibidas.

## Currículos

Texto revisado tem prioridade sobre PDF-base. O parser preserva linhas e rejeita PDFs sem texto. Sem IA, o conteúdo é preservado. Com IA, o modelo retorna apenas uma permutação validada das seções; nome e contatos permanecem no início.

Cada edição cria um CvVersion e PDF, mantendo a versão anterior. Versão e vínculo ativo usam a mesma transação. Há bloqueio de geração concorrente por vaga; falhas aparecem no cartão.

O relatório compara palavras-chave incluindo C#, C++ e .NET. Não simula um ATS ou decisões de recrutadores.

## Coletas

Uma execução por processo, compartilhada entre API e agendador. Estados: running, completed, partial e failed. Cada fonte registra resultado ou falha. O total representa novas vagas após deduplicação. Falhas de navegador não bloqueiam feeds.

Dados recebidos são validados, URLs normalizadas e datas inválidas descartadas. Vagas ambíguas ficam pendentes. Coleta não acessa contas nem envia candidaturas.

## Persistência

SQLite via Prisma, migrações versionadas e seed que cria somente chaves ausentes. Express serve API e build React no localhost. Um processo por banco. Reiniciar marca trabalhos interrompidos como falhas recuperáveis.

## Validação e histórico

Testes unitários, integração HTTP/SQLite e navegador em desktop/celular. Consulte [VALIDATION.md](docs/VALIDATION.md).

O plano anterior foi preservado em [SPEC-legacy.md](docs/SPEC-legacy.md) como histórico. Suas partes sobre candidatura automática estão superadas.
