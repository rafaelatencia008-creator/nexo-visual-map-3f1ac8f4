import * as React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopilotContext } from "./copilot-context";

export function CopilotTrigger() {
  const { setOpen } = useCopilotContext();
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Abrir Copiloto Nexo"
        title="Abrir Copiloto (Ctrl+J)"
        className="hidden md:inline-flex gap-2"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span>Copiloto</span>
        <kbd className="ml-1 hidden lg:inline-flex rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
          Ctrl J
        </kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Abrir Copiloto Nexo"
        title="Abrir Copiloto (Ctrl+J)"
        className="md:hidden"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </Button>
    </>
  );
}
