import { Token, tokenize, ParseError } from "./tokens";
import { ASTNode, DiceNode, NumberNode, VariableNode, GroupNode } from "./ast";

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(input: string) {
    this.tokens = tokenize(input);
  }

  public parse(): ASTNode {
    const expr = this.expression();
    if (!this.isAtEnd()) {
      const token = this.peek();
      throw new ParseError("Token inesperado ao final da expressão", token.position, token.value);
    }
    return expr;
  }

  private expression(): ASTNode {
    return this.term();
  }

  private term(): ASTNode {
    let expr = this.factor();

    while (this.match("PLUS", "MINUS")) {
      const operator = this.previous().type === "PLUS" ? "+" : "-";
      const right = this.factor();
      expr = {
        type: "BINARY_OP",
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private factor(): ASTNode {
    let expr = this.primary();

    while (this.match("MULTIPLY")) {
      const right = this.primary();
      expr = {
        type: "BINARY_OP",
        operator: "*",
        left: expr,
        right,
      };
    }

    return expr;
  }

  private primary(): ASTNode {
    if (this.match("LPAREN")) {
      const expr = this.expression();
      if (!this.match("RPAREN")) {
        const token = this.peek();
        throw new ParseError("Esperado ')' após a expressão", token.position, token.value);
      }
      return {
        type: "GROUP",
        expression: expr,
      } as GroupNode;
    }

    if (this.match("NUMBER")) {
      return {
        type: "NUMBER",
        value: Number(this.previous().value),
      } as NumberNode;
    }

    if (this.match("VARIABLE")) {
      return {
        type: "VARIABLE",
        name: this.previous().value,
      } as VariableNode;
    }

    if (this.match("DICE")) {
      const diceValue = this.previous().value; // ex: "1d20" or "d6"
      const parts = diceValue.toLowerCase().split("d");
      const count = parts[0] === "" ? 1 : parseInt(parts[0], 10);
      const sides = parts[1].toUpperCase() === "F" ? "F" : parseInt(parts[1], 10);

      const node: DiceNode = {
        type: "DICE",
        count,
        sides,
      };

      // Loop for modifiers
      while (true) {
        if (this.match("KEEP_HIGHEST", "KEEP_LOWEST")) {
          const val = this.previous().value;
          const kCount = val.length > 2 ? parseInt(val.substring(2)) : 1;
          node.keep = { mode: val.toLowerCase().startsWith("kh") ? "HIGHEST" : "LOWEST", count: kCount };
        } else if (this.match("DROP_HIGHEST", "DROP_LOWEST")) {
          const val = this.previous().value;
          const dCount = val.length > 2 ? parseInt(val.substring(2)) : 1;
          node.drop = { mode: val.toLowerCase().startsWith("dh") ? "HIGHEST" : "LOWEST", count: dCount };
        } else if (this.match("MIN")) {
          node.min = parseInt(this.previous().value.substring(3));
        } else if (this.match("MAX")) {
          node.max = parseInt(this.previous().value.substring(3));
        } else if (this.match("EXPLODE")) {
          node.explode = this.previous().value;
        } else if (this.match("REROLL")) {
          node.reroll = this.previous().value;
        } else if (this.match("DICE_MODEL")) {
          node.model = this.previous().value;
        } else {
          break;
        }
      }

      // Se houver LABEL, ele deve vir depois dos modificadores e é atrelado ao nó final (o DICE se for simples)
      // Nota: o Dice+ permite labels para a expressão toda ("2d6 + 3 # Fire").
      // O parser atual atrela o label ao nó que acabou de processar ou na serialização.
      // Vamos deixar para atrelar LABEL ao nó, no DiceNode por enquanto,
      // ou suportar label no AST em um wrapper?
      // Pela especificação do Dice+, ele fica pendurado onde o usuário digitar.
      // Vamos adicionar ao DiceNode se estiver logo em seguida
      if (this.match("LABEL")) {
        node.label = this.previous().value;
      }

      return node;
    }

    const token = this.peek();
    throw new ParseError(`Expressão inesperada '${token.value}'`, token.position, token.value);
  }

  private match(...types: string[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}

export function parseExpression(input: string): ASTNode {
  return new Parser(input).parse();
}
