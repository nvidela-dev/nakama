"use client";
import { useRef, useState, useTransition, type ReactNode, type FormEvent } from "react";
import { useHydrated } from "@/shared/lib/use-hydrated";
import { Input, Select, Textarea } from "@/shared/ui/controls";
import { Button } from "@/shared/ui/button";
import { Feedback } from "@/shared/ui/feedback";
import type { ActionState } from "@/shared/contracts/action-state";
import { useT } from "@/shared/i18n/provider";
import { updateProspect, saveProspectImport } from "../actions";
import {
  importChunkSize,
  maxImportBytes,
  outreachKinds,
  statusLabel,
  salesStages,
  kindLabel,
  type CatalogueMember,
  type ProspectCommand,
  type Prospect,
} from "../model";

const value = (data: FormData, name: string) => String(data.get(name) ?? "");
function ChangeForm({
  label,
  children,
  submit,
  reset = false,
}: {
  label: string;
  children?: ReactNode;
  submit: (data: FormData) => Promise<ActionState>;
  reset?: boolean;
}) {
  const t = useT();
  const hydrated = useHydrated();
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    start(async () => {
      let result: ActionState;
      try {
        result = await submit(data);
      } catch {
        result = { error: "Unable to save. Please try again." };
      }
      setState(result);
      if (reset && !result.error) form.reset();
    });
  }
  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-2">
      <fieldset disabled={!hydrated || pending} className="grid gap-2 min-w-0">
        {children}
        <Button type="submit" pending={pending} variant="secondary" className="justify-self-start">
          {t(label)}
        </Button>
      </fieldset>
      <Feedback state={state} />
    </form>
  );
}
export function BoardEntry({
  id,
  revision,
  onBoard,
}: {
  id: string;
  revision: number;
  onBoard: boolean;
}) {
  return (
    <ChangeForm
      label={onBoard ? "Remove from my board" : "Add to my board"}
      submit={() => updateProspect({ type: "my_board", id, revision, enabled: !onBoard })}
    />
  );
}
export function AddProspect() {
  const t = useT();
  const requestId = useRef<string | null>(null);
  return (
    <ChangeForm
      label="Add business"
      reset
      submit={async (data) => {
        requestId.current ??= crypto.randomUUID();
        const result = await updateProspect({
          type: "add",
          record: {
            id: requestId.current,
            name: value(data, "name"),
            details: value(data, "details"),
          },
        });
        if (!result.error) requestId.current = null;
        return result;
      }}
    >
      <label>
        {t("Business name")}
        <Input name="name" required maxLength={300} />
      </label>
      <label>
        {t("Contact details")}
        <Textarea name="details" maxLength={2000} />
      </label>
    </ChangeForm>
  );
}
export function ImportProspects() {
  const t = useT();
  return (
    <ChangeForm
      label="Import businesses"
      reset
      submit={async (data) => {
        const file = data.get("file");
        if (!(file instanceof File) || !file.size || file.size > maxImportBytes)
          return { error: "Choose a catalogue file up to 384 MB." };
        const digest = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())),
          (v) => v.toString(16).padStart(2, "0"),
        ).join("");
        let result = await saveProspectImport(digest, {
          type: "start",
          size: file.size,
        });
        if (result.error) return { error: result.error };
        if (!result.report) {
          for (let i = 0; i < file.size; i += importChunkSize) {
            const part = await saveProspectImport(digest, {
              type: "part",
              position: i / importChunkSize,
              bytes: await file.slice(i, i + importChunkSize).arrayBuffer(),
            });
            if (part.error) return { error: part.error };
          }
          result = await saveProspectImport(digest, { type: "finish" });
        }
        if (!result.report) return { error: result.error ?? "Unable to save. Please try again." };
        return {
          success: t(
            "Import receipt: {count} businesses, {stale} older records skipped, {missing} image files missing.",
            {
              count: result.report.businesses,
              stale: result.report.stale,
              missing: result.report.missingImageFiles,
            },
          ),
        };
      }}
    >
      <label>
        {t("Complete catalogue ZIP or SQLite database")}
        <Input required type="file" name="file" accept=".zip,.db,.sqlite,.sqlite3" />
      </label>
      <p className="text-sm text-muted">
        {t(
          "Include every dossier and referenced attachment. An incomplete import leaves the catalogue unchanged.",
        )}
      </p>
    </ChangeForm>
  );
}
export function InviteCollaborator({
  pending,
}: {
  pending: { email: string; state: "Pending" | "Accepted" | "Expired" | "Revoked" }[];
}) {
  const t = useT();
  return (
    <div className="grid gap-2">
      <ChangeForm
        label="Allow collaborator"
        reset
        submit={(data) => updateProspect({ type: "invite", email: value(data, "email").trim() })}
      >
        <label>
          {t("Collaborator email")}
          <Input type="email" name="email" required />
        </label>
      </ChangeForm>
      <p className="text-sm text-muted">
        {t(
          "Share the catalogue link privately. They can join with this verified email when they open it.",
        )}
      </p>
      {pending.map((i) => (
        <div key={i.email} className="flex gap-2 items-center">
          <span>
            {i.email} · {t(i.state)}
          </span>
          {i.state === "Pending" && (
            <ChangeForm
              label="Cancel invitation"
              submit={() => updateProspect({ type: "cancel_invite", email: i.email })}
            />
          )}
        </div>
      ))}
    </div>
  );
}
export function CatalogueAccess({ members }: { members: CatalogueMember[] }) {
  const t = useT();
  return (
    <ul className="grid gap-3">
      {members.map((m) => (
        <li key={m.user_id} className="flex gap-3 items-center flex-wrap">
          <span>
            {m.display_name} · {t(m.full_access ? "Full catalogue" : "Assigned prospects only")}
          </span>
          <ChangeForm
            label={m.full_access ? "Remove full access" : "Give full access"}
            submit={() =>
              updateProspect({
                type: "access",
                userId: m.user_id,
                enabled: !m.full_access,
              })
            }
          />
          <ChangeForm
            label="Remove collaborator"
            submit={() => updateProspect({ type: "remove", userId: m.user_id })}
          />
        </li>
      ))}
    </ul>
  );
}
export function AssignProspect({
  record,
  members,
}: {
  record: Prospect;
  members: CatalogueMember[];
}) {
  const t = useT();
  return (
    <ChangeForm
      label="Save assignment"
      submit={(data) =>
        updateProspect({
          type: "assign",
          id: record.id,
          revision: record.revision,
          assignee: value(data, "assignee") || null,
        })
      }
    >
      <label>
        {t("Assigned to")}
        <Select name="assignee" key={record.assignee_id} defaultValue={record.assignee_id ?? ""}>
          <option value="">{t("Unassigned")}</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.display_name}
            </option>
          ))}
        </Select>
      </label>
    </ChangeForm>
  );
}
export function LogOutreach({ record }: { record: Prospect }) {
  const t = useT();
  return (
    <ChangeForm
      label="Save update"
      reset
      submit={(data) => {
        const kind = outreachKinds.find((k) => k === value(data, "kind"))!;
        const command: ProspectCommand = {
          type: "log",
          id: record.id,
          revision: record.revision,
          kind,
          outcome: ["deal", "rejected"].find(
            (x): x is "deal" | "rejected" => x === value(data, "outcome"),
          ),
          note: value(data, "note"),
        };
        return updateProspect(command);
      }}
    >
      <label>
        {t("Interaction")}
        <Select name="kind">
          {outreachKinds.map((k) => (
            <option key={k} value={k}>
              {t(kindLabel[k])}
            </option>
          ))}
        </Select>
      </label>
      <label>
        {t("Interaction outcome")}
        <Select name="outcome">
          <option value="">{t("No decision yet")}</option>
          <option value="deal">{t(statusLabel.deal)}</option>
          <option value="rejected">{t(statusLabel.rejected)}</option>
        </Select>
      </label>
      <p className="text-sm text-muted">
        {t("Logging an interaction does not move the business to another sales stage.")}
      </p>
      <label>
        {t("What happened?")}
        <Textarea name="note" required maxLength={2000} rows={3} />
      </label>
    </ChangeForm>
  );
}

