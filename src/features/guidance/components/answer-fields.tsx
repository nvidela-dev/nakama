"use client";
import { Select, Textarea } from "@/shared/ui/controls";
import { useT } from "@/shared/i18n/provider";
import type { FlowNode, NodeStatus } from "../model/flows";

/** The same stacked answer fields are used by the editor and its responsive stories. */
export function AnswerFields({
  node,
  content,
  status,
  choice,
  pending,
  onContentChange,
  onChoiceChange,
  onStatusChange,
}: {
  node: Pick<FlowNode, "choices">;
  content: string;
  status: NodeStatus;
  choice: string;
  pending: boolean;
  onContentChange: (value: string) => void;
  onChoiceChange: (value: string) => void;
  onStatusChange: (value: NodeStatus) => void;
}) {
  const t = useT();
  return (
    <>
      {" "}
      <label htmlFor="answer">{t("Your answer, learning, or uncertainty")}</label>
      <Textarea
        disabled={pending}
        id="answer"
        name="content"
        rows={7}
        maxLength={20000}
        value={content}
        onChange={(e) => {
          onContentChange(e.target.value);
        }}
        placeholder={t("It's okay to say what you don't know yet.")}
      />
      {node.choices && (
        <>
          <label htmlFor="choice">{t("Your direction")}</label>
          <Select
            disabled={pending}
            id="choice"
            name="choice"
            value={choice}
            onChange={(e) => {
              onChoiceChange(e.target.value);
            }}
          >
            <option value="">{t("Not decided yet")}</option>
            {node.choices.map((c) => (
              <option key={c} value={c}>
                {t(c)}
              </option>
            ))}
          </Select>
        </>
      )}
      <label htmlFor="status">{t("Where does this stand?")}</label>
      <Select
        disabled={pending}
        id="status"
        name="status"
        value={status}
        onChange={(e) => {
          onStatusChange(e.target.value as NodeStatus);
        }}
      >
        <option value="draft">{t("Draft — still thinking")}</option>
        <option value="answered">{t("Answered — including an honest unknown")} </option>
        <option value="blocked">{t("Blocked — explain the help you need")}</option>
        <option value="skipped">{t("Skipped — explain why")}</option>
        <option value="unanswered">{t("Unanswered — clear the current answer")} </option>
      </Select>
      <small>
        {t("Answered means recorded, not proven right. Earlier revisions stay in history.")}{" "}
      </small>
    </>
  );
}
