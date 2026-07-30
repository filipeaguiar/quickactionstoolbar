# SRD — Barra de Ações Rápidas para Owlbear Rodeo

**Status:** especificação inicial implementável  
**Versão do documento:** 0.2  
**Sistema inicial:** Dungeons & Dragons 2024  
**Plataforma:** Owlbear Rodeo 2  
**SDK de referência:** `@owlbear-rodeo/sdk` 3.1.0  
**Nome de trabalho da extensão:** Quick Actions  
**Identificador de exemplo:** `com.seudominio.quick-actions`

---

## 1. Objetivo

Criar uma extensão para o Owlbear Rodeo que permita a cada jogador manter uma barra de ações rápidas associada a um perfil de personagem persistente na Room. Cada ação será representada por um botão na interface nativa do Owlbear Rodeo.

Ao clicar em uma ação, o jogador deverá escolher uma variante aplicável, como:

- rolagem normal;
- vantagem;
- desvantagem;
- acerto crítico;
- variantes específicas da ação;
- execução personalizada.

Após a escolha, a extensão deverá montar uma sequência de rolagens e enviá-la ao Dice+ por meio do canal de integração disponibilizado por essa extensão.

A primeira implementação será voltada para Dungeons & Dragons 2024, mas o núcleo deverá permitir a inclusão futura de outros sistemas, como 3D&T Victory.

---

## 2. Restrições confirmadas da plataforma

### 2.1 Não existe uma API para criar uma barra inferior arbitrária

Uma extensão não pode inserir livremente elementos no DOM principal do Owlbear Rodeo fora de seus iframes.

A solução suportada pelo SDK será composta por:

- um `Tool`, registrado com `OBR.tool.create`;
- vários `ToolAction`, registrados com `OBR.tool.createAction`;
- um `Popover`, aberto com `OBR.popover.open`, para apresentar as variantes da ação;
- um `ManifestAction`, opcional, para abrir o editor completo da barra.

### 2.2 Posição dos elementos

O `Tool` aparecerá na toolbar nativa do Owlbear Rodeo, localizada no lado direito da tela quando uma Scene estiver aberta.

Quando o `Tool` estiver ativo:

- os `ToolMode` aparecem no lado esquerdo do menu superior do Tool;
- os `ToolAction` aparecem no lado direito do menu superior do Tool.

A primeira versão não precisará de um `ToolMode`, pois a extensão não captura cliques ou arrastos no mapa. Ela utilizará um `Tool` como contêiner visual e `ToolAction` como botões de ação.

### 2.3 Submenu de variantes

O callback de um `ToolAction` recebe:

```ts
onClick(context: ToolContext, elementId: string): void
```

O `elementId` deverá ser usado em:

```ts
OBR.popover.open({
  id: POPOVER_ID,
  url: "/action-popover.html",
  width: 280,
  height: 320,
  anchorElementId: elementId,
});
```

Isso fará o seletor de variantes aparecer ancorado ao botão clicado.

---

## 3. Escopo do MVP

O MVP deverá permitir:

1. registrar uma barra nativa de ações rápidas;
2. criar perfis de personagem persistentes no metadata da Room;
3. associar um perfil a um jogador conectado;
4. vincular opcionalmente um `Item` da layer `"CHARACTER"` ao perfil;
5. criar, editar, excluir e reordenar ações;
6. selecionar um ícone do RPG Awesome;
7. definir uma sequência contendo uma ou mais rolagens;
8. gerar automaticamente variantes de D&D 2024;
9. abrir um seletor de variantes ao clicar no `ToolAction`;
10. enviar as rolagens ao Dice+;
11. manter a configuração quando a Scene for trocada;
12. sincronizar alterações entre os participantes;
13. impedir que um jogador altere a barra de outro jogador;
14. medir o uso do metadata da Room;
15. exportar e restaurar perfis por JSON.

Ficam fora do MVP:

- importação de fichas do D&D Beyond;
- integração direta com Forge!, Chronicle ou Open5e;
- automação de consumo de recursos;
- aplicação automática de dano em tokens;
- interpretação completa da linguagem de macros do Roll20;
- suporte a 3D&T Victory;
- criação de um mecanismo próprio de dados 3D;
- backend externo;
- autenticação adicional.

---

## 4. Terminologia do domínio

### 4.1 Action Bar

Conjunto ordenado de ações rápidas contido em um perfil de personagem e atribuído a um jogador.

### 4.2 Action Definition

Definição persistida de uma ação, contendo nome, ícone, passos de rolagem, regras e variantes.

### 4.3 Roll Step

Uma rolagem individual dentro de uma sequência. Uma ação de ataque normalmente terá pelo menos:

1. `attack`;
2. `damage`.

### 4.4 Roll Sequence

Lista ordenada de `RollStep` executada por uma única ação.

### 4.5 System Pack

Módulo responsável pelas regras específicas de um sistema. O primeiro será:

```text
dnd5e-2024
```

### 4.6 Variant

Transformação de uma `ActionDefinition` antes da execução, como vantagem, desvantagem ou crítico.

### 4.7 Dice Adapter

Camada que converte uma `RollSequence` para o protocolo aceito por uma extensão de dados.

A primeira implementação será:

```text
DicePlusAdapter
```

---

## 5. Arquitetura de interface

## 5.1 ManifestAction

O `manifest.json` deverá conter um `action` para abrir o editor completo da extensão no canto superior esquerdo da sala.