export function EditProspect({ record }: { record: Prospect }) {
  const t = useT();
  return (
    <ChangeForm
      label="Save business profile"
      submit={(data) => {
        const key = value(data, "key").trim(),
          fact = value(data, "fact").trim();
        if (Boolean(key) !== Boolean(fact))
          return Promise.resolve({ error: "Enter both a research field and its value." });
        return updateProspect({
          type: "profile",
          id: record.id,
          revision: record.revision,
          name: value(data, "name") !== record.name ? value(data, "name") : undefined,
          details: value(data, "details") !== record.details ? value(data, "details") : undefined,
          research: key ? { [key]: fact } : undefined,
        });
      }}
    >
      <label>
        {t("Business name")}
        <Input required name="name" maxLength={300} defaultValue={record.name} />
      </label>
      <label>
        {t("Contact details")}
        <Textarea name="details" maxLength={100000} defaultValue={record.details} />
      </label>
      <label>
        {t("Research field")}
        <Input name="key" maxLength={200} />
      </label>
      <label>
        {t("Research update")}
        <Textarea name="fact" maxLength={20000} />
      </label>
    </ChangeForm>
  );
}

export function ShareProspect({ id, members }: { id: string; members: CatalogueMember[] }) {
  const t = useT();
  return (
    <ul className="grid gap-2">
      {members.map((m) => (
        <li key={m.user_id} className="flex items-center justify-between gap-2">
          <span>{m.display_name}</span>
          <ChangeForm
            label={m.shared ? "Remove shared access" : "Share business"}
            submit={() =>
              updateProspect({ type: "share", id, userId: m.user_id, enabled: !m.shared })
            }
          />
          {m.full_access && <span>{t("Full catalogue")}</span>}
        </li>
      ))}
    </ul>
  );
}

