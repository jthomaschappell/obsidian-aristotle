import { API } from "./dom.js";

export function parseSSEBlock(block) {
  const trimmed = block.trim();
  if (!trimmed) return null;
  const lines = trimmed.split("\n");
  let eventType = "";
  const dataLines = [];
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

export async function streamClaudeText({ apiKey, systemPrompt, requestMessages, onTextDelta, signal }) {
  const res = await fetch(API.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: API.model,
      max_tokens: API.maxTokens,
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...requestMessages],
    }),
    signal,
  });

  if (!res.ok) {
    let t = "";
    try {
      t = await res.text();
    } catch {}
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

      if (data === "[DONE]") {
        // stream finished
      } else if (
        data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].delta &&
        typeof data.choices[0].delta.content === "string"
      ) {
        const token = data.choices[0].delta.content;
        fullText += token;
        onTextDelta(token);
      } else if (data && data.error) {
        const errMsg = data.error.message || "OpenRouter returned an error";
        throw new Error(errMsg);
      }
    }
  }

  return fullText;
}

export function friendlyErrorFromClaudeError(err) {
  const s = String(err && err.message ? err.message : err || "");
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
