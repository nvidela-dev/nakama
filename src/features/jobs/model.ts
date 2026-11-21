export const jobStages = {
  pursuing: "Pursuing",
  applied: "Applied",
  interview: "Interviewing",
  offer: "Offer",
  closed: "Closed",
} as const;
export const jobEvents = {
  application: "Application sent",
  contact: "Recruiter contact",
  reply: "Reply received",
  interview: "Interview round",
  feedback: "Interview feedback",
  offer: "Offer received",
  rejected: "Rejected",
  withdrawn: "Withdrew",
  note: "Note",
} as const;
export const availabilityLabels = {
  current: "Current",
  historical: "Historical",
  unknown: "Unknown",
} as const;
export type JobStage = keyof typeof jobStages;
export type JobEvent = keyof typeof jobEvents;
export function sourceLink(raw: string | null) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return (u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function jobDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
