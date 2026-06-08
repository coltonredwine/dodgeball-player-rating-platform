import assert from "node:assert/strict";

function weightedAverage(a, aWeight, b, bWeight) {
  return (a * aWeight + b * bWeight) / 2;
}

function computePsychFactor(psych) {
  const maxPsych = 1.2;
  const base = 0.95;
  const exponent = 1.5;
  const normalized = Math.pow((psych * 6 - 1) / 6, exponent);
  return 0.95 * Math.pow(maxPsych / base, normalized);
}

function roundScore(n, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function computeScoresFromMetrics(metrics) {
  const { power, accuracy, catching, evasion, intimidation, nerve } = metrics;
  const offensive = (weightedAverage(power, 0.35, accuracy, 0.65) * 2) / 6;
  const defensive = (weightedAverage(catching, 0.65, evasion, 0.35) * 2) / 6;
  const balanced = weightedAverage(offensive, 0.58, defensive, 0.42) * 2;
  const psych = (weightedAverage(intimidation, 0.35, nerve, 0.65) * 2) / 6;
  const psychFactor = computePsychFactor(psych);
  const overall = roundScore(balanced * psychFactor);
  let rank = 1;
  if (overall >= 0.605) rank = 2;
  if (overall >= 0.69) rank = 3;
  if (overall >= 0.805) rank = 4;
  if (overall >= 1.0) rank = 5;
  return {
    offensive,
    defensive,
    psych,
    overall,
    rank,
    displayOffensive: roundScore(offensive * 6),
    displayDefensive: roundScore(defensive * 6),
    displayPsych: roundScore(psych * 6),
  };
}

const fixtures = [
  {
    name: "Lexi Adsit",
    metrics: { power: 2, accuracy: 2, intimidation: 2, catching: 3.5, evasion: 3, nerve: 2.5 },
    expected: { displayOffensive: 2, displayDefensive: 3.32, displayPsych: 2.33, overall: 0.41, rank: 1 },
  },
  {
    name: "Patrick Barna",
    metrics: { power: 5.25, accuracy: 5.75, intimidation: 4.75, catching: 4.75, evasion: 4.25, nerve: 5.25 },
    expected: { displayOffensive: 5.58, displayDefensive: 4.57, displayPsych: 5.08, overall: 0.93, rank: 4 },
  },
  {
    name: "Stephen Cantu",
    metrics: { power: 4.75, accuracy: 3.75, intimidation: 3.5, catching: 4, evasion: 3.75, nerve: 4 },
    expected: { displayOffensive: 4.1, displayDefensive: 3.91, displayPsych: 3.83, overall: 0.69, rank: 3 },
  },
];

for (const fixture of fixtures) {
  const result = computeScoresFromMetrics(fixture.metrics);
  for (const key of ["displayOffensive", "displayDefensive", "displayPsych", "overall"]) {
    assert.equal(
      result[key],
      fixture.expected[key],
      `${fixture.name} ${key}: expected ${fixture.expected[key]}, got ${result[key]}`,
    );
  }
  assert.equal(result.rank, fixture.expected.rank, `${fixture.name} rank`);
}

console.log(`rankings parity: ${fixtures.length} fixtures passed`);
