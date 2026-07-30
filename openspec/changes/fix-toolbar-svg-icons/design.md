## Context

A API `OBR.tool.create`/`createAction` recebe `ToolIcon.icon` como string. No SDK 3.1.0, `normalizeIconPaths` apenas converte caminhos relativos em URLs absolutas; não converte nem modifica o conteúdo da imagem. Portanto, a hipótese de corrupção dentro do SDK não é sustentada pelo código instalado.

O problema está nos assets entregues. O pacote `rpg-awesome` é uma fonte de ícones: os paths oficiais estão em `fonts/rpgawesome-webfont.svg`, com `units-per-em="1024"`, `ascent="960"` e eixo Y de fonte. Os SVGs atuais em `public/icons/rpg-awesome` usam viewBox 512 e paths simplificados que não correspondem aos glifos oficiais (por exemplo, `crossed-swords`), indicando uma conversão manual incorreta. As URLs absolutas atuais são adequadas para o iframe/host do Owlbear e devem ser mantidas.

## Goals / Non-Goals

**Goals:**

- Publicar cada ícone curado como SVG standalone válido e fiel ao glifo RPG Awesome correspondente.
- Entregar ao Owlbear URLs absolutas HTTP(S), mantendo assets estáticos disponíveis no build.
- Padronizar viewport, transparência e pintura monocromática para a barra nativa.
- Impedir URLs para IDs desconhecidos e oferecer fallback estável para dados persistidos antigos.
- Detectar regressões de extração e empacotamento automaticamente.

**Non-Goals:**

- Alterar a API do SDK, embutir SVG/data URI ou usar a fonte web diretamente na UI nativa do Owlbear.
- Adicionar novos ícones ao catálogo curado ou mudar o formato persistido do campo `icon`.
- Redesenhar o seletor de ícones do gerenciador.

## Decisions

1. **Gerar SVGs standalone a partir da fonte SVG instalada.** Um script de geração localizará o `<glyph glyph-name>` de cada ID RPG Awesome curado, copiará seu `d` sem simplificação e aplicará a transformação do sistema de coordenadas da fonte em um viewBox `0 0 1024 1024` (`translate(0 960)` seguido de inversão de Y). Os assets gerados terão namespace SVG, dimensões explícitas de 24×24, fundo transparente e preenchimento monocromático apropriado à barra. O overflow usará um SVG utilitário próprio com três pontos, pois `dots-three` não existe na fonte RPG Awesome.

   Alternativas consideradas: manter os desenhos manuais (já divergem da origem); usar a classe CSS/font-face (o host do Owlbear recebe uma URL de imagem e não o CSS do iframe); buscar SVGs em CDN em runtime (introduz disponibilidade e CORS externos).

2. **Manter assets em `public/` e URLs absolutas da origem da extensão.** Vite copia esses arquivos sem transformação para `dist/icons`, e o resolver continuará compondo `window.location.origin + /icons/...`. Isso atende ao contrato efetivo do SDK, que só normaliza URL, e evita depender da origem do Owlbear para resolver caminhos.

3. **Resolver somente IDs curados, com fallback.** O resolver normalizará/validará o ID por associação exata a `CURATED_ICONS`; valores desconhecidos retornarão o ícone padrão `crossed-swords`. Sanitizar e criar uma URL para um nome inexistente será removido, pois hoje transforma dados inválidos em requisições 404. Uma função sem entrada externa resolverá separadamente a URL fixa de `/icons/overflow.svg`.

4. **Testar estrutura e fidelidade, não snapshots frágeis do arquivo inteiro.** Os testes verificarão URL absoluta, fallback, existência de todos os assets em `public` e após build, XML/SVG básico, viewBox/dimensões e correspondência do path de cada asset com o glifo de origem. Um teste de integração inspecionará os objetos enviados às APIs OBR para confirmar que Tool, ToolAction, overflow e Context Menu usam URLs válidas.

## Risks / Trade-offs

- **[A transformação da fonte pode cortar glifos com descent ou bounds atípicos]** → usar as métricas declaradas pela fonte e validar todos os ícones curados visualmente e por bounds antes de aceitar a geração.
- **[Ícones monocromáticos podem ter contraste diferente entre superfícies do Owlbear]** → confirmar a pintura escolhida no Tool, ToolAction e Context Menu nos temas suportados; manter a cor em um único template do gerador.
- **[Atualização da dependência pode alterar paths]** → geração e testes falharão explicitamente se um `glyph-name` desaparecer; assets continuam versionados no repositório.
- **[Fallback pode ocultar dado persistido inválido]** → manter `isValidIcon` disponível para validação na UI e limitar o fallback à fronteira de renderização.
