import { ASTNode } from "./ast";

export function serializeAST(node: ASTNode): string {
  switch (node.type) {
    case "DICE": {
      let result = `${node.count}d${node.sides}`;
      
      if (node.keep) {
        const modeStr = node.keep.mode === "HIGHEST" ? "kh" : "kl";
        result += `${modeStr}${node.keep.count}`;
      }
      
      if (node.drop) {
        const modeStr = node.drop.mode === "HIGHEST" ? "dh" : "dl";
        result += `${modeStr}${node.drop.count}`;
      }

      if (node.min !== undefined) result += `min${node.min}`;
      if (node.max !== undefined) result += `max${node.max}`;
      if (node.explode) result += node.explode;
      if (node.reroll) result += node.reroll;
      
      if (node.model) {
        result += `{${node.model}}`;
      }
      
      if (node.label) {
        result += ` # ${node.label}`;
      }
      
      return result;
    }
    case "NUMBER":
      return node.value.toString();
    case "VARIABLE":
      return `{{${node.name}}}`;
    case "BINARY_OP":
      return `${serializeAST(node.left)} ${node.operator} ${serializeAST(node.right)}`;
    case "GROUP":
      return `(${serializeAST(node.expression)})`;
  }
}
