"use client";
import { useState } from "react";
import { Input, Select, Textarea } from "@/shared/ui/controls";
import { useT } from "@/shared/i18n/provider";
import { jobEvents } from "../model";

export function EventFields({
  today,
  awaitingDecision,
}: {
  today: string;
  awaitingDecision: boolean;
}) {
  const t = useT();
  const [kind, setKind] = useState("note");
  const round = kind === "screening" || kind === "interview";
  return (
    <>
      <label>
        {t("Event")}
        <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
          {Object.entries(jobEvents)
            .filter(([key]) => key !== "contact" && key !== "reply")
            .map(([key, label]) => (
              <option key={key} value={key}>
                {t(label)}
              </option>
            ))}
        </Select>
      </label>
      {kind === "outreach" ? (
        <>
          <label>
            {t("Contact time (Montevideo)")}
            <Input type="datetime-local" name="contact_at" required />
          </label>
          <label>
            {t("Channel")}
            <Select name="contact_method">
              <option value="call">{t("Call")}</option>
              <option value="email">{t("Email")}</option>
              <option value="message">{t("Message")}</option>
            </Select>
          </label>
          <label>
            {t("Contact direction")}
            <Select name="direction">
              <option value="outbound">{t("Outbound")}</option>
              <option value="inbound">{t("Inbound")}</option>
            </Select>
          </label>
          <label>
            {t("Response")}
            <Select name="response">
              <option value="no_reply">{t("No reply")}</option>
              <option value="reply">{t("Reply")}</option>
            </Select>
          </label>
          {awaitingDecision && (
            <label>
              {t("Company decision")}
              <Select name="decision">
                <option value="">{t("No final decision")}</option>
                <option value="accepted">{t("Accepted")}</option>
                <option value="rejected">{t("Rejected")}</option>
              </Select>
            </label>
          )}
          <label>
            {t("Outreach follow-up date")}
            <Input type="date" name="contact_follow_up" />
          </label>
        </>
      ) : (
        <label>
          {t("Date it happened")}
          <Input type="date" required name="occurred_on" max={today} defaultValue={today} />
        </label>
      )}
      {round && (
        <>
          <label>
            {t("Interview type")}
            <Input name="round_type" maxLength={200} required />
          </label>
          <label>
            {t("Round outcome")}
            <Input name="round_outcome" maxLength={500} required />
          </label>
          <label>
            {t("How did it go? (1–10)")}
            <Input name="rating" type="number" min={1} max={10} required />
          </label>
        </>
      )}
      <label>
        {t("What happened?")}
        <Textarea name="detail" rows={2} maxLength={8000} required />
      </label>
      <label>
        {t("What to practice or do differently")}
        <Textarea name="practice" rows={2} maxLength={4000} />
      </label>
    </>
  );
}
