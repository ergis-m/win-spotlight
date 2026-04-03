import { invoke } from "@tauri-apps/api/core";
import type { InstantAnswer } from "./instant-answer";

interface NetworkInfo {
  hostname: string;
  local_ip: string;
}

const IP_KEYWORDS = new Set([
  "ip",
  "my ip",
  "myip",
  "ip address",
  "ipaddress",
  "local ip",
  "public ip",
]);

export function isDevToolsQuery(input: string): boolean {
  const q = input.trim().toLowerCase();
  return IP_KEYWORDS.has(q);
}

export async function tryDevTools(input: string): Promise<InstantAnswer[] | null> {
  const q = input.trim().toLowerCase();
  if (!IP_KEYWORDS.has(q)) return null;

  const answers: InstantAnswer[] = [];

  const [networkInfo, publicIp] = await Promise.allSettled([
    invoke<NetworkInfo>("get_network_info"),
    fetchPublicIp(),
  ]);

  if (networkInfo.status === "fulfilled" && networkInfo.value.local_ip) {
    answers.push({
      type: "devtools",
      result: networkInfo.value.local_ip,
      label: "Local IP address",
    });
  }

  if (publicIp.status === "fulfilled" && publicIp.value) {
    answers.push({
      type: "devtools",
      result: publicIp.value,
      label: "Public IP address",
    });
  }

  if (networkInfo.status === "fulfilled" && networkInfo.value.hostname) {
    answers.push({
      type: "devtools",
      result: networkInfo.value.hostname,
      label: "Hostname",
    });
  }

  return answers.length > 0 ? answers : null;
}

async function fetchPublicIp(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(3000),
    });
    const data = (await res.json()) as { ip: string };
    return data.ip;
  } catch {
    return null;
  }
}
