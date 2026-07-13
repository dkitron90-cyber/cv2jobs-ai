import type { Locale } from "./i18n";

export function buildAiOutreachMessage(params: {
  candidateName: string;
  jobTitle: string;
  company: string;
  recruiterMessage: string;
  locale: Locale;
}): string {
  const name = params.candidateName.trim() || (params.locale === "he" ? "מועמד/ת" : "Candidate");
  const custom = params.recruiterMessage.trim();

  if (custom.length > 40) {
    if (/cv2jobs/i.test(custom)) return custom;
    const hook =
      params.locale === "he"
        ? `מצאתי את המשרה הזו דרך CV2Jobs AI והיא נראית לי התאמה חזקה.\n\n`
        : `I found this role through CV2Jobs AI and it looks like a strong fit for me.\n\n`;
    return `${hook}${custom}`;
  }

  if (params.locale === "he") {
    return `שלום,

אני ${name}. מצאתי את משרת ${params.jobTitle} ב-${params.company} דרך CV2Jobs AI, ונראה לי שיש לי התאמה טובה לתפקיד.

מצורף קורות החיים שלי. אשמח לשיחה קצרה אם זה רלוונטי.

תודה,
${name}`;
  }

  return `Hi,

I'm ${name}. I found your ${params.jobTitle} opening at ${params.company} through CV2Jobs AI, and it looks like a strong match for my background.

I'm sending my CV for your review and would love a quick chat if it's relevant.

Best,
${name}`;
}
