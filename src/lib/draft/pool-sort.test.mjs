import assert from "node:assert/strict";
import {
  sortPoolPlayersByField,
  sortPoolPlayersByRankThenField,
  sortPoolSectionsByField,
} from "./pool-sort.ts";
import { groupPoolPlayersIntoSections } from "./pool-sections.ts";
import { formatTotalRallyIndex, parseRallyModifier, sumRallyIndex } from "./rally-modifier.ts";

function player(id, rank, overall) {
  return {
    playerId: id,
    firstName: id,
    lastName: id,
    scores: {
      rank,
      overall,
      displayOffensive: overall,
      displayDefensive: overall,
      displayPsych: overall,
    },
  };
}

const pool = [
  player("a", 3, 0.7),
  player("b", 5, 0.9),
  player("c", 1, 0.4),
  player("d", 5, 0.95),
  player("e", 0, 0.2),
];

const sections = groupPoolPlayersIntoSections(pool);
const descSections = sortPoolSectionsByField(sections, "overall", "desc", "desc");
assert.deepEqual(
  descSections.filter((s) => s.kind === "rank").map((s) => s.rank),
  [5, 3, 1, 0],
  "rank desc should order 5→1",
);
assert.deepEqual(
  descSections.find((s) => s.kind === "rank" && s.rank === 5).players.map((p) => p.playerId),
  ["d", "b"],
  "within rank 5, high overall first",
);

const ascSections = sortPoolSectionsByField(sections, "overall", "desc", "asc");
assert.deepEqual(
  ascSections.filter((s) => s.kind === "rank").map((s) => s.rank),
  [1, 3, 5, 0],
  "rank asc should order 1→5",
);

const ungroupedDesc = sortPoolPlayersByRankThenField(pool, "overall", "desc", "desc");
assert.deepEqual(
  ungroupedDesc.map((p) => p.playerId),
  ["d", "b", "a", "c", "e"],
  "ungrouped desc: rank 5s then 3 then 1 then unranked",
);

const ungroupedAsc = sortPoolPlayersByRankThenField(pool, "overall", "asc", "asc");
assert.deepEqual(
  ungroupedAsc.map((p) => p.playerId),
  ["c", "a", "b", "d", "e"],
  "ungrouped asc: rank 1 then 3 then 5s (low score first within)",
);

const flatScoreDesc = sortPoolPlayersByField(pool, "overall", "desc");
assert.equal(flatScoreDesc[0].playerId, "d");

const modifier = parseRallyModifier("*2");
assert.equal(sumRallyIndex([0.5, 1.0], modifier), 3);
assert.equal(formatTotalRallyIndex([0.5, 1.0], modifier), "3.00");
assert.equal(sumRallyIndex([]), null);

console.log("pool-sort + rally total tests passed");
