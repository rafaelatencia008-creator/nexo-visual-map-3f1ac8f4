import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { initialNotifications, type MockNotification } from "@/lib/mock/notifications";

export function NotificationsPopover() {
  const [items, setItems] = React.useState<MockNotification[]>(initialNotifications);
  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  const markRead = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ""}`}
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--brand-accent))] px-1 text-[10px] font-semibold text-[hsl(var(--brand-accent-foreground))]"
            >
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-display text-sm font-semibold">Notificações</p>
            <p className="text-xs text-muted-foreground">
              {unread === 0
                ? "Todas em dia"
                : `${unread} não lida${unread === 1 ? "" : "s"}`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={markAllRead}
            disabled={unread === 0}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Você não tem notificações no momento.
          </div>
        ) : (
          <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
            {items.map((n) => {
              const content = (
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.read ? "bg-transparent" : "bg-[hsl(var(--brand-accent))]"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${
                        n.read
                          ? "font-normal text-muted-foreground"
                          : "font-medium text-foreground"
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {n.description}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground/70">
                      {n.when}
                    </p>
                  </div>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.to ? (
                    <Link
                      to={n.to}
                      className="block px-4 py-3 hover:bg-muted/60"
                      onClick={() => markRead(n.id)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="block w-full px-4 py-3 text-left hover:bg-muted/60"
                      onClick={() => markRead(n.id)}
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t px-4 py-2 text-center">
          <p className="text-[11px] text-muted-foreground">
            Notificações fictícias · demonstração visual
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
