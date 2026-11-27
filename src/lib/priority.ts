// Card priority, shared by the server (validation, GraphQL enum) and the client (picker, icons).
// A card's priority is optional: null means none set.

/** From most to least urgent. These are also the GraphQL enum values and what MongoDB stores. */
export const PRIORITIES = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"] as const;

export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  HIGHEST: "Highest",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  LOWEST: "Lowest",
};
