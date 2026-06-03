import type { VaultNote } from "./constants";

type MdHandle = { name: string; path: string; fileHandle: FileSystemFileHandle };

export async function enumerateMarkdownFileHandles(
  rootHandle: FileSystemDirectoryHandle
): Promise<MdHandle[]> {
  const items: MdHandle[] = [];

  async function walk(dirHandle: FileSystemDirectoryHandle, prefix: string) {
    for await (const [name, handle] of dirHandle.entries()) {
      const nextPath = prefix ? `${prefix}/${name}` : name;
      if (handle.kind === "file") {
        if (name.toLowerCase().endsWith(".md")) {
          items.push({
            name,
            path: nextPath,
            fileHandle: handle as FileSystemFileHandle,
          });
        }
      } else if (handle.kind === "directory") {
        await walk(handle as FileSystemDirectoryHandle, nextPath);
      }
    }
  }

  await walk(rootHandle, "");
  return items;
}

export async function loadNotesFromHandles(
  items: MdHandle[],
  onProgress?: (loaded: number, total: number) => void
): Promise<VaultNote[]> {
  const notes: VaultNote[] = [];
  const total = items.length;
  for (let i = 0; i < items.length; i++) {
    const { name, path, fileHandle } = items[i];
    const file = await fileHandle.getFile();
    const content = await file.text();
    notes.push({ name, path, content });
    onProgress?.(i + 1, total);
  }
  return notes;
}

export function buildSystemPrompt(
  selectedNotes: VaultNote[],
  template: string
): string {
  const NOTES_DELIMITER = "---";
  const notesBlock = selectedNotes
    .map((n) =>
      [
        NOTES_DELIMITER,
        `Name: ${n.name}`,
        `Path: ${n.path}`,
        NOTES_DELIMITER,
        n.content,
      ].join("\n")
    )
    .join("\n");
  return template.replace("{NOTES}", notesBlock);
}
