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
import { useQuery } from "@tanstack/react-query";
import type { SearchResult } from "@/services/search";
import { getFileThumbnail } from "@/services/search";

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

const THUMBNAIL_EXTENSIONS = new Set([
  // Images
  "jpg", "jpeg", "png", "gif", "bmp", "webp", "ico", "tiff", "tif", "svg",
  // Videos
  "mp4", "mkv", "avi", "mov", "webm", "wmv", "flv",
  // Documents
  "pdf", "docx", "doc", "pptx", "ppt", "xlsx", "xls",
]);

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function getFileIcon(filename: string): LucideIcon {
  return EXT_ICON_MAP[getExtension(filename)] ?? File;
}

function FileIcon({ filename }: { filename: string }) {
  const Icon = getFileIcon(filename);
  return (
    <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
      <Icon className="size-4" />
    </span>
  );
}

function FileThumbnailIcon({ item }: { item: SearchResult }) {
  const filePath = item.id.slice(5); // strip "file:" prefix
  const ext = getExtension(item.title);
  const canThumbnail = THUMBNAIL_EXTENSIONS.has(ext);

  const { data: thumbnail } = useQuery({
    queryKey: ["file-thumbnail", filePath],
    queryFn: () => getFileThumbnail(filePath),
    enabled: canThumbnail,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
  });

  if (thumbnail) {
    return <img className="size-8 object-cover rounded-lg" src={thumbnail} alt="" />;
  }

  return <FileIcon filename={item.title} />;
}

export function ResultIcon({ item }: { item: SearchResult }) {
  if (item.kind === "file") {
    return <FileThumbnailIcon item={item} />;
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
