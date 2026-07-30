## Why

Implementar a casca da extensão (Extension Shell) e a interface nativa para o Owlbear Rodeo 2, permitindo registrar o `Tool` principal de ações rápidas, descarregar/recarregar `ToolAction` dinamicamente com suporte a overflow (menu de 8 botões), apresentar o menu ancorado via `Popover` e disponibilizar a interface do gerenciador via `ManifestAction`.

## What Changes

- Inicialização do SDK do Owlbear Rodeo (`OBR.onReady()`) na background page (`background.html`).
- Registro do `Tool` principal "Ações Rápidas" na toolbar nativa da sala.
- Gerenciador dinâmico de `ToolAction` com suporte ao limite de 8 botões visíveis e menu de transbordamento ("Mais ações").
- Disparo do `Popover` ancorado ao botão clicado via `anchorElementId` para seleção de variantes.
- Interface base do Gerenciador de Ações (`manager.html`) acionada via `ManifestAction` no canto superior esquerdo da tela.

## Capabilities

### New Capabilities
- `extension-shell-ui`: Suporte ao registro do Tool principal, ToolActions dinâmicos, Popover de variantes ancorado e ManifestAction para a extensão Quick Actions.

### Modified Capabilities
<!-- Nenhuma funcionalidade anterior modificada -->

## Impact

- **Código:** Novos módulos em `src/background/` (`index.ts`, `registerTool.ts`, `registerToolActions.ts`, `popoverManager.ts`) e UIs base em `src/ui/manager/` e `src/ui/action-popover/`.
- **APIs do SDK:** Uso de `OBR.tool.create`, `OBR.tool.createAction`, `OBR.tool.removeAction`, `OBR.popover.open` e `OBR.action`.
- **Assets:** Ícones SVG estáticos do RPG Awesome em `public/icons/rpg-awesome/`.
