"use client";

// The app frame around every page: the menu on the left (Rail.tsx), the view filling the rest of the window, and in the online copy
// a slim strip above the view that says it is a copy (SnapshotBanner's CopyStrip) and the bot's panel as a third column on
// the right while it is open (components/bot). It also holds the one TooltipProvider,
// ToastProvider and BankProvider (useBank) that every view shares, and the bot's and the requests' state, which stay while
// the view changes, and the one choice of table and camera (SetupProvider).
import type { ReactNode } from "react";
import { BankProvider } from "../../lib/bank.ts";
import { BotLayer, DockColumn, useWide } from "../bot/BotDock";
import { BotProvider, useBot, useBotSwitch } from "../bot/BotProvider";
import { RequestsProvider } from "../requests/RequestsProvider";
import { ToastProvider } from "../ui/Toast";
import { TooltipProvider } from "../ui/Tooltip";
import { Rail } from "./Rail";
import { SetupProvider } from "./SetupProvider";
import { CopyStrip } from "./SnapshotBanner";

function Frame({ wide, children }: { wide: boolean; children: ReactNode }) {
  const bot = useBot();
  const docked = !!bot?.enabled && wide && bot.open;
  return (
    // The menu takes the width it draws itself in (Rail.tsx: wide rows, or icons in a narrow window); the view takes the rest.
    <div className="grid h-dvh overflow-hidden bg-canvas" style={{ gridTemplateColumns: docked ? `auto minmax(0,1fr) ${bot!.width}px` : "auto minmax(0,1fr)" }}>
      <Rail />
      {/* The copy's strip takes its own line above the view (never over a view's header); the view fills the rest. */}
      <div className="flex min-h-0 min-w-0 flex-col">
        <CopyStrip />
        <div id="innehall" className="relative min-h-0 min-w-0 flex-1 overflow-auto">
          {children}
        </div>
      </div>
      <DockColumn wide={wide} />
    </div>
  );
}

function WithBot({ children }: { children: ReactNode }) {
  const { enabled, fake } = useBotSwitch();
  const wide = useWide();
  return (
    <RequestsProvider enabled={enabled}>
      <BotProvider enabled={enabled} fake={fake}>
        <Frame wide={wide}>{children}</Frame>
        <BotLayer wide={wide} />
      </BotProvider>
    </RequestsProvider>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <ToastProvider>
        <BankProvider>
          <SetupProvider>
            <WithBot>{children}</WithBot>
          </SetupProvider>
        </BankProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
