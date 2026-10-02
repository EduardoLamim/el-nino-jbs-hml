# Fase 05 — Impacto JBS manual

Implementação local validada em 02/10/2026. **Homologação remota pendente:** migration e Edge Function não foram publicadas. Não havia CLI Supabase, vínculo local ao projeto, nem variáveis frontend configuradas. Nenhuma credencial administrativa foi utilizada. A Fase 06 e Mobilidade Atual não foram implementadas.

## Comportamento entregue

Impacto JBS representa impacto físico confirmado no Terminal, infraestrutura crítica, área operacional ou acesso operacional imediato. É uma camada manual separada: o motor ambiental continua produzindo somente os quatro níveis anteriores. A interface mínima mostra o impacto em preto, a condição ambiental subjacente, ativação e encerramento com responsável, observação opcional e PIN transitório.

Os cinco tipos são validados no domínio, na Edge Function e na constraint PostgreSQL. O cliente só confirma uma operação depois da resposta válida do servidor. Encerramento exige também o UUID observado ao abrir o formulário, para impedir que um formulário antigo encerre outro impacto. Repetir o encerramento do mesmo registro já encerrado, sem outro ativo, retorna estado inativo; outro ativo resulta em conflito. Timeout pode ocorrer após commit: a interface preserva o estado conhecido até reconciliar, sem afirmar sucesso nem repetir escrita automaticamente.

## Persistência, RLS e autorização

Migration: `supabase/migrations/202610020001_impactos_jbs.sql`.

- `jbs_private.impactos_jbs`: histórico completo, UUID, timestamps server-side, responsáveis, observações e fechamento sem DELETE. Índice único parcial `impactos_jbs_um_ativo` garante no máximo um registro com `encerrado_em IS NULL`. A RPC também serializa operações com bloqueio da linha pública.
- `public.impacto_jbs_publico`: uma linha permanente sanitizada, com `id`, `revisao`, `ativo`, `impacto_id`, `tipo`, `acionado_em`, `atualizado_em`. Responsáveis, observações e histórico não são públicos.
- RLS habilitada em todas as tabelas. A policy `impacto_publico_leitura` permite somente SELECT da projeção pública a `anon`/`authenticated`. Não há grants nem policies de escrita para esses papéis. O schema privado tem acesso revogado.
- RPCs `jbs_impacto_tentativa` e `jbs_impacto_escrever`: EXECUTE concedido a `anon`/`authenticated`, mas cada chamada exige uma credencial exclusiva do backend. Sem ela, a chamada é rejeitada antes de qualquer escrita. Funções SECURITY DEFINER usam `search_path` vazio e referências qualificadas.

Como o escopo proíbe credenciais administrativas, a Edge usa a publishable key e **uma credencial aleatória restrita a estas RPCs**, `JBS_IMPACT_BACKEND_TOKEN`. Ela não é uma secret key administrativa do Supabase e não concede acesso geral ao banco. Apenas seu SHA-256 fica em `jbs_private.backend_credential`; o token fica nos secrets da Edge. O PIN nunca é enviado ao banco. Sem provisionamento dessa credencial, a escrita falha fechada.

A separação de grants e policies segue a [documentação RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security). A linha sanitizada permanente permite publicar também o encerramento sem expor histórico ou depender da remoção de uma linha que deixou de satisfazer uma policy.

## Edge Function e PIN

`impacto-jbs` aceita POST com `action=ativar|encerrar`, valida allowlist de campos, tamanho do corpo, tipo, responsável, observação e UUID de encerramento. Timestamps do cliente são rejeitados. Compara digests do PIN recebido e do secret `JBS_IMPACT_PIN` no servidor, percorrendo todos os bytes. Retorna apenas a projeção pública e erros controlados. Não registra corpo, PIN ou credenciais. Também rejeita cópia literal do PIN nos campos livres antes da persistência.

O campo PIN é transitório, limpo no envio/cancelamento, sem persistência no estado React, cache ou banco. Os testes geram PINs efêmeros aleatórios, sem usar o valor operacional. Não há captura de payload em logs da aplicação; na homologação, verificar também configuração de observabilidade externa e não habilitar captura de corpos.

Há limite global persistido de 20 tentativas válidas estruturalmente por minuto, anterior à comparação do PIN. Não armazena IP nem payload. Esse limite compartilhado pode temporariamente bloquear operadores legítimos se consumido por outro cliente; CORS e publishable key não substituem a autenticação pelo PIN.