Exemplo:

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
    "title": "Quick Actions",
    "icon": "/icons/extension.svg",
    "popover": "/manager.html",
    "width": 420,
    "height": 640
  }
}
```

Responsabilidades do `ManifestAction`:

- selecionar a barra ativa;
- administrar ações;
- selecionar o System Pack;
- configurar atributos e variáveis;
- testar rolagens;
- importar e exportar JSON;
- exibir o estado da integração com Dice+.

O tamanho do editor poderá ser ajustado em tempo de execução com:

```ts
OBR.action.setWidth(width);
OBR.action.setHeight(height);
```

## 5.2 Background page

O arquivo indicado por `background_url` deverá carregar permanentemente enquanto a extensão estiver habilitada.

Responsabilidades:

- aguardar `OBR.onReady`;
- registrar o `Tool`;
- registrar o `ContextMenuItem`;
- acompanhar `OBR.scene.isReady`;
- carregar os perfis persistidos em `OBR.room.metadata`;
- localizar o perfil atribuído ao jogador atual;
- registrar e remover `ToolAction` dinamicamente;
- acompanhar alterações da Room, da Scene e do Player;
- manter o adaptador do Dice+ disponível;
- abrir o `Popover` de variantes.

A barra não deverá depender de o `ManifestAction` estar aberto.

## 5.3 Tool

O Tool deverá ser criado com:

```ts
OBR.tool.create({
  id: TOOL_ID,
  icons: [
    {
      icon: "/icons/rpg-awesome/crossed-swords.svg",
      label: "Ações rápidas"
    }
  ],
  defaultMetadata: {
    activeProfileId: null
  }
});
```

O `Tool.metadata` será utilizado apenas para estado local e transitório da interface, por exemplo:

- `activeProfileId`;
- `lastActionId`;
- `popoverActionId`.

Não deverá ser usado como armazenamento principal das ações, pois o metadata de um Tool é local ao navegador e não representa a fonte compartilhada da Room.

## 5.4 ToolAction

Cada ação visível deverá gerar um `ToolAction`.

Exemplo:

```ts
OBR.tool.createAction({
  id: `${EXTENSION_ID}/action/${action.id}`,
  icons: [
    {
      icon: resolveIconUrl(action.icon),
      label: action.name,
      filter: {
        activeTools: [TOOL_ID]
      }
    }
  ],
  onClick(_context, elementId) {
    openActionPopover(action.id, elementId);
  }
});
```

Ao recarregar a barra:

1. remover os `ToolAction` registrados anteriormente com `OBR.tool.removeAction`;
2. ordenar as ações por `sortOrder`;
3. registrar os novos `ToolAction`;
4. registrar por último um botão de gerenciamento, se necessário.

### Limite visual recomendado

O MVP deverá exibir no máximo oito ações diretamente na barra.

Caso existam mais ações:

- exibir as sete primeiras;
- usar o oitavo botão como “Mais ações”;
- abrir um `Popover` contendo o restante.

Esse limite é uma decisão da extensão, não uma limitação formal do SDK.

## 5.5 Action Popover

O seletor aberto por um `ToolAction` deverá mostrar:

- nome e ícone da ação;
- rolagem normal;
- vantagem, quando aplicável;
- desvantagem, quando aplicável;
- crítico, quando aplicável;
- variantes específicas;
- botão “Editar ação”, quando autorizado.

O popover deverá ser aberto com:

```ts
OBR.popover.open({
  id: ACTION_POPOVER_ID,
  url: `/action-popover.html?actionId=${encodeURIComponent(actionId)}`,
  width: 300,
  height: calculatePopoverHeight(action),
  anchorElementId: elementId,
  anchorOrigin: {
    horizontal: "CENTER",
    vertical: "BOTTOM"
  },
  transformOrigin: {
    horizontal: "CENTER",
    vertical: "TOP"
  }
});
```

Depois de disparar uma variante, o popover deverá ser fechado com:

```ts
OBR.popover.close(ACTION_POPOVER_ID);
```

---

## 6. Persistência e associação entre perfil, jogador e token

## 6.1 Fonte principal: Room metadata

A fonte de verdade dos perfis será o metadata da Room, acessado por:

```ts
OBR.room.getMetadata()
OBR.room.setMetadata(...)
OBR.room.onMetadataChange(...)
```

A Room permanece ativa quando o GM troca de Scene. Portanto, as barras continuarão disponíveis ao alternar entre mapas da mesma sala.

Chave sugerida:

```ts
const ROOM_DATA_KEY =
  `${EXTENSION_ID}/room-data`;
```

Estrutura principal:

```ts
interface RoomQuickActionsData {
  schemaVersion: 1;
  profiles: Record<string, CharacterActionProfile>;
  playerAssignments: Record<string, string>;
  settings: RoomQuickActionsSettings;
  updatedAt: string;
  updatedBy: string;
}

interface RoomQuickActionsSettings {
  playersCanEditOwnProfiles: boolean;
  maxVisibleActions: number;
}

