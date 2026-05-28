export const METRIC_FIELDS = [
  "power",
  "accuracy",
  "intimidation",
  "catching",
  "evasion",
  "nerve",
] as const;

export type MetricField = (typeof METRIC_FIELDS)[number];

export const METRIC_HELP: Record<MetricField, string> = {
  power: "Throwing power and velocity impact.",
  accuracy: "Ability to hit intended targets reliably.",
  intimidation:
    "Presence, reputation, or confidence that forces mistakes before throws.",
  catching: "Ability to secure live-ball catches consistently.",
  evasion: "Dodging and blocking effectiveness under pressure.",
  nerve:
    'Strategy, composure, teamwork, clutch consistency, and overall "it factor."',
};

export const DEFAULT_SEASON = "Current Season";
