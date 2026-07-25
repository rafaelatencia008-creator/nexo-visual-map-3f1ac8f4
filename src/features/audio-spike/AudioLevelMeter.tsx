export function AudioLevelMeter({
  level,
  active,
}: {
  level: number;
  active: boolean;
}) {
  const clamped = Math.max(0, Math.min(1, level));
  const percent = Math.round(clamped * 100);
  return (
    <div
      className="space-y-1"
      role="group"
      aria-label="Medidor de nível de áudio"
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Nível</span>
        <span aria-live="polite">{active ? `${percent}%` : "—"}</span>
      </div>
      <div
        className="h-2 w-full rounded bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={active ? percent : 0}
        aria-label={
          active
            ? `Nível de áudio ${percent} por cento`
            : "Medidor inativo"
        }
      >
        <div
          className="h-full rounded bg-primary transition-[width] duration-100"
          style={{ width: active ? `${percent}%` : "0%" }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {active
          ? "Microfone captando som."
          : "Inicie a gravação para visualizar o nível."}
      </p>
    </div>
  );
}
