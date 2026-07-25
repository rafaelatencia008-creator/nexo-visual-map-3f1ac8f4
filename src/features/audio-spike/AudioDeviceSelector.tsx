import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function AudioDeviceSelector({
  devices,
  deviceId,
  onChange,
  disabled,
}: {
  devices: MediaDeviceInfo[];
  deviceId: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="audio-device">Microfone</Label>
      <Select
        value={deviceId ?? ""}
        onValueChange={onChange}
        disabled={disabled || devices.length === 0}
      >
        <SelectTrigger id="audio-device" aria-label="Escolher microfone">
          <SelectValue placeholder="Microfone padrão" />
        </SelectTrigger>
        <SelectContent>
          {devices.length === 0 ? (
            <SelectItem value="__none__" disabled>
              Nenhum microfone encontrado
            </SelectItem>
          ) : (
            devices.map((d, idx) => (
              <SelectItem key={d.deviceId || idx} value={d.deviceId || `dev-${idx}`}>
                {d.label || "Microfone padrão"}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
