## Context

A extensão Quick Actions Toolbar para o Owlbear Rodeo 2 necessita de uma estrutura de entrada estável (`background.html`, `manager.html`, `action-popover.html`) e integração com o `@owlbear-rodeo/sdk`. Como o Owlbear Rodeo executa extensões dentro de iFrames e contêineres gerenciados, não podemos injetar HTML no DOM principal da aplicação hospedeira. A solução requer o uso estrito das APIs de `Tool`, `ToolAction` e `Popover`.

## Goals / Non-Goals

**Goals:**
- Implementar o ciclo de inicialização resiliente no script de background.
- Registrar o `Tool` principal `com.seudominio.quick-actions/tool`.
- Criar o sincronizador dinâmico de `ToolAction` com descarte e releitura de botões.
- Implementar o cálculo de overflow (limite de 8 botões) com criação de botão auxiliar "Mais ações...".
- Conectar a abertura de popover ao `anchorElementId` recebido no callback do `onClick`.
- Estruturar a base dos três HTMLs principais em Vite (`background.html`, `manager.html`, `action-popover.html`).

**Non-Goals:**
- Implementar o parser de dados ou a integração com o Dice+ neste momento (escopo das specs 04 e 06).
- Implementar a persistência completa em Room Metadata e regras de autorização (escopo das specs 02 e 03).

## Decisions

### Decisão 1: Arquitetura Multipágina com Vite
- **Opção Escolhida:** Configuração nativa de multi-page no Rollup/Vite com três pontos de entrada HTML (`background.html`, `manager.html`, `action-popover.html`).
- **Alternativas Consideradas:** Single Page Application com roteador embutido.
- **Razão:** O Owlbear Rodeo exige URLs separadas no manifesto para `background_url`, `popover` da ação global e popovers ancorados.

### Decisão 2: Armazenamento e Resolução de Ícones para a Toolbar Nativa
- **Opção Escolhida:** Servir arquivos SVG locais em `public/icons/rpg-awesome/`.
- **Alternativas Consideradas:** Usar webfonts ou CDNs externos.
- **Razão:** As APIs `ToolIcon.icon` e `ContextMenuIcon.icon` aceitam estritamente URLs de imagens SVG. CDNs ou fontes web CSS não são suportadas nesses seletores nativos.

### Decisão 3: Limite de 8 Ações Diretas na Toolbar
- **Opção Escolhida:** Limitar a 7 ações diretas + 1 botão de overflow ("Mais ações") quando houver 9 ou mais ações cadastradas.
- **Alternativas Consideradas:** Tentar registrar todas as ações de forma ilimitada.
- **Razão:** Previne a quebra visual da interface do Owlbear Rodeo em telas de menor resolução.

## Risks / Trade-offs

- **[Risco]** Discrepância de estado entre os `ToolAction` registrados e os perfis atualizados na sala.
  - *Mitigação:* Função utilitária centralizada `syncToolActions()` que sempre desregistra ações anteriores via `OBR.tool.removeAction` antes de cadastrar novos botões.
- **[Risco]** Fechamento inesperado do Popover de variantes.
  - *Mitigação:* Passar explicitamente o `anchorElementId` fornecido pelo Owlbear Rodeo no evento `onClick` do `ToolAction`.