export function ProspectWork({
  record,
  linear,
  todos,
}: {
  record: Prospect;
  linear: string | null;
  todos: { id: string; title: string; done: boolean }[];
}) {
  const t = useT(),
    requestId = useRef<string | null>(null);
  const target = { id: record.id, revision: record.revision };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="grid content-start gap-2 rounded-xl border border-line bg-panel p-4">
        <h2 className="font-semibold">{t("To-dos")}</h2>
        <ul className="divide-y divide-line">
          {todos.map((todo) => (
            <li className="flex items-center justify-between py-2 gap-2" key={todo.id}>
              <span className={todo.done ? "line-through text-muted" : ""}>{todo.title}</span>
              <ChangeForm
                label={todo.done ? "Reopen" : "Complete"}
                submit={() =>
                  updateProspect({
                    ...target,
                    type: "todo_check",
                    todoId: todo.id,
                    done: !todo.done,
                  })
                }
              />
            </li>
          ))}
        </ul>
        <ChangeForm
          label="Add to-do"
          reset
          submit={async (data) => {
            requestId.current ??= crypto.randomUUID();
            const r = await updateProspect({
              ...target,
              type: "todo_add",
              todoId: requestId.current,
              title: value(data, "title"),
            });
            if (!r.error) requestId.current = null;
            return r;
          }}
        >
          <Input
            name="title"
            required
            maxLength={300}
            placeholder={t("Next action")}
            aria-label={t("Next action")}
          />
        </ChangeForm>
      </section>
      <section className="grid content-start gap-3 rounded-xl border border-line bg-panel p-4">
        <h2 className="font-semibold">Linear</h2>
        {linear && (
          <a href={linear} target="_blank" rel="noopener noreferrer" className="underline">
            {t("Open in Linear")}
          </a>
        )}
        <ChangeForm
          label="Save Linear link"
          submit={(data) =>
            updateProspect({ ...target, type: "linear", url: value(data, "linear").trim() || null })
          }
        >
          <label>
            {t("Linear issue or project URL")}
            <Input
              name="linear"
              type="url"
              maxLength={2000}
              defaultValue={linear ?? ""}
              placeholder="https://linear.app/…"
            />
          </label>
        </ChangeForm>
        <ChangeForm
          label="Move business"
          submit={(data) => {
            const status = salesStages.find((stage) => stage === value(data, "stage"));
            return status
              ? updateProspect({ ...target, type: "stage", status })
              : Promise.resolve({ error: "Choose a current sales stage." });
          }}
        >
          <label>
            {t("Sales stage")}
            <Select key={record.status} name="stage" defaultValue={record.status}>
              {record.status === "in_progress" && (
                <option value="in_progress" disabled>
                  {t(statusLabel.in_progress)}
                </option>
              )}
              {salesStages.map((v) => (
                <option key={v} value={v}>
                  {t(statusLabel[v])}
                </option>
              ))}
            </Select>
          </label>
        </ChangeForm>
      </section>
    </div>
  );
}
