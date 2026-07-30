# Especificação Técnica 01 — Shell da Extensão e Interface Nativa

**Componente:** Core UI & Extension Shell  
**Arquivos de Referência:** `SRD.md` (Seções 2, 5, 15)  
**Status:** Pronto para implementação  

---

## 1. Visão Geral

Esta especificação cobre a infraestrutura de interface nativa da extensão Quick Actions no Owlbear Rodeo 2, englobando a página de background, o registro do `Tool` principal, o gerenciamento dinâmico de `ToolAction`, o `Popover` de variantes ancorado e a abertura do editor via `ManifestAction`.

---

## 2. Requisitos Técnicos e APIs do SDK

### 2.1 ManifestAction (`public/manifest.json`)
O manifesto define a extensão e registra a ação global no canto superior esquerdo da interface do Owlbear Rodeo.

```json
{
  "name": "Quick Actions",
  "version": "0.1.0",
  "manifest_version": 1,
  "description": "Barra de ações e rolagens rápidas para personagens.",
  "icon": "/icons/extension.svg",
  "author": "Filipe",
  "background_url": "/background.html",
  "action": {
    "title": "Quick Actions - Gerenciador",
    "icon": "/icons/extension.svg",
    "popover": "/manager.html",
    "width": 420,
    "height": 640
  }
}
```

### 2.2 Background Page (`public/background.html` / `src/background/index.ts`)
A página de background permanece ativa continuamente enquanto a extensão estiver habilitada na sala.

#### Ciclo de Inicialização:
1. Aguardar resolução de `OBR.onReady()`.
2. Registrar o `Tool` principal de ações rápidas.
3. Registrar o `ContextMenuItem` para tokens (`CHARACTER`).
4. Carregar o perfil do jogador conectado via `OBR.room.getMetadata()`.
5. Inscrever listeners de ciclo de vida (`OBR.room.onMetadataChange`, `OBR.player.onChange`, `OBR.party.onChange`, `OBR.scene.onReadyChange`).
6. Reconstruir dinamicamente os `ToolAction` da barra.

---

## 3. Especificação do Tool e ToolAction Dinâmico

### 3.1 Registro do Tool Principal (`src/background/registerTool.ts`)
```typescript
export const TOOL_ID = "com.seudominio.quick-actions/tool";

export async function initTool() {
  await OBR.tool.create({
    id: TOOL_ID,
    icons: [
      {
        icon: "/icons/rpg-awesome/crossed-swords.svg",
        label: "Ações Rápidas",
      }
    ],
    defaultMetadata: {
      activeProfileId: null,
    }
  });
}
```

### 3.2 Gerenciamento Dinâmico de ToolAction (`src/background/registerToolActions.ts`)

#### Algoritmo de Atualização da Barra:
1. Obter a lista de ações ativas (`action.enabled === true`) do `CharacterActionProfile` do jogador.
2. Ordenar a lista por `sortOrder` crescente.
3. Aplicar **Regra de Capacidade Visual de 8 Botões**:
   - Se `totalActions <= 8`: Exibir todas as ações como `ToolAction` individuais.
   - Se `totalActions > 8`: Exibir as primeiras 7 ações. O 8º botão será configurado como um botão de overflow com rótulo "Mais ações" (`icon: "/icons/rpg-awesome/dots-three.svg"`).
4. Limpar ações registradas anteriormente usando `OBR.tool.removeAction(actionId)`.
5. Registrar cada `ToolAction` via `OBR.tool.createAction`:

```typescript
export async function syncToolActions(actions: ActionDefinition[], activeProfileId: string) {
  // 1. Desregistrar botões antigos
  const currentActions = await getRegisteredActions();
  for (const actionId of currentActions) {
    await OBR.tool.removeAction(actionId);
  }

  // 2. Filtrar e limitar
  const visibleActions = actions.filter(a => a.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const maxDirect = 8;
  const showOverflow = visibleActions.length > maxDirect;
  const directActions = showOverflow ? visibleActions.slice(0, 7) : visibleActions;

  // 3. Criar ToolAction diretos
  for (const action of directActions) {
    const actionId = `${TOOL_ID}/action/${action.id}`;
    await OBR.tool.createAction({
      id: actionId,
      icons: [
        {
          icon: `/icons/rpg-awesome/${action.icon}.svg`,
          label: action.shortLabel || action.name,
          filter: {
            activeTools: [TOOL_ID],
          },
        },
      ],
      onClick(_context, elementId) {
        openActionPopover(action.id, elementId);
      },
    });
  }

  // 4. Se overflow ativado, criar botão "Mais ações"
  if (showOverflow) {
    const overflowId = `${TOOL_ID}/action/overflow`;
    await OBR.tool.createAction({
      id: overflowId,
      icons: [
        {
          icon: "/icons/rpg-awesome/dots-three.svg",
          label: "Mais ações...",
          filter: {
            activeTools: [TOOL_ID],
          },
        },
      ],
      onClick(_context, elementId) {
        openOverflowPopover(visibleActions.slice(7), elementId);
      },
    });
  }
}
```

---

## 4. Popover de Variantes Ancorado (`public/action-popover.html`)

Ao clicar em um `ToolAction`, abre-se um popover ancorado usando o `elementId` fornecido pelo callback nativo do Owlbear Rodeo.

### 4.1 Chamada do Popover (`src/background/popoverManager.ts`)
```typescript
export const ACTION_POPOVER_ID = "com.seudominio.quick-actions/action-popover";

export async function openActionPopover(actionId: string, elementId: string) {
  const height = calculatePopoverHeight(actionId);
  await OBR.popover.open({
    id: ACTION_POPOVER_ID,
    url: `/action-popover.html?actionId=${encodeURIComponent(actionId)}`,
    width: 280,
    height: height,
    anchorElementId: elementId,
    anchorOrigin: {
      horizontal: "CENTER",
      vertical: "BOTTOM",
    },
    transformOrigin: {
      horizontal: "CENTER",
      vertical: "TOP",
    },
  });
}
```

### 4.2 Conteúdo do Popover de Variantes
O iframe Vue 3 renderizará:
- Cabeçalho: Nome e ícone da ação.
- Botão "Rolagem Normal" (`variant: "NORMAL"`).
- Botão "Vantagem" (se `variantPolicy.allowAdvantage`).
- Botão "Desvantagem" (se `variantPolicy.allowDisadvantage`).
- Botão "Crítico" (se `variantPolicy.allowCritical`).
- Lista de Variantes Customizadas (`variantPolicy.customVariants`).
- Rodapé: Botão "Editar ação" (visível apenas para usuários autorizados).

Após a seleção da variante, o evento dispara a execução da sequência de rolagens e fecha o popover imediatamente via `OBR.popover.close(ACTION_POPOVER_ID)`.

---

## 5. Matriz de Testes e Validação da Interface Nativa

1. **Troca de Scene:** Confirmar que ao trocar de Scene na Room, o `Tool` "Ações Rápidas" permanece disponível e com os mesmos `ToolAction` sem piscar.
2. **Reatividade a Mudanças de Metadata:** Ao editar uma ação no `ManifestAction`, verificar se a imagem/label do `ToolAction` correspondente é atualizado instantaneamente via listener `OBR.room.onMetadataChange`.
3. **Comportamento em Telas Reduzidas:** Testar o correto acionamento do menu de overflow ("Mais ações") quando o perfil contiver 9 ou mais ações cadastradas.
