export const authConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
const privatePrefixes = [
  "/jobs",
  "/admin",
  "/artifacts",
  "/prospects",
  "/projects",
  "/invitations",
];
export const privateRoute = (path: string) =>
  privatePrefixes.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
