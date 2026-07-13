import { splitDescriptionParagraphs } from "../app/lib/format-description";

type JobDescriptionViewProps = {
  description: string;
  limit?: number;
};

export default function JobDescriptionView({ description, limit = 12 }: JobDescriptionViewProps) {
  const paragraphs = splitDescriptionParagraphs(description).slice(0, limit);

  if (paragraphs.length === 0) {
    return <p className="description-empty">—</p>;
  }

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
      ))}
    </>
  );
}
