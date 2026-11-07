"use client";
import { Popover } from "antd";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { IconButton } from "./button";
import { Icon } from "./icon";
export function ActionMenu({
  label,
  id,
  children,
}: {
  label: string;
  id?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const scope = trigger.current?.closest<HTMLElement>("[data-action-scope]");
    if (!scope) return;
    function show(event: MouseEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest("input,textarea,select,dialog,[contenteditable]")
      )
        return;
      event.preventDefault();
      setOpen(true);
    }
    scope.addEventListener("contextmenu", show);

    return () => scope.removeEventListener("contextmenu", show);
  }, []);
  return (
    <span
      ref={trigger}
      className="relative inline-flex"
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.stopPropagation();
          setOpen(false);
          trigger.current?.querySelector("button")?.focus();
        }
      }}
    >
      <Popover
        placement="bottomRight"
        trigger="click"
        open={open}
        onOpenChange={setOpen}
        getPopupContainer={(element) => element.parentElement ?? document.body}
        content={
          <div
            className="ui-action-menu-items flex flex-col items-stretch"
            onClick={(event) => {
              if (event.target instanceof Element && event.target.closest("button:not(:disabled)"))
                setOpen(false);
            }}
          >
            {children}
          </div>
        }
      >
        <IconButton id={id} variant="ghost" aria-expanded={open} label={label}>
          <Icon name="more" />
        </IconButton>
      </Popover>
    </span>
  );
}
