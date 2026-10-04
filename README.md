# Monitoramento El Niño — JBS Terminais

Painel estático de apoio à decisão em Itajaí/SC. Fases 01–07.1 preservadas; Fase 08 prepara atualização operacional automatizada e GitHub Pages. Homologação final de falhas/HML e refinamento visual continuam fora desta etapa.

Defesa Civil + Epagri/Ciram → coletores aprovados → normalização → motor com memória anterior → status.json validado → frontend React. Supabase mantém exclusivamente o Impacto JBS manual. OpenLayers apresenta as bases Aérea, Cartográfica e Simplificada, bairros, estações, exposição agregada e geometrias históricas locais.

## Executar

Node.js 24:

```sh
npm ci
npm run dev
npm run data:validate
npm run automation:update
npm test
npm run lint
npm run pages:build
npm run pages:validate
npm run pages:preview
```

O preview de Pages usa `http://127.0.0.1:4173/el-nino-jbs-hml/`. Build convencional: `npm run build`. A coleta histórica continua exclusivamente manual: `npm run map:collect`.

## Automação e publicação

O workflow operacional tem frequência-alvo de 15 minutos e execução manual; preserva a memória do motor no snapshot versionado. CI valida código e artefato. O deploy é habilitado explicitamente, sem declarar homologação de produção.

Consulte o [guia de operação](docs/operacao.md) para configurar Pages, permissões, variáveis públicas, logs, histerese entre ciclos, falhas e recuperação. Apenas URL Supabase e publishable key são públicas; PIN, service_role e credenciais administrativas nunca pertencem ao frontend.

## Entregas e regras preservadas

- [Fase 08 — implementação, testes e Definition of Done](docs/fase-08-implementacao.md).
- [Fase 07.1 — mapa geoespacial](docs/fase-07-1-implementacao.md).
- [Fase 07 — baseline funcional](docs/fase-07.md).
- [Fase 06 — Dashboard e Monitoramento](docs/fase-06.md).
- [Fase 05 — Impacto JBS e Supabase](docs/fase-05.md).
- [Fase 04 — base territorial e agregados](docs/fase-04.md).
- [Fase 03 — motor e histerese](docs/fase-03.md).

Sem dado não significa Normalidade. Histórico não representa condição atual. Exposição não significa colaborador afetado. Vias históricas não indicam bloqueio atual. O mapa não cria relação DC → bairro e não modifica o alerta. São preservados 292 residentes em Itajaí e 88 fora, sem dados individuais. Cenários/HAND/10–400 não fazem parte da interface atual.
