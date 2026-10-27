# Operações — materiais oficiais de 26/10/2026

## Comparação e escopo HML

Referência inspecionada: HML `9f3cace`. Operações estava identificada como “Plano em elaboração”, sem ações cadastradas. A planilha oficial acrescenta seis ações: três de Emergência e três de Impacto JBS. Não houve substituição de ações existentes. Os 42 campos das sete colunas foram comparados com a origem e preservados integralmente, inclusive espaços e acentuação. O Excel original não é publicado.

Responsável: Diego Rodrigo Juliani. Atualização: 26/10/2026. Versão 1 identifica o primeiro cadastro desse plano.

O mapa específico de Operações está disponível dentro do plano, com ampliação de 100% a 400%, rolagem e fechamento acessível. O mapa geral do Terminal permanece disponível. A imagem original foi copiada sem recompressão: 1337 × 752 pixels, 399904 bytes.

- Imagem: `public/assets/operacoes-posicionamento-equipamentos.jpg`
- Conteúdo: `src/content/plans/operacoes.json`
- SHA-256 da imagem: `4690494854f45e79fe6da7fad68e1b6246994fc3419f6770787382e68de42ead`
- SHA-256 do Excel de origem: `ac00705976a143735af313c6d9ea82b01fea94090ab943ee6b49901b5986a591`

## Validação

Testes focados cobrem metadados, todas as ações, categorias, integridade da imagem, zoom, fechamento, falha de carregamento e coexistência com o mapa geral. Verificação visual local em desktop e larguras 768, 390 e 320 pixels, incluindo ampliação e rolagem. Lint, typecheck, build Pages e validação de integridade do artefato integram os gates de publicação.

A lista restrita de arquivos publicáveis admite especificamente a nova imagem e verifica igualdade binária com a origem pública; não foi aberta uma permissão genérica para imagens JPG.

## Promoção

Material destinado primeiro à homologação HML. Incluir na próxima promoção HML → PRD somente após homologação. Nenhuma alteração em PRD, Teams, coleta, níveis, motor, gatilhos ou demais áreas foi realizada por esta entrega. Posicionamento de equipamentos é informação de consulta, sem automação operacional.
