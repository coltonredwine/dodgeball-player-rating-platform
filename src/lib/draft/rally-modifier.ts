export type RallyModifierOp = {
  op: "*" | "/" | "+" | "-";
  value: number;
};

const MODIFIER_PATTERN = /^\s*([*×xX+/−-])\s*(-?\d+(?:\.\d+)?)\s*$/;

/** Parse admin input like `*2`, `+1`, `/2`, or `-0.5`. Empty/invalid → null (no change). */
export function parseRallyModifier(raw: string | null | undefined): RallyModifierOp | null {
  if (!raw || !raw.trim()) return null;
  const match = raw.trim().match(MODIFIER_PATTERN);
  if (!match) return null;

  const symbol = match[1]!;
  const value = Number(match[2]);
  if (!Number.isFinite(value)) return null;

  let op: RallyModifierOp["op"];
  if (symbol === "*" || symbol === "×" || symbol === "x" || symbol === "X") op = "*";
  else if (symbol === "/") op = "/";
  else if (symbol === "+") op = "+";
  else op = "-";

  if (op === "/" && value === 0) return null;
  return { op, value };
}

export function applyRallyModifier(overall: number, modifier: RallyModifierOp | null): number {
  if (!modifier || !Number.isFinite(overall)) return overall;
  switch (modifier.op) {
    case "*":
      return overall * modifier.value;
    case "/":
      return overall / modifier.value;
    case "+":
      return overall + modifier.value;
    case "-":
      return overall - modifier.value;
  }
}

/** Display label for masked CALC: Rally Index (RAL). */
export function formatRallyIndex(
  overall: number,
  modifier: RallyModifierOp | null = null,
  digits = 2,
): string {
  const value = applyRallyModifier(overall, modifier);
  return `RAL ${value.toFixed(digits)}`;
}

export function formatModifiedOverall(
  overall: number,
  modifier: RallyModifierOp | null = null,
  digits = 2,
): string {
  return applyRallyModifier(overall, modifier).toFixed(digits);
}

/** Sum of display-modified overalls for a roster (Total RAL). */
export function sumRallyIndex(
  overalls: Array<number | null | undefined>,
  modifier: RallyModifierOp | null = null,
): number | null {
  let total = 0;
  let count = 0;
  for (const overall of overalls) {
    if (overall == null || !Number.isFinite(overall)) continue;
    total += applyRallyModifier(overall, modifier);
    count += 1;
  }
  return count === 0 ? null : total;
}

export function formatTotalRallyIndex(
  overalls: Array<number | null | undefined>,
  modifier: RallyModifierOp | null = null,
  digits = 2,
): string {
  const total = sumRallyIndex(overalls, modifier);
  if (total == null) return "—";
  return total.toFixed(digits);
}