interface CharacterActionProfile {
  id: string;
  name: string;
  ownerPlayerId: string | null;
  ownerPlayerName: string | null;
  systemId: "dnd5e-2024";
  variables: Record<string, number>;
  actions: ActionDefinition[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}
```

O mapa `playerAssignments` utilizará:

```text
Player.id -> CharacterActionProfile.id
```

## 6.2 Leitura e gravação

Leitura:

```ts
const metadata = await OBR.room.getMetadata();
const roomData = parseRoomData(
  metadata[ROOM_DATA_KEY]
);
```

Gravação:

```ts
await OBR.room.setMetadata({
  [ROOM_DATA_KEY]: nextRoomData
});
```

`setMetadata` recebe uma atualização parcial. A extensão deverá atualizar somente sua chave com namespace e nunca substituir metadata pertencente a outras extensões.

## 6.3 Seleção e atribuição do jogador

O GM deverá selecionar o proprietário entre os jogadores conectados:

```ts
const players = await OBR.party.getPlayers();
```

Mudanças na lista serão acompanhadas com:

```ts
OBR.party.onChange((players) => {
  // Atualizar a lista de jogadores conectados.
});
```

O `Player.id` será a chave persistida. O nome será salvo apenas para apresentação.

Para a primeira atribuição, o jogador deverá estar conectado. Depois disso, o vínculo continuará válido mesmo que ele saia da sala.

A atribuição deverá atualizar:

```ts
profile.ownerPlayerId = player.id;
profile.ownerPlayerName = player.name;
roomData.playerAssignments[player.id] =
  profile.id;
```

Ao transferir um perfil para outro jogador, a associação anterior deverá ser removida.

## 6.4 Descoberta do perfil do jogador atual

O jogador atual será identificado por:

```ts
const currentPlayerId = OBR.player.id;
```

O perfil será localizado por:

```ts
const profileId =
  roomData.playerAssignments[currentPlayerId];

const profile =
  profileId
    ? roomData.profiles[profileId]
    : undefined;
```

Se houver:

- nenhum perfil atribuído: mostrar somente o acesso ao gerenciador;
- um perfil atribuído: ativá-lo automaticamente;
- vários perfis disponíveis ao GM: usar `activeProfileId`;
- múltiplos perfis por jogador no futuro: migrar `playerAssignments` para listas.

## 6.5 Vínculo opcional com token

Um personagem visual na Scene será um `Item` que satisfaça:

```ts
item.layer === "CHARACTER"
```

O token não armazenará a barra completa. Ele poderá guardar somente uma referência:

```ts
const PROFILE_REFERENCE_KEY =
  `${EXTENSION_ID}/profile-id`;
```

Exemplo:

```ts
await OBR.scene.items.updateItems(
  [characterItem],
  (items) => {
    items[0].metadata[PROFILE_REFERENCE_KEY] =
      profile.id;
  }
);
```

Esse vínculo permitirá:

- abrir o perfil pelo context menu do token;
- identificar qual perfil corresponde ao token;
- editar a barra a partir do personagem no mapa;
- remover ou substituir o token sem apagar o perfil.

Excluir o token não deverá excluir o perfil automaticamente.

O campo `Item.createdUserId` identifica quem criou o Item e não será reinterpretado como propriedade do perfil.

## 6.6 Context menu

O GM poderá selecionar um Character e clicar em “Vincular ações”.

```ts
OBR.contextMenu.create({
  id: `${EXTENSION_ID}/link-character-profile`,
  icons: [
    {
      icon: "/icons/rpg-awesome/cog.svg",
      label: "Vincular ações",
      filter: {
        min: 1,
        max: 1,
        roles: ["GM"],
        permissions: ["UPDATE"],
        every: [
          {
            key: "layer",
            value: "CHARACTER"
          }
        ]
      }
    }
  ],
  onClick(context, elementId) {
    const character = context.items[0];
    openCharacterProfileLinker(
      character.id,
      elementId
    );
  }
});
```

O vínculo com token será opcional. O GM poderá criar e administrar perfis diretamente pelo `ManifestAction`, mesmo sem um token correspondente na Scene.

## 6.7 Consulta do tamanho ocupado

O SDK não fornece um método específico como `getMetadataSize()`. A extensão deverá obter o metadata completo e medir sua representação JSON em bytes UTF-8:

```ts
function jsonUtf8Size(value: unknown): number {
  return new TextEncoder()
    .encode(JSON.stringify(value))
    .byteLength;
}

async function inspectRoomMetadataSize() {
  const metadata = await OBR.room.getMetadata();
  const totalBytes = jsonUtf8Size(metadata);
  const documentedLimit = 16 * 1024;

  console.table({
    bytes: totalBytes,
    kibibytes: (
      totalBytes / 1024
    ).toFixed(2),
    approximatePercent: (
      (totalBytes / documentedLimit) * 100
    ).toFixed(1)
  });

  return {
    metadata,
    totalBytes
  };
}
```

Esse cálculo mede todo o metadata retornado, inclusive dados de outras extensões.

Para estimar quanto cada chave superior ocupa:

```ts
async function inspectRoomMetadataKeys() {
  const metadata = await OBR.room.getMetadata();

  const rows = Object.entries(metadata)
    .map(([key, value]) => ({
      key,
      bytes: jsonUtf8Size({
        [key]: value
      })
    }))
    .sort((a, b) => b.bytes - a.bytes);

  console.table(rows);
  return rows;
}
```

A soma das linhas é aproximada, pois cada medição inclui suas próprias chaves e chaves estruturais. A medição do objeto completo é a referência principal.

O limite é documentado como 16 kB, mas a documentação não especifica se o servidor considera 16.000 ou 16.384 bytes, nem eventual overhead interno. Por isso, a extensão deverá trabalhar com margem de segurança.

## 6.8 Política de capacidade

A extensão deverá:

1. mostrar o tamanho atual do metadata completo da Room;
2. mostrar o tamanho isolado de `ROOM_DATA_KEY`;
3. simular o tamanho final antes de salvar;
4. emitir aviso quando o metadata completo ultrapassar 12 KB;
5. bloquear novas gravações da extensão quando a simulação ultrapassar 15 KB;
6. permitir exportação JSON antes de remover perfis;
7. não salvar histórico de rolagens;
8. evitar descrições extensas e dados derivados;
9. armazenar IDs de ícones, nunca SVGs ou base64.

Simulação antes de salvar:

```ts
async function estimateAfterUpdate(
  nextRoomData: RoomQuickActionsData
) {
  const metadata = await OBR.room.getMetadata();

  const simulatedMetadata = {
    ...metadata,
    [ROOM_DATA_KEY]: nextRoomData
  };

  return {
    currentTotalBytes:
      jsonUtf8Size(metadata),
    extensionBytes:
      jsonUtf8Size(nextRoomData),
    projectedTotalBytes:
      jsonUtf8Size(simulatedMetadata)
  };
}
```

## 6.9 Papel do localStorage e Tool metadata

`localStorage` ou `Tool.metadata` poderão guardar somente preferências locais:

```ts
interface LocalPreferences {
  activeProfileId?: string;
  compactMode?: boolean;
  lastSelectedVariantByAction?: Record<
    string,
    string
  >;
}
```

Não deverão armazenar a fonte principal de:

- perfis;
- ações;
- atributos;
- fórmulas;
- associações com jogadores.

## 6.10 Evolução para backend

Um backend externo não será necessário no MVP.

Ele deverá ser considerado quando houver necessidade de:

- superar o limite de 16 KB;
- usar o mesmo perfil em Rooms diferentes;
- manter uma biblioteca grande de personagens;
- criar backups automáticos;
- compartilhar perfis entre campanhas;
- manter histórico ou versionamento.

Nesse modelo futuro, o Room metadata guardará somente IDs e atribuições.

---

## 7. Autorização

A autorização deverá ser validada no código, e não apenas escondendo botões.

### 7.1 GM

Um jogador com:

```ts
await OBR.player.getRole() === "GM"
```

poderá:

- criar uma barra;
- atribuir uma barra a um jogador;
- editar qualquer barra;
- duplicar e excluir barras;
- alterar o System Pack;
- importar e exportar configurações;
- executar ações de qualquer barra em modo de teste.

### 7.2 Player

Um jogador com role `"PLAYER"` poderá:

- visualizar e usar a própria barra;
- editar a própria barra, caso a opção da sala permita;
- selecionar entre barras atribuídas ao mesmo `Player.id`;
- exportar a própria barra;
- nunca alterar `ownerPlayerId`.

### 7.3 Verificação de escrita

Antes de persistir uma alteração:

1. obter o role atual;
2. reler o metadata atual da Room;
3. localizar o perfil mais recente;
4. verificar se o usuário é GM ou proprietário autorizado;
5. impedir que Players alterem `ownerPlayerId`, `playerAssignments` ou configurações globais;
6. simular e validar o tamanho final;
7. rejeitar alterações não autorizadas ou acima do limite;
8. exibir mensagem com `OBR.notification.show`.

---

## 8. Modelo de dados das ações

```ts
type ActionKind =
  | "ATTACK"
  | "DAMAGE"
  | "SAVE"
  | "CHECK"
  | "HEALING"
  | "UTILITY"
  | "CUSTOM";

interface ActionDefinition {
  id: string;
  name: string;
  shortLabel?: string;
  description?: string;
  icon: RpgAwesomeIconId;
  kind: ActionKind;
  enabled: boolean;
  sortOrder: number;
  systemId: "dnd5e-2024";
  sequence: RollSequence;
  variantPolicy: VariantPolicy;
  tags: string[];
}

interface RollSequence {
  version: 1;
  steps: RollStep[];
  stopOnError: boolean;
}

interface RollStep {
  id: string;
  label: string;
  purpose:
    | "ATTACK"
    | "DAMAGE"
    | "HEALING"
    | "CHECK"
    | "SAVE"
    | "OTHER";
  expression: string;
  visibility: "PUBLIC" | "PRIVATE";
  execute: "ALWAYS" | "ON_HIT" | "ON_CRITICAL";
  criticalBehavior?: "DOUBLE_DICE" | "NONE";
}

interface VariantPolicy {
  allowNormal: boolean;
  allowAdvantage: boolean;
  allowDisadvantage: boolean;
  allowCritical: boolean;
  customVariants: CustomVariant[];
}

interface CustomVariant {
  id: string;
  name: string;
  icon?: RpgAwesomeIconId;
  transformations: RollTransformation[];
}
```

---

## 9. Sintaxe de rolagem

## 9.1 Princípio

A extensão deverá aceitar uma sintaxe inspirada no Roll20, mas não prometer compatibilidade completa com macros do Roll20.

O parser do MVP deverá aceitar:

- `NdX`;
- modificadores positivos e negativos;
- parênteses;
- variáveis;
- `kh1`;
- `kl1`;
- múltiplos termos;
- comentários e labels fora da expressão;
- múltiplos passos consecutivos.

Exemplos:

```text
1d20 + 5
2d20kh1 + 5
2d20kl1 + 5
1d12 + 3
2d6 + 1d4 + 4
```

## 9.2 Variáveis

Variáveis serão escritas entre chaves duplas:

```text
1d20 + {{proficiency}} + {{strength}}
```

O valor será resolvido a partir de:

```ts
CharacterActionProfile.variables
```

Exemplo:

```json
{
  "proficiency": 2,
  "strength": 3
}
```

## 9.3 Rolagens consecutivas

O editor deverá representar cada rolagem como um `RollStep`, mesmo que ofereça uma área de texto simplificada.

Exemplo de entrada textual:

```text
attack: 1d20 + {{proficiency}} + {{strength}}
damage: 1d12 + {{strength}}
```

Resultado interno:

```json
{
  "steps": [
    {
      "label": "Ataque",
      "purpose": "ATTACK",
      "expression": "1d20 + {{proficiency}} + {{strength}}",
      "execute": "ALWAYS"
    },
    {
      "label": "Dano",
      "purpose": "DAMAGE",
      "expression": "1d12 + {{strength}}",
      "execute": "ON_HIT",
      "criticalBehavior": "DOUBLE_DICE"
    }
  ]
}
```

### Decisão do MVP

O MVP enviará ataque e dano consecutivamente ao Dice+, sem tentar determinar automaticamente se o ataque atingiu uma Classe de Armadura.

O valor `ON_HIT` será inicialmente tratado como informação semântica e poderá ser configurado para:

- executar sempre;
- perguntar ao usuário depois do ataque;
- aguardar suporte futuro a resultados retornados pelo Dice+.

A opção padrão do MVP será “executar sempre”.

---

## 10. System Pack de D&D 2024

O System Pack deverá implementar:

```ts
interface SystemPack {
  id: string;
  name: string;
  getAvailableVariants(action: ActionDefinition): ActionVariant[];
  applyVariant(
    action: ActionDefinition,
    variant: ActionVariant,
    variables: Record<string, number>
  ): ResolvedRollSequence;
  validateAction(action: ActionDefinition): ValidationResult;
}
```

## 10.1 Rolagem normal

Não modifica a expressão.

## 10.2 Vantagem

Em passos com `purpose: "ATTACK"`, `"CHECK"` ou `"SAVE"`:

```text
1d20 + MOD
```

torna-se:

```text
2d20kh1 + MOD
```

Outros dados da expressão não deverão ser alterados.

## 10.3 Desvantagem

Em passos com `purpose: "ATTACK"`, `"CHECK"` ou `"SAVE"`:

```text
1d20 + MOD
```

torna-se:

```text
2d20kl1 + MOD
```

## 10.4 Crítico

Em passos com:

```ts
criticalBehavior === "DOUBLE_DICE"
```

todos os termos de dados de dano serão duplicados, mantendo modificadores constantes uma única vez.

Exemplo:

```text
1d12 + 1d6 + 3
```

torna-se:

```text
2d12 + 2d6 + 3
```

A transformação deverá ocorrer sobre uma AST, não por substituição textual com expressões regulares.

## 10.5 Ataque Imprudente

Uma ação “Ataque Imprudente” poderá ser modelada como:

- uma Action Definition própria; ou
- uma Custom Variant de uma ação de ataque.

Transformações:

- aplicar vantagem somente ao RollStep de ataque;
- manter dano normal;
- apresentar uma observação de regra no popover;
- não automatizar efeitos posteriores sobre ataques contra o personagem.

---

## 11. Parser e AST

O parser deverá converter a expressão para uma árvore sintática antes de aplicar variantes.

Nós mínimos:

```ts
type RollExpressionNode =
  | DiceNode
  | NumberNode
  | VariableNode
  | BinaryOperationNode
  | GroupNode;

interface DiceNode {
  type: "DICE";
  count: number;
  sides: number;
  keep?: {
    mode: "HIGHEST" | "LOWEST";
    count: number;
  };
}
```

Pipeline:

```text
texto
  -> tokenize
  -> parse
  -> AST
  -> resolver variáveis
  -> aplicar variante do System Pack
  -> serializar para notação do Dice+
  -> enviar ao Dice Adapter
```

Erros deverão indicar:

- posição aproximada;
- token inválido;
- variável ausente;
- dado inválido;
- operador incompleto;
- transformação não suportada.

---

## 12. Integração com Dice+

## 12.1 Abstração obrigatória

O restante da extensão não deverá conhecer o canal nem o payload específico do Dice+.

```ts
interface DiceAdapter {
  id: string;
  isAvailable(): Promise<boolean>;
  roll(sequence: ResolvedRollSequence): Promise<RollDispatchResult>;
}
```

Implementação:

```ts
class DicePlusAdapter implements DiceAdapter {
  id = "dice-plus";

