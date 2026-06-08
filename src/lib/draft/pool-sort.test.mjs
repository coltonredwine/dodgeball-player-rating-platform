import assert from "node:assert/strict";
import {
  sortPoolPlayersByField,
  sortPoolSectionsByField,
} from "./pool-sort.ts";

function player(id, scores) {
  return {
    playerId: id,
    firstName: id,
    lastName: id,
    scores,
  };
}

const rank5Players = [
  player("low", {
    overall: 1,
    displayOffensive: 1,
    displayDefensive: 1,
    displayPsych: 1,
  }),
  player("high", {
    overall: 5,
    displayOffensive: 5,
    displayDefensive: 5,
    displayPsych: 5,
  }),
  player("mid", {
    overall: 3,
    displayOffensive: 3,
    displayDefensive: 3,
    displayPsych: 3,
  }),
];

assert.deepEqual(
  sortPoolPlayersByField(rank5Players, "overall").map((entry) => entry.playerId),
  ["high", "mid", "low"],
);

assert.deepEqual(
  sortPoolPlayersByField(
    [
      player("a", {
        overall: 1,
        displayOffensive: 1,
        displayDefensive: 5,
        displayPsych: 1,
      }),
      player("b", {
        overall: 5,
        displayOffensive: 5,
        displayDefensive: 1,
        displayPsych: 1,
      }),
    ],
    "defensive",
  ).map((entry) => entry.playerId),
  ["a", "b"],
);

const sections = sortPoolSectionsByField(
  [
    {
      kind: "saved",
      players: [player("saved-first", rank5Players[0].scores), player("saved-second", rank5Players[1].scores)],
    },
    { kind: "rank", rank: 5, players: rank5Players },
  ],
  "overall",
);

assert.deepEqual(
  sections[0].players.map((entry) => entry.playerId),
  ["saved-first", "saved-second"],
);
assert.deepEqual(
  sections[1].players.map((entry) => entry.playerId),
  ["high", "mid", "low"],
);

console.log("pool-sort tests passed");
