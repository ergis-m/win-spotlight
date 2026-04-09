import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import {
  getOverrides,
  saveOverrides,
  getSystemDefaults,
  COMMON_TIMEZONES,
  COMMON_CURRENCIES,
  CURRENCY_NAMES,
} from "@/lib/locale";

function formatTzLabel(tz: string): string {
  const offset =
    new Date()
      .toLocaleTimeString("en-US", { timeZone: tz, timeZoneName: "longOffset" })
      .split(" ")
      .pop() || "";
  const city = tz.split("/").pop()!.replace(/_/g, " ");
  return `${city} (${offset})`;
}

export function RegionalPage() {
  const sys = getSystemDefaults();
  const overrides = getOverrides();

  const [timezone, setTimezone] = useState(overrides.timezone || "auto");
  const [currency, setCurrency] = useState(overrides.currency || "auto");

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    saveOverrides({ ...getOverrides(), timezone: value === "auto" ? undefined : value });
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    saveOverrides({ ...getOverrides(), currency: value === "auto" ? undefined : value });
  };

  return (
    <div className="flex flex-col gap-2">
      <Item variant="muted" size="sm">
        <ItemContent>
          <ItemTitle>Timezone</ItemTitle>
          <ItemDescription>System detected: {sys.timezone}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Select value={timezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto ({sys.timezoneShort})</SelectItem>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {formatTzLabel(tz)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ItemActions>
      </Item>
      <Item variant="muted" size="sm">
        <ItemContent>
          <ItemTitle>Currency</ItemTitle>
          <ItemDescription>System detected: {sys.currency}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Select value={currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto ({sys.currency})</SelectItem>
              {COMMON_CURRENCIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {CURRENCY_NAMES[code] || code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ItemActions>
      </Item>
    </div>
  );
}