  async isAvailable(): Promise<boolean> {
    // Handshake definido pelo protocolo do Dice+.
    return true;
  }

  async roll(
    sequence: ResolvedRollSequence
  ): Promise<RollDispatchResult> {
    // Converter e enviar pelo canal do Dice+.
  }
}
```

## 12.2 Transporte pelo SDK

Quando o Dice+ usar o Broadcast API, a comunicação deverá utilizar:

```ts
OBR.broadcast.sendMessage(channel, data, options);
```

O canal e o payload deverão ficar centralizados:

```ts
export const DICE_PLUS_PROTOCOL = {
  channel: "SUBSTITUIR_PELO_CANAL_CONFIRMADO",
  version: 1
} as const;
```

A extensão não deverá espalhar strings do protocolo pelo código.

## 12.3 Protocolo externo

O contrato exato do Dice+ deverá ser registrado em:

```text
src/integrations/dice-plus/protocol.ts
```

Esse arquivo deverá conter:

- nome do canal;
- versão;
- tipos de request;
- tipos de response;
- handshake;
- timeout;
- tratamento de erro;
- suporte a rolagem privada;
- suporte a bônus;
- suporte a vantagem e desvantagem;
- comportamento para múltiplas rolagens.

Como o protocolo pertence a outra extensão e pode mudar, ele deverá ser tratado como dependência externa versionada.

## 12.4 Sequenciamento

Se o Dice+ aceitar uma única expressão por chamada:

```ts
for (const step of sequence.steps) {
  await diceAdapter.rollStep(step);
}
```

Se aceitar uma sequência em uma única mensagem, o adapter deverá enviá-la de uma vez.

O Core não deverá depender dessa diferença.

## 12.5 Ausência do Dice+

Caso o handshake falhe:

```ts
OBR.notification.show(
  "Dice+ não foi detectado. Habilite a extensão para executar esta ação.",
  "WARNING"
);
```

O editor continuará funcionando, e o usuário poderá inspecionar a sequência resolvida.

---

## 13. RPG Awesome

## 13.1 Uso dentro dos iframes

Nos componentes Vue 3 do editor e dos popovers, os ícones poderão ser exibidos com classes do RPG Awesome, por exemplo:

```html
<i class="ra ra-broadsword"></i>
```

A dependência poderá ser instalada com:

```bash
npm add rpg-awesome
```

e importada no CSS da aplicação.

## 13.2 Uso em ToolIcon e ContextMenuIcon

`ToolIcon.icon` e `ContextMenuIcon.icon` esperam uma URL de imagem. Eles não aceitam diretamente um elemento HTML ou uma classe CSS.

Portanto, os ícones usados na interface nativa deverão existir como arquivos SVG:

```text
public/icons/rpg-awesome/broadsword.svg
public/icons/rpg-awesome/crossed-swords.svg
public/icons/rpg-awesome/shield.svg
public/icons/rpg-awesome/lightning-bolt.svg
```

A função:

```ts
function resolveIconUrl(iconId: RpgAwesomeIconId): string {
  return `/icons/rpg-awesome/${iconId}.svg`;
}
```

deverá mapear somente identificadores permitidos.

## 13.3 Catálogo inicial

O MVP deverá disponibilizar uma seleção curada, em vez dos 495 ícones completos.

Categorias sugeridas:

- ataques;
- armas;
- defesa;
- magia;
- cura;
- movimento;
- utilidade;
- condições;
- elementos;
- dados.

Exemplos de IDs:

```ts
type RpgAwesomeIconId =
  | "broadsword"
  | "crossed-swords"
  | "axe"
  | "shield"
  | "lightning-bolt"
  | "fire"
  | "frostfire"
  | "health"
  | "health-increase"
  | "targeted"
  | "archery-target"
  | "footprint"
  | "scroll-unfurled"
  | "dice-six";
```

Os nomes finais deverão corresponder aos arquivos realmente incluídos no projeto.

## 13.4 Licenças

Os arquivos de licença do RPG Awesome e dos SVGs utilizados deverão ser preservados no repositório e na distribuição da extensão.

Não carregar fontes ou SVGs por CDN. Todos os assets deverão ser empacotados localmente para:

- evitar indisponibilidade externa;
- reduzir problemas de CORS;
- manter comportamento consistente no iframe;
- facilitar auditoria de licença.

---

## 14. Persistência e sincronização

## 14.1 Fonte de verdade

A fonte de verdade será:

```ts
Room.metadata[ROOM_DATA_KEY]
```

Ela conterá os perfis, as atribuições de jogadores e as configurações globais da extensão.

A Scene conterá apenas referências opcionais entre tokens e perfis:

```ts
Item.metadata[PROFILE_REFERENCE_KEY]
```

## 14.2 Leitura

Utilizar:

```ts
OBR.room.getMetadata()
```

O repositório deverá validar e migrar o valor obtido antes de entregá-lo ao restante da aplicação.

## 14.3 Escrita

Utilizar:

```ts
OBR.room.setMetadata({
  [ROOM_DATA_KEY]: nextRoomData
})
```

Antes de gravar:

1. reler a versão atual;
2. aplicar a alteração sobre o estado mais recente;
3. validar o schema;
4. simular o tamanho do metadata completo;
5. atualizar `updatedAt` e `updatedBy`;
6. gravar somente a chave da extensão.

## 14.4 Observação de alterações

Utilizar:

```ts
OBR.room.onMetadataChange((metadata) => {
  const roomData =
    parseRoomData(metadata[ROOM_DATA_KEY]);

  rebuildCurrentPlayerActions(roomData);
});
```

Também acompanhar:

```ts
OBR.player.onChange(...)
OBR.party.onChange(...)
OBR.scene.onReadyChange(...)
OBR.scene.items.onChange(...)
```

`OBR.scene.items.onChange` será necessário somente para vínculos opcionais entre tokens e perfis.

## 14.5 Concorrência

Antes de salvar:

1. reler o metadata completo da Room;
2. aplicar a operação sobre a versão mais recente;
3. preservar perfis não alterados;
4. atualizar timestamps;
5. validar o tamanho final;
6. gravar uma atualização parcial com `setMetadata`.

O editor deverá detectar quando o perfil foi alterado depois de ter sido aberto e solicitar recarga ou mesclagem antes de sobrescrever.

---

## 15. Ciclo de vida

```ts
OBR.onReady(async () => {
  await registerTool();
  await registerContextMenu();
  await connectToRoom();

  OBR.scene.onReadyChange(async (ready) => {
    if (ready) {
      await connectToScene();
    } else {
      await disconnectFromScene();
    }
  });
});
```

`connectToRoom` deverá:

1. carregar o Player atual;
2. ler `OBR.room.metadata`;
3. localizar o perfil atribuído;
4. registrar os `ToolAction`;
5. iniciar `OBR.room.onMetadataChange`;
6. iniciar listeners de Player e Party;
7. medir o uso do metadata;
8. testar a disponibilidade do Dice+.

`connectToScene` deverá:

1. observar vínculos opcionais de tokens;
2. registrar ou atualizar o context menu;
3. refletir a Scene atual no editor.

Trocar de Scene não deverá remover os `ToolAction` do perfil ativo.

`disconnectFromScene` deverá:

1. cancelar apenas listeners específicos da Scene;
2. fechar popovers dependentes de tokens;
3. limpar caches de Items;
4. preservar o perfil carregado da Room.

---

## 16. Estrutura sugerida do projeto

```text
quick-actions/
├── public/
│   ├── manifest.json
│   ├── background.html
│   ├── manager.html
│   ├── action-popover.html
│   ├── character-editor.html
│   └── icons/
│       ├── extension.svg
│       └── rpg-awesome/
├── src/
│   ├── background/
│   │   ├── index.ts
│   │   ├── registerTool.ts
│   │   ├── registerToolActions.ts
│   │   ├── registerContextMenu.ts
│   │   ├── roomLifecycle.ts
│   │   └── sceneLifecycle.ts
│   ├── core/
│   │   ├── actions/
│   │   ├── parser/
│   │   ├── variants/
│   │   ├── variables/
│   │   └── validation/
│   ├── systems/
│   │   └── dnd5e-2024/
│   │       ├── index.ts
│   │       ├── advantage.ts
│   │       ├── critical.ts
│   │       └── templates.ts
│   ├── integrations/
│   │   └── dice-plus/
│   │       ├── adapter.ts
│   │       ├── protocol.ts
│   │       └── serializer.ts
│   ├── storage/
│   │   ├── roomProfileRepository.ts
│   │   ├── tokenProfileLinkRepository.ts
│   │   ├── metadataSize.ts
│   │   └── metadataKeys.ts
│   ├── ui/
│   │   ├── manager/
│   │   ├── action-popover/
│   │   └── character-editor/
│   ├── types/
│   └── constants.ts
├── licenses/
│   └── rpg-awesome/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 17. Requisitos funcionais

### RF-001 — Registrar Tool

A extensão deverá registrar exatamente um `Tool` principal com `OBR.tool.create`.

### RF-002 — Registrar ações dinamicamente

A extensão deverá criar um `ToolAction` para cada ação visível do perfil ativo.

### RF-003 — Filtrar pelo Tool ativo

Cada ícone deverá usar:

```ts
filter.activeTools = [TOOL_ID]
```

### RF-004 — Abrir seletor ancorado

O clique em um `ToolAction` deverá abrir um `Popover` usando o `elementId` como `anchorElementId`.

### RF-005 — Criar perfil independente de Scene

O GM deverá conseguir criar e editar um `CharacterActionProfile` pelo `ManifestAction` sem depender de um token.

### RF-006 — Vincular token opcionalmente

O GM deverá poder vincular um Item da layer `"CHARACTER"` a um perfil por `PROFILE_REFERENCE_KEY`.

### RF-007 — Associar jogador

O GM deverá escolher um `Player` retornado por `OBR.party.getPlayers`.

### RF-008 — Carregar perfil próprio

O Player deverá visualizar por padrão o perfil apontado por `playerAssignments[OBR.player.id]`.

### RF-009 — Persistir na Room

Perfis, ações, variáveis e atribuições deverão ser armazenados em `OBR.room.metadata`.

### RF-010 — Persistir entre Scenes

Trocar de Scene dentro da mesma Room não deverá exigir recriação da barra.

### RF-011 — Múltiplas rolagens

Uma Action Definition deverá aceitar dois ou mais Roll Steps ordenados.

### RF-012 — Variantes automáticas

O System Pack deverá gerar as variantes válidas com base no tipo da ação.

### RF-013 — Rolagem crítica

O crítico deverá duplicar apenas termos de dados marcados como dano crítico.

### RF-014 — Integração com Dice+

A execução deverá passar exclusivamente pelo `DicePlusAdapter`.

### RF-015 — Notificação de erro

Falhas deverão ser apresentadas com `OBR.notification.show`.

### RF-016 — Reordenação

O editor deverá permitir reordenar ações e atualizar `sortOrder`.

### RF-017 — Importação e exportação

Um perfil e o conjunto completo da extensão deverão poder ser exportados e importados como JSON versionado.

### RF-018 — Migração de schema

O carregamento deverá verificar `schemaVersion` e aplicar migrações antes do uso.

### RF-019 — Diagnóstico de capacidade

O editor deverá mostrar:

- tamanho do metadata completo da Room;
- tamanho ocupado pela extensão;
- tamanho projetado após a próxima gravação;
- aviso de aproximação do limite.

### RF-020 — Proteção contra excesso

A extensão deverá bloquear sua própria gravação quando a projeção ultrapassar a margem segura configurada.

---

## 18. Requisitos não funcionais

### RNF-001 — Sem backend no MVP

A extensão deverá funcionar como site estático hospedado por HTTPS.

### RNF-002 — TypeScript estrito

O projeto deverá usar `strict: true`.

### RNF-003 — Validação de dados

Metadata e JSON importado deverão ser validados em runtime.

Sugestão:

```text
zod
```

### RNF-004 — Segurança de HTML

Nomes, descrições e expressões não deverão ser inseridos com `innerHTML`.

### RNF-005 — Namespace

Todas as chaves, Tool IDs, Action IDs, Popover IDs e canais próprios deverão usar reverse domain name notation.

### RNF-006 — Acessibilidade

Todo ícone deverá possuir label textual. Botões dos iframes deverão ter `aria-label`.

### RNF-007 — Responsividade

O editor deverá funcionar em desktop e dispositivos móveis.

### RNF-008 — Assets locais

Ícones e estilos do RPG Awesome deverão ser servidos pela própria extensão.

### RNF-009 — Tolerância a falhas

A ausência do Dice+ não deverá impedir a edição ou persistência das barras.

### RNF-010 — Testabilidade

Parser, transformações de variantes, medição de metadata e serialização do Dice+ deverão ser testáveis sem carregar o Owlbear Rodeo.

### RNF-011 — Eficiência de armazenamento

O formato persistido deverá evitar campos derivados, textos redundantes, SVGs, imagens, resultados de rolagem e histórico.

### RNF-012 — Margem operacional

O projeto não deverá presumir que os 16 kB estão integralmente disponíveis, pois outras extensões podem utilizar o mesmo metadata da Room.

---

## 19. Critérios de aceitação do MVP

1. Ao entrar em uma Room, o Tool “Ações rápidas” aparece na toolbar quando uma Scene estiver aberta.
2. Ao ativar o Tool, as ações do perfil do jogador aparecem como `ToolAction`.
3. Cada `ToolAction` utiliza um SVG do RPG Awesome.
4. Ao clicar em uma ação, um Popover aparece ancorado ao botão.
5. O Popover apresenta apenas variantes válidas para a ação.
6. Vantagem transforma o d20 de ataque em `2d20kh1`.
7. Desvantagem transforma o d20 de ataque em `2d20kl1`.
8. Crítico duplica os dados de dano e mantém modificadores constantes.
9. Uma ação pode disparar ataque e dano em sequência.
10. O Dice+ recebe as chamadas na ordem definida.
11. O GM consegue atribuir um perfil a um jogador conectado.
12. A configuração continua disponível após recarregar a sala.
13. A configuração continua disponível após trocar de Scene.
14. Excluir um token vinculado não exclui o perfil.
15. Outro jogador não consegue alterar o perfil.
16. Alterações no perfil atualizam os `ToolAction` sem recarregar a página.
17. O editor informa o tamanho total do metadata da Room.
18. O editor informa o tamanho isolado dos dados da extensão.
19. A extensão simula o tamanho antes de salvar.
20. Uma gravação acima da margem segura é bloqueada.
21. Se o Dice+ não estiver disponível, uma notificação clara é exibida.
22. O projeto não depende de servidor próprio.
23. O JSON exportado pode recriar integralmente os perfis.
24. O código não depende da implementação interna do Dice+ fora do adapter.

---

## 20. Ordem recomendada de implementação

### Fase 1 — Shell da extensão

- Vite;
- TypeScript;
- `manifest.json`;
- `background_url`;
- `ManifestAction`;
- `OBR.onReady`;
- Tool fixo;
- um ToolAction de teste;
- Popover ancorado.

### Fase 2 — Persistência

- `RoomQuickActionsData`;
- `CharacterActionProfile`;
- `OBR.room.getMetadata`;
- `OBR.room.setMetadata`;
- `OBR.room.onMetadataChange`;
- associação a Player;
- medição UTF-8 do metadata;
- simulação de tamanho antes da gravação;
- vínculo opcional com Character Items;
- listeners.

### Fase 3 — Editor

- CRUD de ações;
- seleção de ícones;
- variáveis;
- ordenação;
- importação e exportação;
- validação.

### Fase 4 — Motor de rolagem

- tokenizer;
- parser;
- AST;
- serializador;
- RollSequence;
- execução consecutiva.

### Fase 5 — D&D 2024

- vantagem;
- desvantagem;
- crítico;
- templates de ataque;
- templates de teste;
- custom variants.

### Fase 6 — Dice+

- protocolo;
- handshake;
- adapter;
- timeout;
- mensagens de erro;
- testes integrados.

### Fase 7 — Polimento

- responsividade;
- acessibilidade;
- migrações;
- testes;
- documentação;
- publicação.

---

## 21. Decisões arquiteturais finais

1. **A barra será nativa:** `Tool` + `ToolAction`.
2. **O submenu será nativo e ancorado:** `OBR.popover.open` com `anchorElementId`.
3. **O editor completo usará ManifestAction.**
4. **Perfis e barras serão persistidos em `OBR.room.metadata`.**
5. **A troca de Scene não exigirá recriação da barra.**
6. **Tokens guardarão somente um `profileId` opcional.**
7. **Excluir um token não excluirá automaticamente o perfil.**
8. **O proprietário será salvo em `ownerPlayerId` e `playerAssignments`.**
9. **`createdUserId` não será reinterpretado como propriedade do perfil.**
10. **`localStorage` e Tool metadata guardarão somente preferências locais.**
11. **O tamanho será medido pela serialização JSON em UTF-8.**
12. **A extensão trabalhará com margem abaixo do limite documentado de 16 kB.**
13. **O Core será agnóstico de sistema.**
14. **D&D 2024 será um System Pack.**
15. **O Dice+ ficará isolado em um Dice Adapter.**
16. **As expressões serão transformadas por AST, não por regex.**
17. **Rolagens consecutivas serão uma RollSequence estruturada.**
18. **RPG Awesome será empacotado localmente.**
19. **ToolIcon usará SVG; classes CSS serão usadas somente dentro dos iframes.**
20. **O MVP não tentará implementar toda a linguagem de macros do Roll20.**
21. **A extensão não terá backend próprio.**

---

## 22. Primeira ação de referência

```json
{
  "id": "greataxe-attack",
  "name": "Ataque com Machado Grande",
  "shortLabel": "Machado",
  "description": "Ataque corpo a corpo seguido da rolagem de dano.",
  "icon": "axe",
  "kind": "ATTACK",
  "enabled": true,
  "sortOrder": 10,
  "systemId": "dnd5e-2024",
  "tags": ["weapon", "melee", "strength"],
  "sequence": {
    "version": 1,
    "stopOnError": true,
    "steps": [
      {
        "id": "attack",
        "label": "Ataque",
        "purpose": "ATTACK",
        "expression": "1d20 + {{proficiency}} + {{strength}}",
        "visibility": "PUBLIC",
        "execute": "ALWAYS"
      },
      {
        "id": "damage",
        "label": "Dano",
        "purpose": "DAMAGE",
        "expression": "1d12 + {{strength}}",
        "visibility": "PUBLIC",
        "execute": "ALWAYS",
        "criticalBehavior": "DOUBLE_DICE"
      }
    ]
  },
  "variantPolicy": {
    "allowNormal": true,
    "allowAdvantage": true,
    "allowDisadvantage": true,
    "allowCritical": true,
    "customVariants": [
      {
        "id": "reckless",
        "name": "Ataque Imprudente",
        "icon": "crossed-swords",
        "transformations": [
          {
            "type": "D20_ADVANTAGE",
            "stepPurpose": "ATTACK"
          }
        ]
      }
    ]
  }
}
```

---

## 23. Riscos conhecidos

### Protocolo do Dice+

O protocolo de comunicação pertence a outra extensão e poderá mudar. Mitigação: adapter isolado, handshake e versão explícita.

### Excesso de ToolAction

Muitas ações podem prejudicar a usabilidade em telas pequenas. Mitigação: limite visual e botão “Mais ações”.

### Conflitos de edição

GM e jogador podem editar o mesmo perfil ao mesmo tempo. Mitigação: reler o metadata da Room antes de salvar e detectar `updatedAt`.

### Limite do Room metadata

O metadata completo da Room deve permanecer abaixo de 16 kB e é compartilhado com outras extensões. Mitigação: medir o objeto completo, simular gravações, manter margem, compactar o schema e oferecer exportação JSON.

### Perfis entre Rooms

O perfil persiste entre Scenes da mesma Room, mas não é compartilhado automaticamente com outras Rooms. Mitigação no MVP: importação e exportação JSON; backend opcional em uma versão futura.

### Compatibilidade Roll20

Usuários podem esperar suporte a todas as macros do Roll20. Mitigação: chamar a sintaxe de “inspirada no Roll20” e documentar o subconjunto aceito.

### Ícones do RPG Awesome

O webfont não pode ser usado diretamente como `ToolIcon.icon`. Mitigação: disponibilizar SVGs locais.

### Permissões do Owlbear Rodeo

Permissões da sala podem impedir atualização de Character Items. Mitigação: validar role e permissões e apresentar erro compreensível.

---

## 24. Definição de pronto

O MVP será considerado pronto quando um GM puder:

1. criar um perfil sem depender de uma Scene específica;
2. atribuí-lo a um jogador;
3. vincular opcionalmente um token;
4. cadastrar um ataque e dano;
5. selecionar um ícone RPG Awesome;
6. consultar o uso atual do Room metadata;
7. visualizar o tamanho projetado antes de salvar;
8. salvar o perfil;
9. ver os botões nativos aparecerem para o jogador;
10. trocar de Scene sem perder a barra;
11. clicar no ataque;
12. escolher normal, vantagem, desvantagem ou crítico;
13. ver o Dice+ executar as rolagens na tela;
14. recarregar a sala sem perder a configuração;
15. exportar o perfil como backup JSON.
