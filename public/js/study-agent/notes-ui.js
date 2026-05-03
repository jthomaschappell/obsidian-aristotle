import { state, els } from "./dom.js";

export function setSelectionCountUI() {
  const selectedCount = state.selectedPaths.size;
  els.noteCount.textContent = `${selectedCount} notes selected`;

  let totalChars = 0;
  for (const n of state.vaultNotes) {
    if (state.selectedPaths.has(n.path)) totalChars += n.content.length;
  }
  const estimatedTokens = Math.floor(totalChars / 4);
  els.tokenEstimate.textContent = `Estimated tokens: ${estimatedTokens}`;

  const tooLarge = estimatedTokens > 150000;
  els.tokenWarning.classList.toggle("hidden", !tooLarge);
}

function matchesQuery(note, q) {
  if (!q) return true;
  const s = (note.name + " " + note.path).toLowerCase();
  return s.includes(q.toLowerCase());
}

function sortNotesByPath(a, b) {
  const cmp = a.path.localeCompare(b.path, undefined, { sensitivity: "base" });
  return state.sortOrder === "asc" ? cmp : -cmp;
}

export function getVisibleNotesSorted() {
  const q = state.filteredQuery.trim();
  return state.vaultNotes.filter((n) => matchesQuery(n, q)).sort(sortNotesByPath);
}

export function renderNotesList() {
  els.mdList.innerHTML = "";
  const visibleNotes = getVisibleNotesSorted();

  if (state.vaultNotes.length === 0) {
    els.noMdFound.textContent = "No notes found yet. Open a vault to begin.";
  } else if (visibleNotes.length === 0) {
    els.noMdFound.textContent = "No notes match your search.";
  } else {
    els.noMdFound.textContent = "";
  }

  const frag = document.createDocumentFragment();
  for (const note of visibleNotes) {
    const item = document.createElement("label");
    item.className = "noteItem";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = state.selectedPaths.has(note.path);
    cb.addEventListener("change", () => {
      if (cb.checked) state.selectedPaths.add(note.path);
      else state.selectedPaths.delete(note.path);
      setSelectionCountUI();
      els.startBtn.disabled = state.selectedPaths.size === 0 || state.sessionStarted;
      renderNotesList();
    });

    const titleWrap = document.createElement("div");
    const title = document.createElement("div");
    title.className = "noteTitle";
    title.textContent = note.name;
    const p = document.createElement("div");
    p.className = "notePath";
    p.textContent = note.path;

    titleWrap.appendChild(title);
    titleWrap.appendChild(p);

    item.appendChild(cb);
    item.appendChild(titleWrap);
    frag.appendChild(item);
  }
  els.mdList.appendChild(frag);
}

export function selectAllVisible() {
  const visibleNotes = getVisibleNotesSorted();
  for (const n of visibleNotes) state.selectedPaths.add(n.path);
  setSelectionCountUI();
  els.startBtn.disabled = state.selectedPaths.size === 0 || state.sessionStarted;
  renderNotesList();
}

export function deselectAllVisible() {
  const visibleNotes = getVisibleNotesSorted();
  for (const n of visibleNotes) state.selectedPaths.delete(n.path);
  setSelectionCountUI();
  els.startBtn.disabled = state.selectedPaths.size === 0 || state.sessionStarted;
  renderNotesList();
}

export function getSelectedNotes() {
  return state.vaultNotes.filter((n) => state.selectedPaths.has(n.path));
}
