import assert from "node:assert/strict";
import {
  allocateOffClockPickNumber,
  findNextLowestAverageSlot,
  buildLowestAverageTurnQueue,
  parsePickOrderMode,
  rosterAverageOverall,
} from "./pick-order.ts";

assert.equal(parsePickOrderMode("snake"), "snake");
assert.equal(parsePickOrderMode("lowest_avg"), "lowest_avg");
assert.equal(parsePickOrderMode("nope"), "snake");

assert.equal(rosterAverageOverall([]), null);
assert.equal(rosterAverageOverall([{ overall: 0.5 }, { overall: 0.7 }]), 0.6);

const teams = [
  { id: "A", pickOrder: 1, remainingPicks: 2, rosterAverage: 0.8 },
  { id: "B", pickOrder: 2, remainingPicks: 2, rosterAverage: 0.5 },
  { id: "C", pickOrder: 3, remainingPicks: 2, rosterAverage: null },
];

assert.deepEqual(findNextLowestAverageSlot(1, teams), {
  pickNumber: 1,
  teamId: "C",
});

assert.deepEqual(
  findNextLowestAverageSlot(1, teams, { A: true, B: true, C: false }),
  { pickNumber: 1, teamId: "B" },
);

assert.deepEqual(
  findNextLowestAverageSlot(3, teams, undefined, new Set([3])),
  { pickNumber: 4, teamId: "C" },
);

const queue = buildLowestAverageTurnQueue(1, teams, 3);
assert.equal(queue[0]?.teamId, "C");
// Simulated queue does not update averages, so empty/lowest team keeps picking while remaining > 0.
assert.equal(queue[1]?.teamId, "C");
assert.equal(queue[2]?.teamId, "B");

assert.equal(allocateOffClockPickNumber(5, new Set([1, 2, 3, 4])), 6);
assert.equal(allocateOffClockPickNumber(5, new Set([1, 2, 3, 4, 6])), 7);

console.log("pick-order tests passed");
