export type AllowedEmail = { id: string; identifier: string };
export type WhitelistStore = {
  list(): Promise<AllowedEmail[]>;
  add(email: string): Promise<void>;
  remove(id: string): Promise<void>;
};

export type AccessRequest = { id: string; email: string; createdAt: number };
export type RequestStore = {
  list(): Promise<AccessRequest[]>;
  create(email: string): Promise<void>;
  remove(id: string): Promise<void>;
};
