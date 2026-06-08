import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveGhostRosterPlayers,
  sortUndraftedWithBookmarks,
} from "./bookmarks.ts";

test("sortUndraftedWithBookmarks puts flagged players first in bookmark order", () => {
  const players = [
    { playerId: "a", name: "A" },
    { playerId: "b", name: "B" },
    { playerId: "c", name: "C" },
    { playerId: "d", name: "D" },
  ];

  const sorted = sortUndraftedWithBookmarks(players, ["c", "a"]);
  assert.deepEqual(
    sorted.map((player) => player.playerId),
    ["c", "a", "b", "d"],
  );
});

test("resolveGhostRosterPlayers returns bookmarked undrafted players not on roster", () => {
  const undrafted = [
    { playerId: "a", name: "A" },
    { playerId: "b", name: "B" },
    { playerId: "c", name: "C" },
  ];

  const ghosts = resolveGhostRosterPlayers(["b", "c", "d"], ["a"], undrafted);
  assert.deepEqual(
    ghosts.map((player) => player.playerId),
    ["b", "c"],
  );
});

test("resolveGhostRosterPlayers drops players drafted by another team", () => {
  const undrafted = [{ playerId: "a", name: "A" }];
  const ghosts = resolveGhostRosterPlayers(["a", "b"], [], undrafted);
  assert.deepEqual(
    ghosts.map((player) => player.playerId),
    ["a"],
  );
});
