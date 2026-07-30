import { ASTNode } from "./ast";

export function resolveVariables(node: ASTNode, variables: Record<string, number>): ASTNode {
  switch (node.type) {
    case "VARIABLE": {
      const val = variables[node.name];
      if (val === undefined) {
        throw new Error(`Variável '{{${node.name}}}' não definida no perfil.`);
      }
      return { type: "NUMBER", value: val };
    }
    case "BINARY_OP":
      return {
        ...node,
        left: resolveVariables(node.left, variables),
        right: resolveVariables(node.right, variables),
      };
    case "GROUP":
      return {
        ...node,
        expression: resolveVariables(node.expression, variables),
      };
    case "DICE":
    case "NUMBER":
      return node;
  }
}
