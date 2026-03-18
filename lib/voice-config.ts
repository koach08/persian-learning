// Voice configuration for natural TTS with Azure Neural voices

// --- Available voices ---

export const PERSIAN_VOICES = {
  female: "fa-IR-DilaraNeural",
  male: "fa-IR-FaridNeural",
} as const;

export const JAPANESE_VOICES = {
  female: "ja-JP-NanamiNeural",
  male: "ja-JP-KeitaNeural",
} as const;

export type Gender = "female" | "male";

// --- Common Persian female names ---
const FEMALE_NAMES = new Set([
  // Common Iranian female names
  "مریم", "فاطمه", "زهرا", "سارا", "نرگس", "لیلا", "مینا", "نازنین",
  "شیرین", "پریسا", "نگار", "ندا", "سمیرا", "مهسا", "نیلوفر", "آزاده",
  "الهام", "مرجان", "شبنم", "گلناز", "ترانه", "پروانه", "ستاره", "بهاره",
  "رویا", "فرزانه", "سپیده", "مهناز", "شهلا", "طاهره", "زینب", "معصومه",
  "آرزو", "پگاه", "نسترن", "هانیه", "یاسمن", "الناز", "کیمیا", "دریا",
  "آتنا", "مائده", "حنانه", "فرشته", "نگین", "سمانه", "مونا", "هلیا",
]);

// --- Common Persian male names ---
const MALE_NAMES = new Set([
  // Common Iranian male names
  "علی", "محمد", "حسین", "رضا", "مهدی", "امیر", "احمد", "حسن",
  "جواد", "سعید", "محسن", "امین", "مجید", "حمید", "فرهاد", "بهرام",
  "داریوش", "کوروش", "آرش", "پویا", "نیما", "سینا", "آرمان", "پارسا",
  "بهنام", "کامران", "شاهین", "بابک", "سروش", "پیمان", "کیان", "آریا",
  "مهران", "رامین", "سامان", "پدرام", "نوید", "عرفان", "یاسر", "هادی",
  "ابراهیم", "اسماعیل", "یوسف", "دانیال", "سپهر", "مهرداد", "ایمان", "بهزاد",
]);

/**
 * Detect gender from a Persian name.
 * Falls back to examining common name endings if not in the dictionary.
 */
export function detectGender(name: string): Gender {
  const cleaned = name.trim().replace(/\s+/g, " ");

  // Check first name (split by space, take first word)
  const firstName = cleaned.split(" ")[0];

  if (FEMALE_NAMES.has(firstName)) return "female";
  if (MALE_NAMES.has(firstName)) return "male";

  // Heuristic: names ending in ه (heh) or ا (alef) are often female in Persian
  // But this is unreliable, so default to male for AI speakers
  if (firstName.endsWith("ه") && !firstName.endsWith("اده")) return "female";

  return "male";
}

/**
 * Get the appropriate Persian voice for a speaker name.
 */
export function getPersianVoice(speakerName?: string, gender?: Gender): string {
  if (gender) {
    return gender === "female" ? PERSIAN_VOICES.female : PERSIAN_VOICES.male;
  }
  if (speakerName) {
    const detected = detectGender(speakerName);
    return detected === "female" ? PERSIAN_VOICES.female : PERSIAN_VOICES.male;
  }
  return PERSIAN_VOICES.female; // default
}

/**
 * Get the appropriate Japanese voice for a gender.
 */
export function getJapaneseVoice(gender?: Gender): string {
  return gender === "male" ? JAPANESE_VOICES.male : JAPANESE_VOICES.female;
}

// --- Voice assignment for multi-speaker dialogues ---

export interface SpeakerVoice {
  name: string;
  gender: Gender;
  persianVoice: string;
  japaneseVoice: string;
}

/**
 * Assign voices to dialogue speakers, ensuring different speakers get different voices.
 */
export function assignSpeakerVoices(
  speakers: { name: string; gender?: Gender }[]
): Map<string, SpeakerVoice> {
  const voiceMap = new Map<string, SpeakerVoice>();

  for (const speaker of speakers) {
    if (voiceMap.has(speaker.name)) continue;

    const gender = speaker.gender || detectGender(speaker.name);
    voiceMap.set(speaker.name, {
      name: speaker.name,
      gender,
      persianVoice: getPersianVoice(undefined, gender),
      japaneseVoice: getJapaneseVoice(gender),
    });
  }

  return voiceMap;
}
