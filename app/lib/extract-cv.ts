import { decodeTextBuffer } from "./text-language";

export async function extractCvText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value.normalize("NFC");
  }

  if (name.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text.normalize("NFC");
  }

  if (name.endsWith(".txt")) {
    return decodeTextBuffer(buffer).normalize("NFC");
  }

  throw new Error("UNSUPPORTED_FILE_TYPE");
}

export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
