import assert from "node:assert/strict";
import test from "node:test";
import { groupPoolPlayersIntoSections } from "./pool-sections.ts";

function player(id, rank) {
  return { playerId: id, scores: rank == null ? null : { rank } };
}

test("groupPoolPlayersIntoSections groups by rank in descending order", () => {
  const sections = groupPoolPlayersIntoSections([
    player("a", 3),
    player("b", 5),
    player("c", 4),
    player("d", 5),
  ]);

  assert.deepEqual(
    sections.map((section) =>
      section.kind === "rank" ? [section.rank, section.players.map((p) => p.playerId)] : section.kind,
    ),
    [
      [5, ["b", "d"]],
      [4, ["c"]],
      [3, ["a"]],
    ],
  );
});

test("groupPoolPlayersIntoSections puts bookmarks in a saved section first", () => {
  const sections = groupPoolPlayersIntoSections(
    [player("a", 5), player("b", 3), player("c", 5)],
    { bookmarkIds: ["c", "b"] },
  );

  assert.equal(sections[0]?.kind, "saved");
  assert.deepEqual(
    sections[0].players.map((p) => p.playerId),
    ["c", "b"],
  );
  assert.deepEqual(
    sections.slice(1).map((section) => section.kind === "rank" && section.rank),
    [5],
  );
});
