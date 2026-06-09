import assert from "node:assert/strict";
import {
  canTeamGiveRank,
  canTeamReceiveRank,
  computeRankQuotas,
} from "./quotas.ts";

const quotas = computeRankQuotas({ 5: 4, 4: 4, 3: 4, 2: 4, 1: 4 }, 4);

assert.equal(canTeamGiveRank(1, 5, quotas, true), false);
assert.equal(canTeamGiveRank(2, 5, quotas, true), true);
assert.equal(canTeamGiveRank(1, 5, quotas, false), true);
assert.equal(canTeamReceiveRank(0, 5, quotas, true), true);
assert.equal(canTeamReceiveRank(1, 5, quotas, true), false);

console.log("trades tests passed");
