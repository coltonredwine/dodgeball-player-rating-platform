import assert from "node:assert/strict";
import {
  allocateOffClockPickNumber,
  buildLowestAverageNextRoundQueue,
  buildLowestAverageTurnQueue,
  findNextLowestAverageSlot,
  getTeamsPickedInOpenRound,
  parsePickOrderMode,
  rosterAverageOverall,
} from "./pick-order.ts";

assert.equal(parsePickOrderMode("snake"), "snake");
assert.equal(parsePickOrderMode("lowest_avg"), "lowest_avg");
assert.equal(parsePickOrderMode("nope"), "snake");

assert.equal(rosterAverageOverall([]), null);
assert.equal(rosterAverageOverall([{ overall: 0.5 }, { overall: 0.7 }]), 0.6);

assert.deepEqual([...getTeamsPickedInOpenRound([])], []);
assert.deepEqual([...getTeamsPickedInOpenRound([{ teamId: "A" }, { teamId: "B" }])].sort(), [
  "A",
  "B",
]);
assert.deepEqual(
  [...getTeamsPickedInOpenRound([{ teamId: "A" }, { teamId: "B" }, { teamId: "C" }, { teamId: "A" }])],
  ["A"],
);

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

// Fresh round queue lists each captain once.
const freshQueue = buildLowestAverageTurnQueue(1, teams, 8);
assert.deepEqual(
  freshQueue.map((slot) => slot.teamId),
  ["C", "B", "A"],
);

// After C picks, remaining this round are B then A; C appears under next round.
const afterC = new Set(["C"]);
assert.deepEqual(findNextLowestAverageSlot(2, teams, undefined, undefined, afterC), {
  pickNumber: 2,
  teamId: "B",
});
assert.deepEqual(
  buildLowestAverageTurnQueue(2, teams, 8, undefined, undefined, afterC).map((s) => s.teamId),
  ["B", "A"],
);
assert.deepEqual(
  buildLowestAverageNextRoundQueue(
    [
      { id: "A", pickOrder: 1, remainingPicks: 2, rosterAverage: 0.8 },
      { id: "B", pickOrder: 2, remainingPicks: 2, rosterAverage: 0.5 },
      { id: "C", pickOrder: 3, remainingPicks: 1, rosterAverage: 0.4 },
    ],
    afterC,
  ).map((s) => s.teamId),
  ["C"],
);

// After everyone picked, next round starts fresh with no preview list.
const afterAll = new Set(["A", "B", "C"]);
assert.deepEqual(findNextLowestAverageSlot(4, teams, undefined, undefined, afterAll), {
  pickNumber: 4,
  teamId: "C",
});
assert.deepEqual(buildLowestAverageNextRoundQueue(teams, afterAll), []);

assert.equal(allocateOffClockPickNumber(5, new Set([1, 2, 3, 4])), 6);
assert.equal(allocateOffClockPickNumber(5, new Set([1, 2, 3, 4, 6])), 7);

console.log("pick-order tests passed");
