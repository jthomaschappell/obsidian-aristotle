export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderMarkdown(text: string): string {
  const lines = escapeHtml(text).split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (/^# /.test(line)) out.push(`<h1>${line.slice(2)}</h1>`);
    else if (/^## /.test(line)) out.push(`<h2>${line.slice(3)}</h2>`);
    else if (/^---$/.test(line)) out.push("<hr>");
    else if (/^- /.test(line))
      out.push(
        `<li>${line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</li>`
      );
    else
      out.push(
        `<p>${line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`
      );
  }
  return out.join("");
}

export function formatFilenameAsDate(filename: string): string {
  try {
    const iso = filename
      .replace(".md", "")
      .replace(/T(\d{2})-(\d{2})-(\d{2})$/, "T$1:$2:$3");
    const d = new Date(iso);
    if (isNaN(d.getTime())) return filename;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return filename;
  }
}
