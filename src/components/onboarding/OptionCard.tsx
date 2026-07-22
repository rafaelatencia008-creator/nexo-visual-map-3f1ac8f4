import * as React from "react";
import { Check } from "lucide-react";

type Props = {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  disabled?: boolean;
};

export function OptionCard({ selected, onSelect, title, description, meta, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={
        "group relative flex w-full flex-col gap-2 rounded-lg border p-4 text-left transition " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
        (selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/50 hover:bg-muted/30") +
        (disabled ? " cursor-not-allowed opacity-60" : "")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <span
          aria-hidden
          className={
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border " +
            (selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-transparent")
          }
        >
          <Check className="h-3 w-3" />
        </span>
      </div>
      {meta && <div className="mt-1 text-[11px] text-muted-foreground">{meta}</div>}
    </button>
  );
}
