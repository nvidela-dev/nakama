export type HomeActivityItem = {
  id: string;
  source: "explorations" | "consultancy" | "jobs";
  title: string;
  action: string;
  href: string;
  occurredAt: string;
  dateOnly?: boolean;
};

export type HomePipelineMetrics = {
  active: number;
  stages: { stage: string; label: string; count: number }[];
};
export type HomeMetrics = {
  explorations: {
    active: number;
    withFlow: number;
    withoutFlow: number;
    parked: number;
    finished: number;
  };
  consultancy: HomePipelineMetrics | null;
  jobs: HomePipelineMetrics | null;
};
