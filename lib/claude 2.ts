import { OPENROUTER_API } from "./constants";

function parseSSEBlock(block: string): { eventType: string; data: unknown } | null {
  const trimmed = block.trim();
  if (!trimmed) return null;
  const lines = trimmed.split("\n");
  let eventType = "";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (!eventType) eventType = "message";
  if (dataLines.length === 0) return { eventType, data: null };
  const dataStr = dataLines.join("\n");
  try {
    return { eventType, data: JSON.parse(dataStr) };
  } catch {
    return { eventType, data: dataStr };
  }
}

export async function streamClaudeText({
  apiKey,
  systemPrompt,
  requestMessages,
  onTextDelta,
  signal,
}: {
  apiKey: string;
  systemPrompt: string;
  requestMessages: { role: string; content: string }[];
  onTextDelta: (token: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const res = await fetch(OPENROUTER_API.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_API.model,
      max_tokens: OPENROUTER_API.maxTokens,
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...requestMessages],
    }),
    signal,
  });

  if (!res.ok) {
    let t = "";
    try {
      t = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status}${t ? ": " + t : ""}`);
  }
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    buf = buf.replace(/\r/g, "");

    while (true) {
      const idx = buf.indexOf("\n\n");
      if (idx === -1) break;
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const parsed = parseSSEBlock(block);
      if (!parsed) continue;

      const { data } = parsed;
      const d = data as {
        choices?: { delta?: { content?: string } }[];
        error?: { message?: string };
      } | null;

      if (
        d &&
        d.choices?.[0]?.delta &&
        typeof d.choices[0].delta.content === "string"
      ) {
        const token = d.choices[0].delta.content;
        fullText += token;
        onTextDelta(token);
      } else if (d?.error) {
        throw new Error(d.error.message || "OpenRouter returned an error");
      }
    }
  }

  return fullText;
}

export function friendlyErrorFromClaudeError(err: unknown): string {
  const s = String(err instanceof Error ? err.message : err || "");
  const lower = s.toLowerCase();
  if (
    lower.includes("overloaded") ||
    lower.includes("529") ||
    lower.includes("429") ||
    lower.includes("rate")
  ) {
    return "The model is a bit busy - wait a moment and try again";
  }
  return s || "OpenRouter returned an error";
}

export function shouldHighlightConnection(assistantText: string): boolean {
  return (
    assistantText.includes("I notice your note on") ||
    assistantText.includes("connects to your note on")
  );
}
