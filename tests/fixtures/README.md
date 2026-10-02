# Proveniência das fixtures

Fixtures não são fallback de produção. Nenhuma contém dados de colaboradores, cookies ou sessões.

- `situacao-atencao.json`, `alertas-null.json`: respostas públicas reais da Defesa Civil em 01/10/2026.
- `rios.json`, `chuvas.json`, `barragens.json`: recortes do `data-page` oficial, com estações e séries completas; removidos props de navegação e histórico adicional não utilizado.
- `epagri-municipio.json`: somente a entrada real Itajaí/4208203 do catálogo `https://ciram.epagri.sc.gov.br/api/prevmuni-server/resources/listaJson/muni`, obtida em 01/10/2026.
- `epagri-itajai.json`: resposta real integral de `https://ciram.epagri.sc.gov.br/api/prevmuni-server/resources/listaJson/prevMuniDia?cdCidade=4208203`, obtida em 01/10/2026; cinco dias, 01–05/10/2026. Não fornece modelo nem emissão.

Variantes nos testes são MOCK explícitos: erros, unidades inválidas, nomes/UF divergentes e metadados regionais futuros. Não se apresentam como dados coletados. Fixture e testes específicos do CPTEC foram removidos; INMET não é fonte.
