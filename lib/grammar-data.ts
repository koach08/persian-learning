import type { CEFRLevel } from "./level-manager";

export interface GrammarExample {
  persian: string;
  romanization: string;
  japanese: string;
}

export interface GrammarQuestion {
  type: "multiple-choice" | "fill-in" | "error-correction";
  question: string;
  persianContext?: string;
  options?: string[];
  correctIndex?: number;
  sentence?: string;
  answer?: string;
  hint?: string;
  corrected?: string;
  explanation: string;
}

export interface GrammarTopic {
  id: string;
  title: string;
  titlePersian: string;
  level: CEFRLevel;
  explanation: string;
  examples: GrammarExample[];
  questions: GrammarQuestion[];
}

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  // ─── A1 ───
  {
    id: "a1-pronouns",
    title: "人称代名詞",
    titlePersian: "ضمایر شخصی",
    level: "A1",
    explanation:
      "ペルシア語の人称代名詞は6つ。主語として文頭に置きます。三人称は性別の区別がありません。",
    examples: [
      { persian: "من دانشجو هستم", romanization: "man dâneshjoo hastam", japanese: "私は学生です" },
      { persian: "تو ایرانی هستی", romanization: "to irâni hasti", japanese: "あなたはイラン人です" },
      { persian: "او معلم است", romanization: "oo mo'allem ast", japanese: "彼/彼女は先生です" },
    ],
    questions: [
      {
        type: "multiple-choice",
        question: "「私たちは友達です」を正しく表しているのはどれ？",
        options: ["من دوست هستم", "ما دوست هستیم", "شما دوست هستید", "آنها دوست هستند"],
        correctIndex: 1,
        explanation: "「私たち」は ما (mâ) で、動詞は هستیم (hastim) になります。",
      },
      {
        type: "fill-in",
        question: "適切な代名詞を入れてください",
        sentence: "___ خوب هستید؟",
        answer: "شما",
        hint: "「あなた（丁寧）」に当たる代名詞",
        explanation: "شما は「あなた（丁寧）/ あなたたち」を意味し、動詞は هستید になります。",
      },
      {
        type: "multiple-choice",
        question: "ペルシア語の三人称代名詞 او について正しいのは？",
        options: ["男性のみ", "女性のみ", "男女どちらにも使う", "物にだけ使う"],
        correctIndex: 2,
        explanation: "ペルシア語には文法上の性がなく、او は「彼」にも「彼女」にも使います。",
      },
    ],
  },
  {
    id: "a1-to-be",
    title: "「〜です」(بودن)",
    titlePersian: "فعل بودن",
    level: "A1",
    explanation:
      "بودن (budan) は「〜である」を意味する最も基本的な動詞。現在形では短縮形がよく使われます。",
    examples: [
      { persian: "من خوشحال هستم", romanization: "man khoshhâl hastam", japanese: "私は嬉しいです" },
      { persian: "آب سرد است", romanization: "âb sard ast", japanese: "水は冷たいです" },
      { persian: "ما آماده‌ایم", romanization: "mâ âmâde-im", japanese: "私たちは準備ができています" },
    ],
    questions: [
      {
        type: "multiple-choice",
        question: "「彼らは忙しいです」の正しい形は？",
        options: ["آنها مشغول است", "آنها مشغول هستند", "آنها مشغول هستیم", "آنها مشغول هستی"],
        correctIndex: 1,
        explanation: "آنها（彼ら）に対応する بودن の現在形は هستند (hastand) です。",
      },
      {
        type: "error-correction",
        question: "この文の間違いを直してください",
        sentence: "تو دانشجو هستم",
        corrected: "تو دانشجو هستی",
        explanation: "تو (あなた) には هستی (hasti) を使います。هستم は من (私) 用です。",
      },
      {
        type: "fill-in",
        question: "空欄に適切な動詞を入れてください",
        sentence: "من ایرانی ___",
        answer: "هستم",
        hint: "「私は〜です」の動詞活用形",
        explanation: "من に対応する بودن の現在形は هستم (hastam) です。",
      },
    ],
  },
  {
    id: "a1-negation",
    title: "否定文",
    titlePersian: "منفی کردن",
    level: "A1",
    explanation:
      "ペルシア語の否定は動詞の前に ن- (na-/ne-) を付けます。بودن の否定形は نیستم、نیستی... です。",
    examples: [
      { persian: "من ایرانی نیستم", romanization: "man irâni nistam", japanese: "私はイラン人ではありません" },
      { persian: "او اینجا نیست", romanization: "oo injâ nist", japanese: "彼/彼女はここにいません" },
      { persian: "من نمی‌دانم", romanization: "man nemi-dânam", japanese: "私は知りません" },
    ],
    questions: [
      {
        type: "multiple-choice",
        question: "「私たちは学生ではありません」の正しい形は？",
        options: ["ما دانشجو نیست", "ما دانشجو نیستیم", "ما دانشجو نیستند", "ما دانشجو نیستی"],
        correctIndex: 1,
        explanation: "ما に対応する否定形は نیستیم (nistim) です。",
      },
      {
        type: "fill-in",
        question: "動詞を否定形にしてください",
        sentence: "او خوشحال ___",
        answer: "نیست",
        hint: "「〜ではない」の三人称単数形",
        explanation: "او に対応する بودن の否定形は نیست (nist) です。",
      },
    ],
  },
  {
    id: "a1-ra-marker",
    title: "目的語マーカー را",
    titlePersian: "نشانه مفعول «را»",
    level: "A1",
    explanation:
      "را (râ) は特定の直接目的語の後に付けます。英語の定冠詞 the に近い機能もあります。SOV語順で使います。",
    examples: [
      { persian: "من کتاب را خواندم", romanization: "man ketâb râ khândam", japanese: "私はその本を読みました" },
      { persian: "آب را بخور", romanization: "âb râ bokhor", japanese: "その水を飲みなさい" },
    ],
    questions: [
      {
        type: "multiple-choice",
        question: "را を使うべき文はどれ？",
        options: ["من آب می‌خورم (水を飲む/一般)", "من این آب ___ می‌خورم (この水を飲む)", "من خسته هستم (疲れている)", "او می‌رود (彼は行く)"],
        correctIndex: 1,
        explanation: "「この水」は特定の目的語なので را が必要です。不特定の場合は不要です。",
      },
    ],
  },

  // ─── A2 ───
  {
    id: "a2-past-tense",
    title: "過去形",
    titlePersian: "زمان گذشته",
    level: "A2",
    explanation:
      "ペルシア語の過去形は語幹（بن ماضی）+ 人称接尾辞で作ります。رفتن (行く) → رفت- → رفتم (行った)。",
    examples: [
      { persian: "من رفتم", romanization: "man raftam", japanese: "私は行きました" },
      { persian: "او غذا خورد", romanization: "oo ghazâ khord", japanese: "彼/彼女は食事をしました" },
      { persian: "ما فیلم دیدیم", romanization: "mâ film didim", japanese: "私たちは映画を見ました" },
    ],
    questions: [
      {
        type: "multiple-choice",
        question: "「あなたたちは来ました」の正しい形は？",
        options: ["شما آمدم", "شما آمدید", "شما آمدند", "شما آمدی"],
        correctIndex: 1,
        explanation: "شما に対応する過去形の接尾辞は -ید です。آمدن → آمدید",
      },
      {
        type: "fill-in",
        question: "過去形にしてください：彼らは書きました (نوشتن)",
        sentence: "آنها نامه ___",
        answer: "نوشتند",
        hint: "نوشتن の過去語幹 نوشت- + 三人称複数の接尾辞",
        explanation: "آنها には -ند を付けます。نوشت + ند = نوشتند",
      },
      {
        type: "error-correction",
        question: "この文の間違いを直してください",
        sentence: "من دیروز به مدرسه رفتی",
        corrected: "من دیروز به مدرسه رفتم",
        explanation: "主語が من なので動詞は رفتم (raftam) です。رفتی は تو に対応します。",
      },
    ],
  },
  {
    id: "a2-comparatives",
    title: "比較級・最上級",
    titlePersian: "صفت تفضیلی و عالی",
    level: "A2",
    explanation:
      "比較級は形容詞 + ‌تر (tar)。最上級は形容詞 + ‌ترین (tarin)。比較対象は از で示します。",
    examples: [
      { persian: "تهران بزرگ‌تر از اصفهان است", romanization: "tehrân bozorg-tar az esfahân ast", japanese: "テヘランはエスファハンより大きい" },
      { persian: "او بهترین دانشجو است", romanization: "oo behtarin dâneshjoo ast", japanese: "彼/彼女は最も優秀な学生です" },
    ],
    questions: [
      {
        type: "multiple-choice",
        question: "「この本はあの本より面白い」の正しい形は？",
        options: [
          "این کتاب از آن کتاب جالب است",
          "این کتاب جالب‌تر از آن کتاب است",
          "این کتاب جالب‌ترین از آن کتاب است",
          "این کتاب جالب آن کتاب است",
        ],
        correctIndex: 1,
        explanation: "比較級は 形容詞 + ‌تر + از で作ります。جالب → جالب‌تر",
      },
      {
        type: "fill-in",
        question: "最上級にしてください：「一番高い山」",
        sentence: "بلند___ کوه",
        answer: "ترین",
        hint: "最上級の接尾辞",
        explanation: "最上級は -ترین を付けます。بلند + ترین = بلندترین",
      },
    ],
  },
  {
    id: "a2-prepositions",
    title: "前置詞",
    titlePersian: "حروف اضافه",
    level: "A2",
    explanation:
      "主要な前置詞：در (〜の中に)、از (〜から)、به (〜へ)、با (〜と一緒に)、برای (〜のために)。",
    examples: [
      { persian: "من در خانه هستم", romanization: "man dar khâne hastam", japanese: "私は家にいます" },
      { persian: "از تهران آمدم", romanization: "az tehrân âmadam", japanese: "テヘランから来ました" },
      { persian: "با دوستم رفتم", romanization: "bâ doostam raftam", japanese: "友達と一緒に行きました" },
    ],
    questions: [
      {
        type: "fill-in",
        question: "適切な前置詞を入れてください：「大学へ行く」",
        sentence: "من ___ دانشگاه می‌روم",
        answer: "به",
        hint: "方向を示す前置詞（〜へ）",
        explanation: "به は方向・移動先を示します。",
      },
      {
        type: "multiple-choice",
        question: "「〜のために」を意味する前置詞はどれ？",
        options: ["در", "از", "با", "برای"],
        correctIndex: 3,
        explanation: "برای (barâye) は目的を示す前置詞で「〜のために」を意味します。",
      },
    ],
  },

  // ─── B1 ───
  {
    id: "b1-compound-verbs",
    title: "複合動詞",
    titlePersian: "فعل‌های مرکب",
    level: "B1",
    explanation:
      "ペルシア語の動詞の多くは「名詞/形容詞 + 軽動詞」の複合動詞です。代表的な軽動詞：کردن (する)、شدن (なる)、داشتن (持つ)、زدن (打つ)。",
    examples: [
      { persian: "کار می‌کنم", romanization: "kâr mi-konam", japanese: "仕事をする（働く）" },
      { persian: "صحبت کردن", romanization: "sohbat kardan", japanese: "会話する" },
      { persian: "حرف زدن", romanization: "harf zadan", japanese: "話す" },
      { persian: "دوش گرفتن", romanization: "dush gereftan", japanese: "シャワーを浴びる" },
    ],
    questions: [
      {
        type: "multiple-choice",
        question: "「旅行する」の複合動詞はどれ？",
        options: ["سفر خوردن", "سفر کردن", "سفر شدن", "سفر داشتن"],
        correctIndex: 1,
        explanation: "سفر کردن は「旅行をする」。کردن は「する」を意味する軽動詞です。",
      },
      {
        type: "fill-in",
        question: "「電話をかける」の複合動詞を完成させてください",
        sentence: "تلفن ___",
        answer: "زدن",
        hint: "「打つ」を意味する軽動詞",
        explanation: "تلفن زدن で「電話をかける」。زدن は多くの動作の複合動詞に使われます。",
      },
    ],
  },
  {
    id: "b1-subjunctive",
    title: "接続法（仮定法）",
    titlePersian: "وجه التزامی",
    level: "B1",
    explanation:
      "接続法は ب- (be-) + 現在語幹 + 人称接尾辞。願望・命令・目的・必要性を表します。می- の代わりに ب- を使います。",
    examples: [
      { persian: "می‌خواهم بروم", romanization: "mi-khâham beravam", japanese: "行きたいです" },
      { persian: "باید بخوانی", romanization: "bâyad bekhâni", japanese: "読まなければならない" },
      { persian: "شاید بیاید", romanization: "shâyad biâyad", japanese: "来るかもしれない" },
    ],
    questions: [
      {
        type: "multiple-choice",
        question: "「私は食べたい」を正しく表しているのは？",
        options: ["من می‌خواهم می‌خورم", "من می‌خواهم بخورم", "من می‌خواهم خوردم", "من بخواهم بخورم"],
        correctIndex: 1,
        explanation: "「〜したい」は می‌خواهم + 接続法。خوردن の接続法は بخورم です。",
      },
      {
        type: "fill-in",
        question: "接続法にしてください：「あなたは行かなければならない」",
        sentence: "تو باید ___",
        answer: "بروی",
        hint: "رفتن の接続法二人称単数",
        explanation: "رفتن → 現在語幹 رو- → ب + رو + ی = بروی",
      },
    ],
  },
  {
    id: "b1-relative-clause",
    title: "関係節 (که)",
    titlePersian: "جمله وصفی با «که»",
    level: "B1",
    explanation:
      "که は関係代名詞として「〜するところの」を意味し、名詞を修飾する節を導きます。英語の that/which/who に相当します。",
    examples: [
      { persian: "کتابی که خواندم جالب بود", romanization: "ketâbi ke khândam jâleb bud", japanese: "私が読んだ本は面白かった" },
      { persian: "مردی که آنجا ایستاده دوست من است", romanization: "mardi ke ânjâ istâde dust-e man ast", japanese: "あそこに立っている男性は私の友人です" },
    ],
    questions: [
      {
        type: "fill-in",
        question: "関係節を完成させてください：「私が買った服」",
        sentence: "لباسی ___ خریدم",
        answer: "که",
        hint: "関係代名詞",
        explanation: "که を使って「〜したところの」という関係節を作ります。",
      },
    ],
  },

  // ─── B2 ───
  {
    id: "b2-passive",
    title: "受動態",
    titlePersian: "مجهول",
    level: "B2",
    explanation:
      "受動態は過去分詞 + شدن (shodan) で作ります。過去分詞は過去語幹 + ه (e)。例：نوشتن → نوشته شدن (書かれる)。",
    examples: [
      { persian: "این کتاب نوشته شد", romanization: "in ketâb neveshte shod", japanese: "この本は書かれた" },
      { persian: "در باز شده است", romanization: "dar bâz shode ast", japanese: "ドアは開けられている" },
      { persian: "غذا پخته می‌شود", romanization: "ghazâ pokhte mi-shavad", japanese: "料理が作られる" },
    ],
    questions: [
      {
        type: "multiple-choice",
        question: "「この手紙は送られた」の正しい受動態は？",
        options: ["این نامه فرستاد", "این نامه فرستاده شد", "این نامه فرستاده کرد", "این نامه می‌فرستد"],
        correctIndex: 1,
        explanation: "受動態は 過去分詞(فرستاده) + شدن。過去形なので شد を使います。",
      },
    ],
  },
  {
    id: "b2-conditionals",
    title: "条件文",
    titlePersian: "جملات شرطی",
    level: "B2",
    explanation:
      "条件文は اگر (agar = もし) で始まります。現実的条件は直説法、非現実的条件は過去形を使います（英語の仮定法過去に似ています）。",
    examples: [
      { persian: "اگر باران ببارد، نمی‌روم", romanization: "agar bârân bebârad, nemi-ravam", japanese: "雨が降ったら、行きません" },
      { persian: "اگر پول داشتم، سفر می‌کردم", romanization: "agar pool dâshtam, safar mi-kardam", japanese: "お金があったら、旅行するのに" },
    ],
    questions: [
      {
        type: "multiple-choice",
        question: "非現実的条件（仮定法）の正しい形は？「もし時間があったら、本を読むのに」",
        options: [
          "اگر وقت دارم، کتاب می‌خوانم",
          "اگر وقت داشتم، کتاب می‌خواندم",
          "اگر وقت داشته باشم، کتاب بخوانم",
          "اگر وقت دارید، کتاب بخوانید",
        ],
        correctIndex: 1,
        explanation: "非現実的条件では両方の節で過去形を使います（事実に反する仮定）。",
      },
      {
        type: "fill-in",
        question: "条件文を完成させてください：「もし彼が来たら、嬉しいです」",
        sentence: "___ او بیاید، خوشحال می‌شوم",
        answer: "اگر",
        hint: "「もし」を意味する接続詞",
        explanation: "اگر (agar) は「もし」を意味する条件接続詞です。",
      },
    ],
  },
  {
    id: "b2-formal-informal",
    title: "フォーマル vs カジュアル",
    titlePersian: "رسمی و غیررسمی",
    level: "B2",
    explanation:
      "ペルシア語には書き言葉（فارسی رسمی）と話し言葉（فارسی محاوره‌ای）の大きな差があります。日常会話では音の縮約が多く起きます。",
    examples: [
      { persian: "می‌خواهم → می‌خوام", romanization: "mi-khâham → mi-khâm", japanese: "〜したい（正式→口語）" },
      { persian: "نمی‌دانم → نمی‌دونم", romanization: "nemi-dânam → nemi-dunam", japanese: "知らない（正式→口語）" },
      { persian: "آن → اون", romanization: "ân → un", japanese: "あの（正式→口語）" },
      { persian: "چه → چی", romanization: "che → chi", japanese: "何（正式→口語）" },
    ],
    questions: [
      {
        type: "multiple-choice",
        question: "「می‌روم」のカジュアルな形は？",
        options: ["می‌رم", "برم", "رفتم", "می‌روید"],
        correctIndex: 0,
        explanation: "口語ではو が落ちて می‌رم になります。",
      },
    ],
  },
];

export function getTopicsByLevel(level: CEFRLevel): GrammarTopic[] {
  return GRAMMAR_TOPICS.filter((t) => t.level === level);
}

export function getTopicById(id: string): GrammarTopic | undefined {
  return GRAMMAR_TOPICS.find((t) => t.id === id);
}

// Storage
const GRAMMAR_STORAGE_KEY = "grammar-progress";

export interface GrammarProgress {
  topicScores: Record<string, { correct: number; total: number }>;
  lastStudied: string;
}

export function getGrammarProgress(): GrammarProgress {
  if (typeof window === "undefined") return { topicScores: {}, lastStudied: "" };
  const raw = localStorage.getItem(GRAMMAR_STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  return { topicScores: {}, lastStudied: "" };
}

export function saveGrammarProgress(progress: GrammarProgress): void {
  localStorage.setItem(GRAMMAR_STORAGE_KEY, JSON.stringify(progress));
}
