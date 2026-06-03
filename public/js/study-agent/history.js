import { els } from "./dom.js";
import { formatFilenameAsDate, renderMarkdown } from "./markdown-utils.js";

export function switchTab(tab) {
  const toSession = tab === "session";
  els.sessionTabBtn.classList.toggle("active", toSession);
  els.historyTabBtn.classList.toggle("active", !toSession);
  els.sessionTabContent.classList.toggle("hidden", !toSession);
  els.historyTabContent.classList.toggle("hidden", toSession);
  if (!toSession) loadHistoryList();
}

export async function loadHistoryList() {
  els.historyListInner.innerHTML = "";
  els.historyDetailView.classList.add("hidden");
  els.historyListView.classList.remove("hidden");

  let summaries;
  try {
    const res = await fetch("/api/summaries");
    if (!res.ok) throw new Error();
    ({ summaries } = await res.json());
  } catch {
    els.historyListInner.innerHTML = `<div class="historyEmpty">History unavailable — start the local server to enable session saving.</div>`;
    return;
  }

  if (summaries.length === 0) {
    els.historyListInner.innerHTML = `<div class="historyEmpty">No sessions saved yet. End a session to create your first summary.</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  for (const s of summaries) {
    const item = document.createElement("div");
    item.className = "historyItem";

    const dateEl = document.createElement("div");
    dateEl.className = "historyItemDate";
    dateEl.textContent = formatFilenameAsDate(s.filename);

    item.appendChild(dateEl);
    item.addEventListener("click", () => loadHistoryDetail(s.filename));
    frag.appendChild(item);
  }
  els.historyListInner.appendChild(frag);
}

export async function loadHistoryDetail(filename) {
  els.historyListView.classList.add("hidden");
  els.historyDetailView.classList.remove("hidden");
  els.historyDetailContent.innerHTML = `<div class="meta" style="padding:10px 0;">Loading…</div>`;

  try {
    const res = await fetch(`/api/summaries/${encodeURIComponent(filename)}`);
    if (!res.ok) throw new Error();
    const text = await res.text();
    els.historyDetailContent.innerHTML = renderMarkdown(text);
  } catch {
    els.historyDetailContent.innerHTML = `<div class="meta" style="color:#991b1b;">Failed to load summary.</div>`;
  }
}

export async function saveSessionSummary({ notes, summaryText }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const notesList = notes.map((n) => `- ${n.path}`).join("\n");

  const content = [
    `# Study Session — ${dateStr} at ${timeStr}`,
    "",
    `**Notes studied:**`,
    notesList,
    "",
    "---",
    "",
    summaryText,
  ].join("\n");

  const isoStr = now.toISOString().replace(/:/g, "-").replace(/\..+/, "");
  const filename = `${isoStr}.md`;

  try {
    await fetch("/api/summaries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename, content }),
    });
  } catch {
    // Server not running — silently skip, don't disrupt the session flow.
  }
}
