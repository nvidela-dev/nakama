import type { ProspectStatus } from "@/shared/contracts/database.generated";
export type CatalogueQuery = Record<string, string | string[] | undefined>;
const keys = [
  "q",
  "region",
  "city",
  "industry",
  "stage",
  "assignee",
  "called",
  "images",
  "identity",
  "classification",
  "match",
  "view",
  "focus",
] as const;
export function catalogueParams(query: CatalogueQuery) {
  const out = new URLSearchParams();
  for (const key of keys) {
    const value = query[key];
    if (typeof value === "string" && value.trim()) out.set(key, value.trim().slice(0, 300));
  }
  const services = query.service;
  for (const name of [
    ...new Set(Array.isArray(services) ? services : services ? [services] : []),
  ].slice(0, 40))
    if (name.trim()) out.append("service", name.trim().slice(0, 200));
  return out;
}
export function catalogueHref(
  params: URLSearchParams,
  overrides: Record<string, string | number | null> = {},
) {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) next.delete(key);
    else next.set(key, String(value));
  }
  return next.size ? "/prospects?" + next.toString() : "/prospects";
}
export type BusinessCard = {
  id: string;
  name: string;
  status: ProspectStatus;
  revision: number;
  assignee_name: string | null;
  city: string;
  industry: string;
  called: boolean;
  latest_outcome: string | null;
  latest_call_note: string | null;
  latest_call_outcome: "deal" | "rejected" | null;
  next_follow_up: string | null;
  open_todos: number;
  image: string | null;
  mine: boolean;
  unassigned: boolean;
  on_board: boolean;
};

export type BrowseResult = {
  cards: BusinessCard[];
  counts: Record<string, number>;
  facets: {
    regions: string[];
    cities: string[];
    industries: string[];
    services: string[];
    owners: { id: string; name: string }[];
  };
};
