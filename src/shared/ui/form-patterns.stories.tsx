import type { Meta } from "@storybook/nextjs-vite";
import { useState } from "react";
import {
  ConfirmByName,
  ConflictBanner,
  InlineConfirm,
  FormField,
  FilterBar,
} from "./form-patterns";
import { Eyebrow, Badge, FormStack } from "./workspace-layout";
import { Input } from "./controls";
export default { title: "UI/Form patterns" } satisfies Meta;
function Confirmation() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <FormStack
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(true);
      }}
    >
      <ConfirmByName
        expected="Prototype"
        value={value}
        onChange={setValue}
        label="Enter Prototype to confirm"
        submitLabel="Delete project"
        pending={false}
      />
      {saved && <p role="status">Confirmed</p>}
    </FormStack>
  );
}
export const ExactName = { render: () => <Confirmation /> };
export const Reconciliation = {
  render: () => (
    <ConflictBanner>
      <Eyebrow>Latest revision</Eyebrow>
      <Badge>2</Badge>
      <p>The saved version changed.</p>
      <InlineConfirm
        confirmLabel="Use latest"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
        pending={false}
      />
    </ConflictBanner>
  ),
};
export const Filters = {
  render: () => (
    <FilterBar>
      <FormField label="Search artifacts">
        <Input type="search" />
      </FormField>
    </FilterBar>
  ),
};
