export type ASTNode =
  | DiceNode
  | NumberNode
  | VariableNode
  | BinaryOperationNode
  | GroupNode;

export interface DiceNode {
  type: "DICE";
  count: number;
  sides: number | "F"; // F para fate/fudge dice, ou apenas número
  keep?: {
    mode: "HIGHEST" | "LOWEST";
    count: number;
  };
  drop?: {
    mode: "HIGHEST" | "LOWEST";
    count: number;
  };
  min?: number;
  max?: number;
  explode?: string; // string para armazenar a regra exata ex: "!6:3"
  reroll?: string; // string para armazenar a regra exata ex: "r1"
  model?: string;
  label?: string;
}

export interface NumberNode {
  type: "NUMBER";
  value: number;
}

export interface VariableNode {
  type: "VARIABLE";
  name: string;
}

export interface BinaryOperationNode {
  type: "BINARY_OP";
  operator: "+" | "-" | "*";
  left: ASTNode;
  right: ASTNode;
}

export interface GroupNode {
  type: "GROUP";
  expression: ASTNode;
}
