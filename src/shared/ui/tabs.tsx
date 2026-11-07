"use client";

import AntTabs from "antd/es/tabs";
import type { ReactNode } from "react";
export function Tabs<Value extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: readonly { value: Value; label: ReactNode; content: ReactNode }[];
  value: Value;
  onChange: (value: Value) => void;
  label: string;
}) {
  return (
    <>
      <AntTabs
        aria-label={label}
        activeKey={value}
        onChange={(key) => {
          const item = items.find((item) => item.value === key);
          if (item) onChange(item.value);
        }}
        items={items.map((item) => ({
          key: item.value,
          label: item.label,
          children: item.content,
        }))}
      />
    </>
  );
}
