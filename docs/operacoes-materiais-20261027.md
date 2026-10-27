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

## Correções de organização — 27/10/2026

Esta atualização substitui a localização do mapa descrita acima: o posicionamento de equipamentos passa a integrar exclusivamente o botão principal Mapa de Decisões, com seleção dentro do modal. O mapa anterior continua disponível. Removidos o botão específico de Operações e o link interno redundante de retorno dos planos; a navegação principal permanece.

O modal principal Hierarquia de Acionamento recebe a imagem original `fluxo-acionamento-el-nino.png`, com zoom e rolagem. SHA-256: `88e53d64704d7a83c7dcda07060566f92670b80966c5341c29f877c4d6d7a334`, igual à origem, sem recriação do fluxograma.

Base da Ambulância: Canal de rádio 9, mantidos os 20 minutos. CCOS substitui a identificação CCCOM e seis contatos internos foram acrescentados conforme instrução. Nenhum link de ligação ou cópia. No conteúdo das ações TI, somente Eduardo Lamim → Técnico de sobreaviso e Amandus Muller → Jucinei Andrade; metadados de autoria e demais procedimentos preservados.

Validação: 61 testes focados, lint, typecheck, build e integridade Pages. Verificação visual de mapas, zoom, hierarquia, contatos e TI, incluindo telas de 390 e 320 pixels. PRD, Teams, motor e coleta fora do escopo desta correção.
