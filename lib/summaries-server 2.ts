import fs from "node:fs";
import path from "node:path";

export const SUMMARIES_DIR = path.join(process.cwd(), "session-summaries");

export function isSafeFilename(name: string): boolean {
  return (
    typeof name === "string" &&
    name.length > 0 &&
    name.length <= 80 &&
    /^[\w\-\.]+$/.test(name) &&
    !name.includes("..")
  );
}

export function listSummaries(): { filename: string; mtime: number }[] {
  if (!fs.existsSync(SUMMARIES_DIR)) return [];
  return fs
    .readdirSync(SUMMARIES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const stat = fs.statSync(path.join(SUMMARIES_DIR, filename));
      return { filename, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

export function readSummary(filename: string): string | null {
  const filePath = path.join(SUMMARIES_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

export function writeSummary(filename: string, content: string): void {
  if (!fs.existsSync(SUMMARIES_DIR)) {
    fs.mkdirSync(SUMMARIES_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(SUMMARIES_DIR, filename), content, "utf8");
}
