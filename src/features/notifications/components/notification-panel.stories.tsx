import type { Meta } from "@storybook/nextjs-vite";
import { NotificationPanel } from "./notification-panel";
export default { title: "Notifications/Panel" } satisfies Meta;
const actions = {
  busy: false,
  refresh: () => {},
  older: () => {},
  mark: () => {},
  close: () => {},
};
export const Empty = {
  render: () => (
    <NotificationPanel
      {...actions}
      inbox={{ count: 0, items: [], next: undefined }}
      error={false}
    />
  ),
};
export const Failed = { render: () => <NotificationPanel {...actions} inbox={undefined} error /> };
export const Unread = {
  render: () => (
    <NotificationPanel
      {...actions}
      error={false}
      inbox={{
        count: 1,
        items: [
          {
            id: "comment",
            project_id: "demo",
            project_name: "Workshop",
            author_name: "Contributor",
            content: "The prototype is ready for review.",
            created_at: new Date(0),
            cursor_time: "1970-01-01T00:00:00.000000Z",
            stage_id: null,
            node_id: null,
          },
        ],
        next: undefined,
      }}
    />
  ),
};
