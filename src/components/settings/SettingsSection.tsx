import { Card, CardContent } from "@/components/ui/card";

export function SettingsSection({ children }: { children: React.ReactNode }) {
  return (
    <Card className="py-0">
      <CardContent className="p-0 divide-y divide-border">{children}</CardContent>
    </Card>
  );
}
