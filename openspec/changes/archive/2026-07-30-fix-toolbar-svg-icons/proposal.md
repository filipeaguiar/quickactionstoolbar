## Why

Os ícones RPG Awesome exibidos pelo Tool e pelos ToolActions do Owlbear Rodeo estão inconsistentes ou aparentemente corrompidos. A integração entrega URLs válidas, mas os SVGs publicados foram adaptados manualmente, usam preenchimento branco fixo e não têm um contrato verificável de dimensões/renderização, o que pode torná-los invisíveis ou inadequados ao processamento e aos temas do Owlbear.

## What Changes

- Formalizar o formato de ícone aceito pela integração com o Owlbear Rodeo: URL HTTP(S) absoluta para um SVG estático, válido, monocromático e com geometria/viewBox preservados.
- Substituir a coleção RPG Awesome adaptada manualmente por assets gerados de forma determinística a partir dos glifos oficiais, sem alterar ou simplificar seus paths.
- Tornar os SVGs compatíveis com a renderização da barra do Owlbear, usando dimensões, viewBox e pintura monocromática consistentes.
- Validar IDs de ícone contra a coleção permitida e usar um fallback conhecido quando dados persistidos contiverem um ID ausente ou inválido.
- Adicionar verificações automatizadas para formato, disponibilidade no build e resolução de URL dos ícones usados pelo Tool, ToolActions, overflow e menu de contexto.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `extension-shell-ui`: definir o contrato de assets SVG e o comportamento de fallback para todos os ícones registrados nas APIs de Tool e Context Menu do Owlbear Rodeo.

## Impact

Afeta `public/icons/rpg-awesome/`, `src/utils/iconResolver.ts`, os registros em `src/background/` e os testes do shell/build. Não altera o modelo persistido de ações nem a API pública do Owlbear; mantém `@owlbear-rodeo/sdk` e `rpg-awesome` como dependências existentes.
