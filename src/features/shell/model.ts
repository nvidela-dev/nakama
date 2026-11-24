export type HomeActivityItem = {
  id: string;
  source: "explorations" | "consultancy" | "jobs";
  title: string;
  action: string;
  href: string;
  occurredAt: string;
  dateOnly?: boolean;
};
