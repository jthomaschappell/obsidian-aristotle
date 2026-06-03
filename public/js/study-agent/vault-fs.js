import { els } from "./dom.js";

export function setVaultLoadingVisible(visible) {
  els.vaultLoadPanel.classList.toggle("hidden", !visible);
}

export function setVaultProgress(loaded, total) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
  els.vaultProgressFill.style.width = pct + "%";
  els.vaultProgressTrack.setAttribute("aria-valuenow", String(pct));
}

export async function enumerateMarkdownFileHandles(rootHandle) {
  const items = [];
  async function walk(dirHandle, prefix) {
    for await (const [name, handle] of dirHandle.entries()) {
      const nextPath = prefix ? `${prefix}/${name}` : name;
      if (handle.kind === "file") {
        if (name.toLowerCase().endsWith(".md")) {
          items.push({ name, path: nextPath, fileHandle: handle });
        }
      } else if (handle.kind === "directory") {
        await walk(handle, nextPath);
      }
    }
  }
  await walk(rootHandle, "");
  return items;
}

export async function loadNotesFromHandles(items, onProgress) {
  const notes = [];
  const total = items.length;
  for (let i = 0; i < items.length; i++) {
    const { name, path, fileHandle } = items[i];
    const file = await fileHandle.getFile();
    const content = await file.text();
    notes.push({ name, path, content });
    if (onProgress) onProgress(i + 1, total);
  }
  return notes;
}
