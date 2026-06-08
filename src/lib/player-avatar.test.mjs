import assert from "node:assert/strict";
import test from "node:test";
import {
  extractInstagramProfileImage,
  extractInstagramUsername,
  isInstagramProfileUrl,
  normalizeProfileLink,
  profileLinksMatch,
} from "./player-avatar.ts";

test("isInstagramProfileUrl accepts profile links", () => {
  assert.equal(isInstagramProfileUrl("https://www.instagram.com/ajeckstein"), true);
  assert.equal(isInstagramProfileUrl("https://instagram.com/ajeckstein/"), true);
  assert.equal(isInstagramProfileUrl("https://twitter.com/user"), false);
});

test("normalizeProfileLink treats trailing slash and www as equivalent", () => {
  assert.equal(
    normalizeProfileLink("https://www.instagram.com/ajeckstein/"),
    normalizeProfileLink("https://instagram.com/ajeckstein"),
  );
  assert.equal(
    profileLinksMatch("https://www.instagram.com/ajeckstein/", "https://instagram.com/ajeckstein"),
    true,
  );
});

test("extractInstagramUsername parses common profile URLs", () => {
  assert.equal(extractInstagramUsername("https://www.instagram.com/ajeckstein"), "ajeckstein");
  assert.equal(extractInstagramUsername("https://www.instagram.com/Alexkchvz/"), "Alexkchvz");
  assert.equal(extractInstagramUsername("https://www.instagram.com/p/abc123/"), null);
});

test("extractInstagramProfileImage still parses legacy HTML", () => {
  const html =
    '<img alt="Profile photo" class="_aadp" src="https://cdn.example.com/pic.jpg?a=1&amp;b=2" />';
  assert.equal(
    extractInstagramProfileImage(html),
    "https://cdn.example.com/pic.jpg?a=1&b=2",
  );
});
