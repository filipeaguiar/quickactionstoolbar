export type TokenType =
  | "DICE"
  | "NUMBER"
  | "VARIABLE"
  | "PLUS"
  | "MINUS"
  | "MULTIPLY"
  | "KEEP_HIGHEST"
  | "KEEP_LOWEST"
  | "DROP_HIGHEST"
  | "DROP_LOWEST"
  | "MIN"
  | "MAX"
  | "EXPLODE"
  | "REROLL"
  | "DICE_MODEL"
  | "LABEL"
  | "LPAREN"
  | "RPAREN"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export class ParseError extends Error {
  constructor(message: string, public position: number, public tokenValue?: string) {
    super(`${message} na posição ${position}`);
    this.name = "ParseError";
  }
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (char === "+") {
      tokens.push({ type: "PLUS", value: "+", position: i });
      i++;
      continue;
    }

    if (char === "-") {
      tokens.push({ type: "MINUS", value: "-", position: i });
      i++;
      continue;
    }

    if (char === "*") {
      tokens.push({ type: "MULTIPLY", value: "*", position: i });
      i++;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "LPAREN", value: "(", position: i });
      i++;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: "RPAREN", value: ")", position: i });
      i++;
      continue;
    }

    // LABEL: # followed by anything until end or operators (+, -, *)
    if (char === "#") {
      const start = i;
      let label = "";
      i++; // skip #
      while (i < input.length && !["+", "-", "*", ")"].includes(input[i])) {
        label += input[i];
        i++;
      }
      tokens.push({ type: "LABEL", value: label.trim(), position: start });
      continue;
    }

    // VARIABLE: {{var}}
    if (char === "{" && input[i + 1] === "{") {
      const start = i;
      i += 2; // skip {{
      let varName = "";
      while (i < input.length && !(input[i] === "}" && input[i + 1] === "}")) {
        varName += input[i];
        i++;
      }
      if (i >= input.length) {
        throw new ParseError("Variável não fechada (faltou }})", start, varName);
      }
      i += 2; // skip }}
      tokens.push({ type: "VARIABLE", value: varName.trim(), position: start });
      continue;
    }

    // DICE_MODEL: {Model Name}
    if (char === "{") {
      const start = i;
      i++; // skip {
      let modelName = "";
      while (i < input.length && input[i] !== "}") {
        modelName += input[i];
        i++;
      }
      if (i >= input.length) {
        throw new ParseError("Modelo não fechado (faltou })", start, modelName);
      }
      i++; // skip }
      tokens.push({ type: "DICE_MODEL", value: modelName.trim(), position: start });
      continue;
    }

    // Modificadores que começam com letras (kh, kl, dh, dl, min, max, r)
    // Precisamos tratar isso antes dos números se eles não estiverem acoplados a dados?
    // Na notação Dice+, kh1, min10 vêm imediatamente após o dado ou na sequência.
    // Vamos capturar k, d, m, r
    
    // REROLL
    if (char === "r") {
      const start = i;
      const match = input.slice(i).match(/^r([or]?(?:[<>]?\d+(?:,\d+)*(?::\d+)?)?)/i);
      if (match) {
        tokens.push({ type: "REROLL", value: match[0], position: start });
        i += match[0].length;
        continue;
      }
    }

    // KEEP / DROP
    if (char === "k" || char === "d") {
      const start = i;
      const match = input.slice(i).match(/^(kh|kl|dh|dl)(\d*)/i);
      if (match) {
        const typeMatch = match[1].toLowerCase();
        let tokenType: TokenType = "KEEP_HIGHEST";
        if (typeMatch === "kl") tokenType = "KEEP_LOWEST";
        if (typeMatch === "dh") tokenType = "DROP_HIGHEST";
        if (typeMatch === "dl") tokenType = "DROP_LOWEST";
        
        tokens.push({ type: tokenType, value: match[0], position: start });
        i += match[0].length;
        continue;
      }
    }

    // MIN / MAX
    if (char === "m") {
      const start = i;
      const match = input.slice(i).match(/^(min|max)(\d+)/i);
      if (match) {
        const typeMatch = match[1].toLowerCase();
        tokens.push({ type: typeMatch === "min" ? "MIN" : "MAX", value: match[0], position: start });
        i += match[0].length;
        continue;
      }
    }

    // EXPLODE
    if (char === "!" || char === "e") {
      const start = i;
      // ! ou e, opcionalmente seguido de números, virgulas, >, <, :
      const match = input.slice(i).match(/^[!e](?:[<>]?\d+(?:,\d+)*(?::\d+)?)?/i);
      if (match) {
        tokens.push({ type: "EXPLODE", value: match[0], position: start });
        i += match[0].length;
        continue;
      }
    }

    // DICE OR NUMBER
    if (/[0-9]/.test(char) || char === "d") {
      const start = i;
      // Match DICE: [N]d[X]
      // Tentar match de dado primeiro
      const diceMatch = input.slice(i).match(/^(\d*)d(\d+|F)/i);
      if (diceMatch) {
        tokens.push({ type: "DICE", value: diceMatch[0], position: start });
        i += diceMatch[0].length;
        continue;
      }

      // Se não for dado, é NUMBER
      const numberMatch = input.slice(i).match(/^\d+/);
      if (numberMatch) {
        tokens.push({ type: "NUMBER", value: numberMatch[0], position: start });
        i += numberMatch[0].length;
        continue;
      }
    }

    throw new ParseError(`Caractere inesperado '${char}'`, i, char);
  }

  tokens.push({ type: "EOF", value: "", position: i });
  return tokens;
}
