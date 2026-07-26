import * as React from "react";
import { CopilotContextProvider, useCopilotContext } from "./copilot-context";
import { CopilotPanel } from "./CopilotPanel";

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  return (
    <CopilotContextProvider>
      <CopilotShortcut />
      {children}
      <CopilotPanel />
    </CopilotContextProvider>
  );
}

function CopilotShortcut() {
  const { toggle } = useCopilotContext();
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);
  return null;
}
