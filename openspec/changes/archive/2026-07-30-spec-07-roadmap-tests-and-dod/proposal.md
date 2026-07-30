## Why

Para consolidar o projeto Quick Actions Toolbar, precisamos garantir que todos os 15 critérios de aceitação da Matriz de Definition of Done (DoD) sejam verificados, os testes unitários e de integração desacoplados estejam operacionais e a validação final da build de produção (`npm run build`) esteja em conformidade.

## What Changes

- Implementação do suite de testes de validação do Definition of Done em `tests/dod.test.ts`.
- Validação end-to-end de compilação TypeScript com `strict: true` e empacotamento Vite.
- Verificação de cobertura para medidor de armazenamento (UTF-8/15KB), permissões GM vs Player, Parser/AST, D&D 2024 System Pack e Dice+ Adapter.

## Capabilities

### New Capabilities

- `roadmap-tests-and-dod`: Suíte de testes finais de integração e verificação da matriz Definition of Done para MVP da Quick Actions Toolbar.

### Modified Capabilities

(nenhuma)

## Impact

- `tests/dod.test.ts`: Novo arquivo de teste consolidado.
- Garantia de qualidade final e build limpo antes do deploy.
