import type { SearchResult } from "@/services/search";

interface LauncherCommand {
  id: string;
  title: string;
  subtitle: string;
  aliases: string[];
}

const COMMANDS: LauncherCommand[] = [
  {
    id: "cmd:onboarding",
    title: "Show Onboarding",
    subtitle: "Replay the welcome tutorial",
    aliases: [
      "onboarding",
      "configure",
      "setup",
      "welcome",
      "tutorial",
      "getting started",
      "intro",
      "help",
      "how to use",
      "guide",
    ],
  },
];

export function matchCommands(query: string): SearchResult[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase().trim();

  return COMMANDS.filter((cmd) =>
    cmd.aliases.some((alias) => alias.startsWith(q) || q.startsWith(alias)),
  ).map((cmd) => ({
    id: cmd.id,
    title: cmd.title,
    subtitle: cmd.subtitle,
    icon: "",
    kind: "command" as const,
  }));
}
