import { describe, it, expect } from "vitest";
import { tokenize, ParseError } from "../src/core/parser/tokens";

describe("Tokenizer (Lexer)", () => {
  it("should tokenize basic dice expressions", () => {
    const tokens = tokenize("1d20 + 5");
    expect(tokens).toEqual([
      { type: "DICE", value: "1d20", position: 0 },
      { type: "PLUS", value: "+", position: 5 },
      { type: "NUMBER", value: "5", position: 7 },
      { type: "EOF", value: "", position: 8 }
    ]);
  });

  it("should tokenize complex dice+ modifiers", () => {
    const tokens = tokenize("2d20dl1{Red} + {{strength}} # Fire damage");
    expect(tokens).toEqual([
      { type: "DICE", value: "2d20", position: 0 },
      { type: "DROP_LOWEST", value: "dl1", position: 4 },
      { type: "DICE_MODEL", value: "Red", position: 7 },
      { type: "PLUS", value: "+", position: 13 },
      { type: "VARIABLE", value: "strength", position: 15 },
      { type: "LABEL", value: "Fire damage", position: 28 },
      { type: "EOF", value: "", position: 41 }
    ]);
  });

  it("should tokenize exploding, reroll, min, max", () => {
    const tokens = tokenize("3d6!1,6:3 r<3 min2 max10");
    expect(tokens).toMatchObject([
      { type: "DICE", value: "3d6" },
      { type: "EXPLODE", value: "!1,6:3" },
      { type: "REROLL", value: "r<3" },
      { type: "MIN", value: "min2" },
      { type: "MAX", value: "max10" },
      { type: "EOF", value: "" }
    ]);
  });

  it("should handle parentheses", () => {
    const tokens = tokenize("2 * (1d4 + 1)");
    expect(tokens).toMatchObject([
      { type: "NUMBER", value: "2" },
      { type: "MULTIPLY", value: "*" },
      { type: "LPAREN", value: "(" },
      { type: "DICE", value: "1d4" },
      { type: "PLUS", value: "+" },
      { type: "NUMBER", value: "1" },
      { type: "RPAREN", value: ")" },
      { type: "EOF", value: "" }
    ]);
  });

  it("should throw ParseError on invalid character", () => {
    expect(() => tokenize("1d20 ^ 2")).toThrowError(ParseError);
    expect(() => tokenize("1d20 ^ 2")).toThrowError("Caractere inesperado '^'");
  });
});

import { parseExpression } from "../src/core/parser/parser";

describe("Parser (AST Builder)", () => {
  it("should parse basic math and precedence", () => {
    const ast = parseExpression("1d20 + 2 * 3");
    
    // '*' has higher precedence than '+'
    expect(ast.type).toBe("BINARY_OP");
    if (ast.type === "BINARY_OP") {
      expect(ast.operator).toBe("+");
      expect(ast.left.type).toBe("DICE");
      expect(ast.right.type).toBe("BINARY_OP");
    }
  });

  it("should parse dice with all Dice+ modifiers", () => {
    const ast = parseExpression("4d6dl1!6r1min2max5{Red} # Atributo");
    expect(ast.type).toBe("DICE");
    if (ast.type === "DICE") {
      expect(ast.count).toBe(4);
      expect(ast.sides).toBe(6);
      expect(ast.drop).toEqual({ mode: "LOWEST", count: 1 });
      expect(ast.explode).toBe("!6");
      expect(ast.reroll).toBe("r1");
      expect(ast.min).toBe(2);
      expect(ast.max).toBe(5);
      expect(ast.model).toBe("Red");
      expect(ast.label).toBe("Atributo");
    }
  });

  it("should throw ParseError on syntax error", () => {
    expect(() => parseExpression("1d20 + + 5")).toThrowError(ParseError);
    expect(() => parseExpression("(1d20 + 5")).toThrowError("Esperado ')'");
  });
});

import { resolveVariables } from "../src/core/parser/resolver";
import { serializeAST } from "../src/core/parser/serializer";

describe("Resolver and Serializer", () => {
  it("should resolve variables in AST", () => {
    const ast = parseExpression("1d20 + {{str}} + {{prof}}");
    const resolved = resolveVariables(ast, { str: 4, prof: 3 });
    
    // Original AST still has VARIABLES
    expect(serializeAST(ast)).toBe("1d20 + {{str}} + {{prof}}");
    
    // Resolved AST has NUMBERS
    expect(serializeAST(resolved)).toBe("1d20 + 4 + 3");
  });

  it("should throw error when variable is missing", () => {
    const ast = parseExpression("1d20 + {{missing}}");
    expect(() => resolveVariables(ast, { str: 4 })).toThrowError("Variável '{{missing}}' não definida");
  });

  it("should serialize complex Dice+ node correctly", () => {
    const ast = parseExpression("4d6dl1!6r1min2max5{Red} # Atributo");
    const serialized = serializeAST(ast);
    expect(serialized).toBe("4d6dl1min2max5!6r1{Red} # Atributo");
  });
});
