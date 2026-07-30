# Índice de Especificações Técnicas — Quick Actions Toolbar

Este diretório contém a documentação de especificações técnicas detalhadas para a implementação da extensão **Quick Actions Toolbar** para o **Owlbear Rodeo 2** (voltada inicialmente para **Dungeons & Dragons 2024** e com suporte ao **Dice+**), baseada nos requisitos consolidados no [SRD.md](file:///home/filipe/Documentos/Projetos/quickactionstoolbar/SRD.md).

---

## 📚 Documentos de Especificação

| Arquivo | Título / Foco Principal | Descrição Sintética |
| :--- | :--- | :--- |
| [01-shell-e-interface.md](file:///home/filipe/Documentos/Projetos/quickactionstoolbar/specs/01-shell-e-interface.md) | **Shell da Extensão e Interface Nativa** | Arquitetura do `background.html`, registro de `Tool` e `ToolAction`, menu ancorado (`Popover`), limite visual (8 botões / overflow) e `ManifestAction` (gerenciador). |
| [02-persistência-capacidade-e-segurança.md](file:///home/filipe/Documentos/Projetos/quickactionstoolbar/specs/02-persistência-capacidade-e-segurança.md) | **Persistência em Room Metadata e Segurança** | Modelo em `OBR.room.metadata`, política de capacidade em bytes UTF-8 (simulação pré-gravação, avisos a 12 KB, bloqueio a 15 KB), autorização GM vs Player e vínculo opcional com Tokens (`CHARACTER`). |
| [03-modelo-de-dados-e-gerenciador.md](file:///home/filipe/Documentos/Projetos/quickactionstoolbar/specs/03-modelo-de-dados-e-gerenciador.md) | **Modelo de Ações, Editor e Ícones** | Schemas TypeScript/Zod de `CharacterActionProfile`, `ActionDefinition`, `RollSequence`, `VariantPolicy`, interface Vue 3 do editor e gerenciador local do RPG Awesome (SVGs locais). |
| [04-parser-e-ast.md](file:///home/filipe/Documentos/Projetos/quickactionstoolbar/specs/04-parser-e-ast.md) | **Motor de Expressões de Rolagem e AST** | Tokenizer, parser descendente recursivo, estrutura de nós AST, resolução de variáveis (`{{var}}`), serialização e mensagens de erro estruturadas. |
| [05-system-pack-dnd2024.md](file:///home/filipe/Documentos/Projetos/quickactionstoolbar/specs/05-system-pack-dnd2024.md) | **System Pack: D&D 2024** | Módulo de regras para D&D 2024, transformações na AST para Vantagem (`2d20kh1`), Desvantagem (`2d20kl1`), Crítico (duplicação de dados em `DOUBLE_DICE`) e variantes customizadas (ex: Ataque Imprudente). |
| [06-adaptador-dice-plus.md](file:///home/filipe/Documentos/Projetos/quickactionstoolbar/specs/06-adaptador-dice-plus.md) | **Integração com Dice+** | Abstração `DiceAdapter`, contrato de protocolo Broadcast API (`DICE_PLUS_PROTOCOL`), handshake, execução sequencial de passos e tratamento para ausência da extensão de dados. |
| [07-roadmap-testes-e-dod.md](file:///home/filipe/Documentos/Projetos/quickactionstoolbar/specs/07-roadmap-testes-e-dod.md) | **Roadmap de Desenvolvimento, Testes e DOD** | Planejamento em 7 fases de implementação, estratégia de testes unitários isolados do OBR SDK, matriz de verificação de critérios de aceitação e Definition of Done. |

---

## 🎯 Princípios Arquiteturais Globais

1. **Barra 100% Nativa do Owlbear Rodeo:** Utilização estrita de `OBR.tool.create`, `OBR.tool.createAction` e `OBR.popover.open` ancorado. Sem injeção de HTML no DOM da aplicação hospedeira.
2. **Fonte Única da Verdade:** `Room.metadata["com.seudominio.quick-actions/room-data"]` armazena todos os perfis e atribuições, permitindo persistência total ao alternar entre Scenes.
3. **AST para Manipulação de Rolagens:** Nenhuma transformação de vantagem/desvantagem/crítico é feita via expressões regulares; todas operam sobre uma Árvore Sintática Abstrata (AST) tipada.
4. **Margem de Segurança Estrita:** Monitoramento de tamanho em bytes UTF-8 com trava de gravação em 15 KB para garantir compatibilidade com o limite de 16 kB do Owlbear Rodeo e prevenir corrupção.
5. **Assets 100% Locais:** Ícones SVG do RPG Awesome empacotados na extensão; sem dependência de CDNs ou servidores externos (arquitetura estática).
