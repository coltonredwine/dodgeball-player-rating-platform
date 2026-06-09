import assert from "node:assert/strict";
import { computeMaxPickNumber, findNextActivePickSlot, getTeamForPick } from "./snake.ts";

const teams = [
  { id: "A", pickOrder: 1 },
  { id: "B", pickOrder: 2 },
  { id: "C", pickOrder: 3 },
];

assert.equal(getTeamForPick(1, teams)?.id, "A");
assert.equal(getTeamForPick(2, teams)?.id, "B");
assert.equal(getTeamForPick(3, teams)?.id, "C");
assert.equal(getTeamForPick(4, teams)?.id, "C");

assert.deepEqual(
  findNextActivePickSlot(1, teams, { A: 0, B: 1, C: 1 }, 6),
  { pickNumber: 2, teamId: "B" },
);

assert.deepEqual(
  findNextActivePickSlot(4, teams, { A: 0, B: 1, C: 2 }, 6),
  { pickNumber: 4, teamId: "C" },
);

assert.equal(
  findNextActivePickSlot(1, teams, { A: 0, B: 0, C: 0 }, 6),
  null,
);

assert.deepEqual(
  findNextActivePickSlot(1, teams, { A: 1, B: 1, C: 1 }, 6, { A: false, B: true, C: true }),
  { pickNumber: 2, teamId: "B" },
);

const remaining = { A: 1, B: 0, C: 0 };
const poolPickSlots = 26;
const maxPickNumber = computeMaxPickNumber(25, teams.length, remaining, poolPickSlots);
assert.ok(maxPickNumber >= 25);
assert.equal(findNextActivePickSlot(25, teams, remaining, 24), null);
assert.deepEqual(
  findNextActivePickSlot(25, teams, remaining, maxPickNumber),
  { pickNumber: 25, teamId: "A" },
);

console.log("snake tests passed");
