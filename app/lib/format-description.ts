export function decodeEntities(value: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": " ",
  };

  return value
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => entities[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function looksLikeHtml(text: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(text) || /&lt;\/?[a-z]/i.test(text);
}

export function stripHtml(html: string): string {
  let text = decodeEntities(html);

  if (/&(?:lt|gt|amp|quot|#39|nbsp);/i.test(text)) {
    text = decodeEntities(text);
  }

  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|header|footer|blockquote)>/gi, "\n\n")
    .replace(/<\/(h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<h[1-6][^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ");
}

function cleanupWhitespace(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function flattenStructuredContent(value: unknown, depth = 0): string {
  if (depth > 10 || value == null) return "";

  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => flattenStructuredContent(item, depth + 1))
      .filter(Boolean)
      .join("\n\n");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKeys = [
      "text",
      "content",
      "body",
      "value",
      "description",
      "children",
      "blocks",
      "items",
      "paragraphs",
      "sections",
      "details",
    ];

    const preferred = preferredKeys
      .map((key) => flattenStructuredContent(record[key], depth + 1))
      .filter(Boolean);

    if (preferred.length > 0) return preferred.join("\n\n");

    return Object.entries(record)
      .filter(([key]) => !["type", "id", "uid", "order", "attrs", "marks", "data"].includes(key))
      .map(([key, nested]) => {
        const body = flattenStructuredContent(nested, depth + 1);
        if (!body) return "";
        const heading = key.replace(/_/g, " ").trim();
        return /^(title|name|heading)$/i.test(key) ? body : `${heading}\n${body}`;
      })
      .filter(Boolean)
      .join("\n\n");
  }

  return "";
}

function tryFlattenJson(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;

  try {
    const flattened = flattenStructuredContent(JSON.parse(trimmed));
    return flattened.trim() ? cleanupWhitespace(flattened) : null;
  } catch {
    return null;
  }
}

export function normalizeJobDescription(raw = ""): string {
  let text = String(raw).trim();
  if (!text) return "";

  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();

  if (looksLikeHtml(text)) {
    text = stripHtml(text);
  }

  const whole = tryFlattenJson(text);
  if (whole) return whole;

  text = text.replace(/(\{[\s\S]*?\}|\[[\s\S]*?\])/g, (match) => {
    const flattened = tryFlattenJson(match);
    return flattened ?? match;
  });

  return cleanupWhitespace(text);
}

export function splitDescriptionParagraphs(description: string): string[] {
  return normalizeJobDescription(description)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function extractContactEmail(description: string): string | null {
  const normalized = normalizeJobDescription(description);
  const match = normalized.match(
    /\b[\w.+-]+@(?:[\w-]+\.)+[\w-]{2,}\b/,
  );
  return match?.[0]?.toLowerCase() ?? null;
}