`verify_jwt=false` é intencional: publishable keys não são JWTs. A função verifica a chave pública recebida, origem configurada e o PIN; não usa sessão de usuário. Referências: [migração de API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys) e [autenticação em Edge Functions](https://supabase.com/docs/guides/functions/auth).

## Realtime, cache e falhas

O cliente assina `postgres_changes` da linha pública, consulta o estado inicial e consulta novamente ao conectar/reconectar. Eventos apenas disparam nova leitura autoritativa. Revisões antigas não sobrescrevem revisões novas. Reconciliação adicional a cada **60 segundos** corrige eventos perdidos. A migration inclui a tabela na publicação `supabase_realtime` quando ela existe; a presença deve ser verificada em HML, conforme [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

Cache local estrito Zod contém somente a projeção pública, versão e timestamp da última confirmação. Cache inválido ou timestamp futuro é descartado; cache válido sempre inicia degradado. Não inclui PIN, responsável ou observação. A chave é isolada pelo projeto HML. Falha de armazenamento não invalida uma resposta do servidor.

| Situação | Resultado |
| --- | --- |
| Servidor confirma ausência | Inativo confirmado |
| Servidor confirma impacto | Impacto ativo confirmado |
| Falha com ativo conhecido, inclusive após reload | Mantém preto e informa degradação/última confirmação |
| Cliente novo sem confirmação | Desconhecido; não assume inativo |
| Falha de ativação | Não cria impacto local |
| Falha de encerramento | Preserva impacto conhecido |

## Deploy HML — pendente

Destino exclusivo: `ufeahglxwygvlugfsopi`. O `project_id` de `config.toml` identifica o projeto local e **não comprova vínculo remoto**. Não executar deploy em outro projeto.

1. Autenticar pela interface oficial do Supabase e conferir o ref na página do projeto. Aplicar a migration uma única vez no SQL Editor desse projeto, sem fornecer senha de banco à aplicação. Alternativamente, usar o fluxo de migrations de uma instalação já autenticada e claramente vinculada ao ref autorizado. Não reexecutar a migration sobre objetos existentes; consultar o histórico de migrations primeiro.
2. Gerar fora do repositório um token criptograficamente aleatório de pelo menos 32 bytes (recomendado: 48 bytes em hexadecimal). Guardá-lo em um gerenciador de secrets. Calcular SHA-256 dos caracteres exatos do token em UTF-8, sem newline. Inserir somente o hash de 64 caracteres hexadecimais no SQL Editor:

```sql
insert into jbs_private.backend_credential(singleton, token_sha256)
values (true, '<sha256_hex_do_token>')
on conflict (singleton) do update set token_sha256 = excluded.token_sha256;
```

3. Configurar pela interface de secrets, fora do repositório: `JBS_IMPACT_PIN`, `JBS_IMPACT_BACKEND_TOKEN`, `JBS_SUPABASE_PUBLISHABLE_KEY` e `JBS_ALLOWED_ORIGIN`. A origem é exata (protocolo, domínio e porta quando houver; sem caminho/barra final). `SUPABASE_URL` é fornecida pelo ambiente da função. Para CLI, somente o modelo de comando é documentado abaixo; usar entrada segura/gerenciador de secrets para evitar valores no histórico do shell:

```sh
supabase secrets set JBS_IMPACT_PIN=<valor>
```

Esse comando pressupõe vínculo confirmado ao ref HML. Não gravar valores em scripts, fixtures, arquivos versionados ou variáveis VITE. A rotação do token exige atualizar hash privado e secret da Edge; durante divergência as operações falham fechadas.

4. Em ambiente autenticado e autorizado, publicar:

```sh
supabase functions deploy impacto-jbs --project-ref ufeahglxwygvlugfsopi --no-verify-jwt
```

5. Confirmar a publicação e os grants no SQL Editor:

```sql
select schemaname, tablename from pg_publication_tables
where pubname = 'supabase_realtime' and tablename = 'impacto_jbs_publico';
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'impacto_jbs_publico';
```

Se a publicação não existir, habilitar Realtime no projeto; se a tabela não estiver publicada, adicioná-la pela configuração oficial de replicação. Não publicar o schema privado. Confirmar que `anon` e `authenticated` possuem somente SELECT da projeção.

6. Configurar `VITE_SUPABASE_URL=https://ufeahglxwygvlugfsopi.supabase.co` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente de build, usando `.env.example` como referência, e reconstruir/publicar o frontend. A key vem exclusivamente do ambiente; o cliente rejeita URL divergente do HML. Sem configuração, mostra estado desconhecido ou cache degradado.
7. Validar dois navegadores: ativar, receber mudança no segundo, recarregar, encerrar e verificar histórico no SQL Editor. Testar PIN inválido, concorrência entre clientes, tentativa de escrita direta e encerramento de formulário antigo. Interromper Realtime e verificar recuperação pelo polling; interromper a rede e confirmar preservação do preto; repetir com navegador sem cache e confirmar desconhecido. Não copiar corpos de requisição nem secrets para evidências.

Não houve deploy, configuração de secrets, escrita remota ou alteração no Supabase nesta execução. A persistência real e a entrega de eventos entre navegadores ainda precisam dessa homologação.

## Arquivos desta implementação

Criados:

- `.env.example`
- `supabase/config.toml`, `supabase/tsconfig.json`
- `supabase/migrations/202610020001_impactos_jbs.sql`
- `supabase/functions/deno.d.ts`
- `supabase/functions/impacto-jbs/index.ts`, `handler.ts`
- `src/domain/impact.ts`, `src/services/impact.ts`, `src/components/ImpactoJbs.tsx`
- `tests/impact.test.ts`, `tests/impact-edge.test.ts`, `tests/impact-db.test.ts`, `tests/impact-ui.test.tsx`, `tests/impact-integration.test.ts`
- `docs/fase-05.md`

Alterados: `.gitignore`, `package.json`, `package-lock.json`, `src/App.tsx`, `src/styles.css`, `README.md`. Alterações intencionais limitadas à integração da interface mínima, dependências, comandos de validação e documentação. Nenhum contrato central ou teste anterior foi removido/alterado. O workspace não possui repositório Git; o inventário descreve as operações realizadas, e a preservação dos artefatos críticos foi verificada por hashes.

## Validação e Definition of Done

Resultado local: **135 testes aprovados em 11 arquivos**, incluindo os 106 anteriores e 29 novos. `npm run lint` e `npm run build` aprovados; o build inclui typecheck do frontend e da Edge Function. Instalação das dependências informou zero vulnerabilidades na auditoria npm.

Testes cobrem contratos, cinco tipos, validação negativa, PIN inválido, sanitização, privilégios anon/authenticated, timestamps SQL, índice parcial, operações concorrentes enfileiradas, histórico, fechamento idempotente e conflito de ID antigo. Incluem falhas, cache, UI sem atualização otimista, Realtime simulado e reconciliação de evento perdido. Integração local atravessa store → handler Edge real → funções SQL reais em PGlite, com dois clientes. PGlite valida PostgreSQL localmente; não substitui concorrência distribuída, gateway Edge/Deno e Realtime reais do HML.

| DoD | Estado |
| --- | --- |
| 1–5: migration, unicidade, tipos, RLS, PIN server-side | Implementado e testado localmente |
| 6: PIN fora de bundle, persistência e logs | Fluxo sem persistência/log de PIN; secret operacional não configurado; revisar observabilidade HML |
| 7–8: ativação/encerramento persistidos no Supabase | **Pendente de deploy e teste HML**; persistência SQL local validada |
| 9–10: histórico e consulta ativa | Implementado e testado localmente; confirmar HML |
| 11: Realtime | Preparado e comportamento testado; entrega real pendente |
| 12–16: reconciliação, falhas, retenção, desconhecido, independência ambiental | Aprovado localmente |
| 17–18: testes, lint, typecheck, build | Aprovado |
| 19: documentação HML | Entregue |

**A Fase 05 não é declarada integralmente homologada.** Faltam provisionamento autorizado, secrets, aplicação da migration, deploy da função/frontend e verificações reais descritas acima. O trabalho para nesta fase.

## Integridade das fases anteriores

SHA-256 comparado com o snapshot anterior à implementação. Os sete arquivos permaneceram idênticos; não houve nova coleta nem regeneração territorial nesta fase.

| Arquivo | SHA-256 antes = depois | Resultado |
| --- | --- | --- |
| src/domain/hydrology.ts | D722BCD06AA14074652F2978EACF7E2288EB15F90A23D3EC9FF5A998AD41D861 | Igual |
| src/domain/alert-engine.ts | F62B29D1FFD848FABE6ACE588261D79666EFC30A8D82A5D72D5F94C6DA46BA57 | Igual |
| src/domain/contracts.ts | 9CA3D3689DAAA6D361B0FC166EDDBA0D3210AE21576ACEC17AAB4F8DC5C2931F | Igual |
| scripts/collectors/epagri.ts | 8F972DC77EC586D433074B716A2D6F19AE007874541CC6D3A55A4537CB37406D | Igual |
| public/data/status.json | 8702E180296545F8CB6CDBADC796AAE6EE629CF0F92934B680E4BD6134125406 | Igual |
| public/data/territorio.json | 9D1FDF8D86B04C4BAB56209EFD889FFDE05202ECC09362F1B866E91BD47DE222 | Igual |
| public/data/bairros.geojson | 60018B85B6BDD3B8711905F679BCC6C49CE138FD13610D0DAB753519612480FA | Igual |
