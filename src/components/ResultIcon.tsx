import { HugeiconsIcon } from "@hugeicons/react";
import {
  File01Icon,
  FileCodeIcon,
  FileImageIcon,
  NoteIcon,
  FileSpreadsheetIcon,
  FileZipIcon,
  FileMusicIcon,
  FileVideoIcon,
  GlobeIcon,
  TerminalIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import type { SearchResult } from "@/services/search";
import { getFileThumbnail } from "@/services/search";

const EXT_ICON_MAP: Record<string, IconSvgElement> = {
  // Documents
  pdf: NoteIcon,
  doc: NoteIcon,
  docx: NoteIcon,
  txt: NoteIcon,
  md: NoteIcon,
  rtf: NoteIcon,
  // Spreadsheets
  xls: FileSpreadsheetIcon,
  xlsx: FileSpreadsheetIcon,
  csv: FileSpreadsheetIcon,
  // Images
  jpg: FileImageIcon,
  jpeg: FileImageIcon,
  png: FileImageIcon,
  gif: FileImageIcon,
  svg: FileImageIcon,
  webp: FileImageIcon,
  bmp: FileImageIcon,
  ico: FileImageIcon,
  // Code
  rs: FileCodeIcon,
  ts: FileCodeIcon,
  tsx: FileCodeIcon,
  js: FileCodeIcon,
  jsx: FileCodeIcon,
  py: FileCodeIcon,
  go: FileCodeIcon,
  java: FileCodeIcon,
  c: FileCodeIcon,
  cpp: FileCodeIcon,
  h: FileCodeIcon,
  cs: FileCodeIcon,
  rb: FileCodeIcon,
  swift: FileCodeIcon,
  kt: FileCodeIcon,
  html: FileCodeIcon,
  css: FileCodeIcon,
  scss: FileCodeIcon,
  json: FileCodeIcon,
  toml: FileCodeIcon,
  yaml: FileCodeIcon,
  yml: FileCodeIcon,
  xml: FileCodeIcon,
  // Archives
  zip: FileZipIcon,
  rar: FileZipIcon,
  "7z": FileZipIcon,
  tar: FileZipIcon,
  gz: FileZipIcon,
  // Audio
  mp3: FileMusicIcon,
  wav: FileMusicIcon,
  flac: FileMusicIcon,
  ogg: FileMusicIcon,
  // Video
  mp4: FileVideoIcon,
  mkv: FileVideoIcon,
  avi: FileVideoIcon,
  mov: FileVideoIcon,
  webm: FileVideoIcon,
};

const THUMBNAIL_EXTENSIONS = new Set([
  // Images
  "jpg",
  "jpeg",
  "png",
  "gif",
  "bmp",
  "webp",
  "ico",
  "tiff",
  "tif",
  "svg",
  // Videos
  "mp4",
  "mkv",
  "avi",
  "mov",
  "webm",
  "wmv",
  "flv",
  // Documents
  "pdf",
  "docx",
  "doc",
  "pptx",
  "ppt",
  "xlsx",
  "xls",
]);

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function getFileIcon(filename: string): IconSvgElement {
  return EXT_ICON_MAP[getExtension(filename)] ?? File01Icon;
}

function FileIcon({ filename }: { filename: string }) {
  const icon = getFileIcon(filename);
  return (
    <span className="flex size-8 items-center justify-center rounded-lg bg-info/15 text-info">
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
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
  if (item.kind === "command") {
    return (
      <span className="flex size-8 items-center justify-center rounded-lg bg-warning/15 text-warning">
        <HugeiconsIcon icon={TerminalIcon} strokeWidth={2} className="size-4" />
      </span>
    );
  }

  if (item.kind === "url") {
    return (
      <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
        <HugeiconsIcon icon={GlobeIcon} strokeWidth={2} className="size-4" />
      </span>
    );
  }

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
