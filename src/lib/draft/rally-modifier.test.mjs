import assert from "node:assert/strict";
import {
  applyRallyModifier,
  formatRallyIndex,
  parseRallyModifier,
} from "./rally-modifier.ts";

assert.equal(parseRallyModifier(""), null);
assert.equal(parseRallyModifier("  "), null);
assert.deepEqual(parseRallyModifier("*2"), { op: "*", value: 2 });
assert.deepEqual(parseRallyModifier("×1.5"), { op: "*", value: 1.5 });
assert.deepEqual(parseRallyModifier("+1"), { op: "+", value: 1 });
assert.deepEqual(parseRallyModifier("-0.5"), { op: "-", value: 0.5 });
assert.deepEqual(parseRallyModifier("/2"), { op: "/", value: 2 });
assert.equal(parseRallyModifier("/0"), null);
assert.equal(parseRallyModifier("2"), null);

assert.equal(applyRallyModifier(0.8, parseRallyModifier("*2")), 1.6);
assert.equal(applyRallyModifier(0.8, parseRallyModifier("+1")), 1.8);
assert.equal(applyRallyModifier(0.8, parseRallyModifier("-0.3")), 0.5);
assert.equal(applyRallyModifier(0.8, parseRallyModifier("/2")), 0.4);
assert.equal(applyRallyModifier(0.8, null), 0.8);

assert.equal(formatRallyIndex(0.8, parseRallyModifier("*2")), "RAL 1.60");

console.log("rally-modifier tests passed");
