// EduBridge chatbot knowledge base
// Edit this file to add, remove, or change canned answers.

export const WHATSAPP_NUMBER = "254765387058"; // no "+" or spaces
export const WHATSAPP_PREFILL =
  "Hi, I have a question that the chatbot could not answer.";

export const WELCOME_MESSAGE =
  "Hi! I'm here to help. Choose a question below or type your own.";
export const FALLBACK_MESSAGE =
  "I don't have a saved answer for that yet. Please continue with us on WhatsApp and we'll help you directly.";
export const ENDING_MESSAGE =
  "Need anything else? Continue the conversation with us on WhatsApp.";

export type Faq = {
  id: string;
  category: "Services" | "Pricing" | "Booking" | "Hours" | "Location" | "General";
  question: string;
  keywords: string[];
  answer: string;
  followUps?: string[]; // ids of follow-up FAQs to suggest
};

export const FAQS: Faq[] = [
  {
    id: "services",
    category: "Services",
    question: "What services do you offer?",
    keywords: ["service", "services", "offer", "do", "provide", "what"],
    answer:
      "EduBridge connects homeschooling parents with vetted educators across subjects like Math, English, Science, Languages, Classical Studies, and Test Prep. You can search the Agora directory, message educators directly, and book sessions.",
    followUps: ["pricing", "booking"],
  },
  {
    id: "pricing",
    category: "Pricing",
    question: "What are your prices?",
    keywords: ["price", "prices", "pricing", "cost", "fee", "fees", "rate", "rates", "how much"],
    answer:
      "Each educator sets their own hourly rate, listed in KES on their profile. EduBridge does not charge parents a platform fee — you pay the educator directly for sessions you book.",
    followUps: ["booking", "hours"],
  },
  {
    id: "hours",
    category: "Hours",
    question: "What are your working hours?",
    keywords: ["hours", "open", "working", "available", "time", "when"],
    answer:
      "The platform is open 24/7. Individual educators publish their own availability on their profile — you can message them anytime and they'll respond during their listed hours.",
    followUps: ["booking"],
  },
  {
    id: "booking",
    category: "Booking",
    question: "How do I book a teacher?",
    keywords: ["book", "booking", "hire", "schedule", "session", "how do i book", "reserve"],
    answer:
      "Create a free parent account, browse the Agora directory, open an educator's profile, then send them a message to agree on a time. Sessions are arranged directly between you and the educator.",
    followUps: ["services", "pricing"],
  },
  {
    id: "location",
    category: "Location",
    question: "Where are you located?",
    keywords: ["location", "where", "located", "address", "country", "based"],
    answer:
      "EduBridge is based in Kenya and serves homeschooling families primarily across East Africa, with educators offering both in-person and online sessions.",
    followUps: ["services"],
  },
  {
    id: "duration",
    category: "General",
    question: "How long does it take to get matched?",
    keywords: ["long", "duration", "take", "time", "wait", "match", "matched", "quick"],
    answer:
      "Most parents find a suitable educator within a day or two of browsing the Agora. Educators typically reply to messages within 24 hours.",
    followUps: ["booking", "services"],
  },
  {
    id: "vetting",
    category: "General",
    question: "How are educators vetted?",
    keywords: ["vet", "vetted", "vetting", "verify", "verified", "trust", "background", "safe"],
    answer:
      "Every educator submits a government ID, certificate of good conduct, and proof of qualifications. Our admin team reviews each application before the educator becomes visible in the marketplace.",
    followUps: ["services", "booking"],
  },
];

/** Simple keyword-based matcher. Returns the best FAQ or null. */
export function matchFaq(input: string): Faq | null {
  const text = input.toLowerCase().trim();
  if (!text) return null;

  // Exact question match
  const exact = FAQS.find((f) => f.question.toLowerCase() === text);
  if (exact) return exact;

  // Score by keyword overlap
  let best: { faq: Faq; score: number } | null = null;
  for (const faq of FAQS) {
    let score = 0;
    for (const kw of faq.keywords) {
      if (text.includes(kw.toLowerCase())) score += kw.length > 3 ? 2 : 1;
    }
    // Bonus if question shares 2+ words with input
    const qWords = faq.question.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const inputWords = new Set(text.split(/\W+/));
    const shared = qWords.filter((w) => inputWords.has(w)).length;
    if (shared >= 2) score += 3;

    if (!best || score > best.score) best = { faq, score };
  }

  return best && best.score >= 2 ? best.faq : null;
}

export function whatsappUrl(message: string = WHATSAPP_PREFILL): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
