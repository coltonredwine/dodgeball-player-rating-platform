import assert from "node:assert/strict";
import {
  canPickRank,
  computeRankQuotas,
  quotaCapForTeam,
  rankNeedForTeam,
  totalRankNeedOtherTeams,
} from "./quotas.ts";

function team(id, rankCounts) {
  return { id, rankCounts };
}

function quotasFor(rankCounts, teamCount) {
  return computeRankQuotas(rankCounts, teamCount);
}

const threeTeams = [
  team("A", { 5: 2 }),
  team("B", { 5: 1 }),
  team("C", { 5: 0 }),
];

const rank5Quotas = quotasFor({ 5: 5 }, 3);

assert.equal(rank5Quotas[5].minPerTeam, 1);
assert.equal(rank5Quotas[5].maxPerTeam, 2);

assert.equal(
  canPickRank("B", 5, 1, threeTeams, { 5: 1 }, rank5Quotas, true),
  false,
  "last rank 5 blocked when another team still needs their minimum",
);

assert.equal(
  canPickRank("C", 5, 0, threeTeams, { 5: 1 }, rank5Quotas, true),
  true,
  "team below minimum may take the last rank 5",
);

assert.equal(
  canPickRank("A", 5, 1, [
    team("A", { 5: 1 }),
    team("B", { 5: 1 }),
    team("C", { 5: 0 }),
  ], { 5: 2 }, rank5Quotas, true),
  true,
  "team may take a second rank 5 when enough remain for others' minimums",
);

assert.equal(
  canPickRank("A", 5, 1, [
    team("A", { 5: 1 }),
    team("B", { 5: 1 }),
    team("C", { 5: 0 }),
  ], { 5: 1 }, rank5Quotas, true),
  false,
  "team blocked from second rank 5 when it would strand another team",
);

assert.equal(
  canPickRank("A", 5, 2, threeTeams, { 5: 1 }, rank5Quotas, true),
  false,
  "team at max cannot pick regardless of pool",
);

const rank2Quotas = quotasFor({ 2: 6 }, 3);
assert.equal(rank2Quotas[2].minPerTeam, 2);
assert.equal(rank2Quotas[2].maxPerTeam, 2);

assert.equal(
  canPickRank("A", 2, 2, [
    team("A", { 2: 2 }),
    team("B", { 2: 2 }),
    team("C", { 2: 0 }),
  ], { 2: 2 }, rank2Quotas, true),
  false,
  "team at max cannot pick rank 2",
);

assert.equal(
  canPickRank("A", 2, 2, [
    team("A", { 2: 2 }),
    team("B", { 2: 2 }),
    team("C", { 2: 0 }),
  ], { 2: 3 }, rank2Quotas, true),
  false,
  "team at max cannot pick even with spare pool",
);

const rank2NineQuotas = quotasFor({ 2: 9 }, 3);
assert.equal(rank2NineQuotas[2].minPerTeam, 3);
assert.equal(rank2NineQuotas[2].maxPerTeam, 3);

assert.equal(
  canPickRank("A", 2, 3, [
    team("A", { 2: 3 }),
    team("B", { 2: 2 }),
    team("C", { 2: 0 }),
  ], { 2: 4 }, rank2NineQuotas, true),
  false,
  "9 rank 2s: team at max cannot pick rank 2",
);

assert.equal(
  canPickRank("B", 2, 1, [
    team("A", { 2: 2 }),
    team("B", { 2: 1 }),
    team("C", { 2: 0 }),
  ], { 2: 3 }, rank2NineQuotas, true),
  false,
  "9 rank 2s: cannot take rank 2 when remaining pool cannot satisfy other minimums",
);

assert.equal(
  canPickRank("A", 2, 1, [
    team("A", { 2: 1 }),
    team("B", { 2: 1 }),
    team("C", { 2: 0 }),
  ], { 2: 3 }, rank2NineQuotas, true),
  false,
  "9 rank 2s: cannot hoard rank 2s when another team cannot reach minimum",
);

assert.equal(
  canPickRank("B", 2, 1, [
    team("A", { 2: 2 }),
    team("B", { 2: 1 }),
    team("C", { 2: 0 }),
  ], { 2: 6 }, rank2NineQuotas, true),
  true,
  "9 rank 2s: team may reach minimum when enough rank 2s remain for others",
);

assert.equal(
  canPickRank("B", 2, 1, [
    team("A", { 2: 2 }),
    team("B", { 2: 1 }),
    team("C", { 2: 0 }),
  ], { 2: 3 }, rank2Quotas, true),
  true,
  "team may reach max when others can still meet minimums",
);

assert.equal(
  canPickRank("A", 2, 2, [
    team("A", { 2: 2 }),
    team("B", { 2: 2 }),
    team("C", { 2: 0 }),
  ], { 2: 2 }, rank2Quotas, true),
  false,
  "captain at max blocked from rank needed by team still under minimum",
);

assert.equal(rankNeedForTeam(0, 5, rank5Quotas), 1);
assert.equal(rankNeedForTeam(1, 5, rank5Quotas), 0);
assert.equal(
  totalRankNeedOtherTeams(threeTeams, "C", 5, rank5Quotas),
  0,
  "teams already at or above minimum do not add need",
);

assert.equal(canPickRank("A", 5, 0, threeTeams, { 5: 5 }, rank5Quotas, false), true);

assert.equal(
  quotaCapForTeam("B", 5, 1, threeTeams, { 5: 1 }, rank5Quotas),
  0,
  "cap zero when last rank 5 is reserved for another team's minimum",
);

assert.equal(
  quotaCapForTeam("C", 5, 0, threeTeams, { 5: 1 }, rank5Quotas),
  1,
  "team below minimum may cap at the one remaining rank 5",
);

assert.equal(
  quotaCapForTeam("A", 5, 1, [
    team("A", { 5: 1 }),
    team("B", { 5: 1 }),
    team("C", { 5: 0 }),
  ], { 5: 1 }, rank5Quotas),
  0,
  "cap zero for second rank 5 when it would strand another team",
);

assert.equal(
  quotaCapForTeam("A", 5, 1, [
    team("A", { 5: 1 }),
    team("B", { 5: 1 }),
    team("C", { 5: 0 }),
  ], { 5: 2 }, rank5Quotas),
  1,
  "team may cap at one more rank 5 when enough remain for others' minimums",
);

console.log("quotas.test.mjs passed");
