import {
  File,
  FileCode,
  FileImage,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileMusic,
  FileVideo,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SearchResult } from "@/services/search";

const EXT_ICON_MAP: Record<string, LucideIcon> = {
  // Documents
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  md: FileText,
  rtf: FileText,
  // Spreadsheets
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  // Images
  jpg: FileImage,
  jpeg: FileImage,
  png: FileImage,
  gif: FileImage,
  svg: FileImage,
  webp: FileImage,
  bmp: FileImage,
  ico: FileImage,
  // Code
  rs: FileCode,
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  py: FileCode,
  go: FileCode,
  java: FileCode,
  c: FileCode,
  cpp: FileCode,
  h: FileCode,
  cs: FileCode,
  rb: FileCode,
  swift: FileCode,
  kt: FileCode,
  html: FileCode,
  css: FileCode,
  scss: FileCode,
  json: FileCode,
  toml: FileCode,
  yaml: FileCode,
  yml: FileCode,
  xml: FileCode,
  // Archives
  zip: FileArchive,
  rar: FileArchive,
  "7z": FileArchive,
  tar: FileArchive,
  gz: FileArchive,
  // Audio
  mp3: FileMusic,
  wav: FileMusic,
  flac: FileMusic,
  ogg: FileMusic,
  // Video
  mp4: FileVideo,
  mkv: FileVideo,
  avi: FileVideo,
  mov: FileVideo,
  webm: FileVideo,
};

function getFileIcon(filename: string): LucideIcon {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_ICON_MAP[ext] ?? File;
}

export function ResultIcon({ item }: { item: SearchResult }) {
  if (item.kind === "file") {
    const Icon = getFileIcon(item.title);
    return (
      <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
        <Icon className="size-4" />
      </span>
    );
  }

  if (item.icon) {
    return <img className="size-8 object-contain rounded" src={item.icon} alt="" />;
  }
  return (
    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
      {item.title.charAt(0).toUpperCase()}
    </span>
  );
}
