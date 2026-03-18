import type { CEFRLevel } from "./level-manager";

// --- Type Definitions ---

export interface LessonStep {
  type: "listen" | "speak" | "speak-cloze" | "tip";
  phrase: string;           // Persian phrase
  romanization: string;     // Romanized
  translation: string;      // Japanese translation
  tipText?: string;         // Pronunciation hint (Japanese)
  clozeWord?: string;       // Word to hide in cloze mode
  praiseText?: string;      // Persian praise text
}

export interface Lesson {
  id: string;
  title: string;            // Japanese title
  titlePersian: string;     // Persian title
  level: CEFRLevel;
  steps: LessonStep[];
}

// --- Lesson Content ---

export const GUIDED_LESSONS: Lesson[] = [
  // ═══════════════════════ A1 ═══════════════════════

  {
    id: "a1-greetings",
    title: "挨拶をしよう",
    titlePersian: "سلام کردن",
    level: "A1",
    steps: [
      {
        type: "tip",
        phrase: "سلام",
        romanization: "salaam",
        translation: "こんにちは",
        tipText: "「サラーム」— 最も基本的な挨拶です。どんな場面でも使えます。",
      },
      {
        type: "listen",
        phrase: "سلام",
        romanization: "salaam",
        translation: "こんにちは",
      },
      {
        type: "speak",
        phrase: "سلام",
        romanization: "salaam",
        translation: "こんにちは",
        praiseText: "آفرین!",
      },
      {
        type: "tip",
        phrase: "حالت چطوره؟",
        romanization: "haalet chetore?",
        translation: "元気？",
        tipText: "「ハーレト チェトレ？」— 親しい相手に使うカジュアルな表現です。",
      },
      {
        type: "listen",
        phrase: "حالت چطوره؟",
        romanization: "haalet chetore?",
        translation: "元気？",
      },
      {
        type: "speak",
        phrase: "حالت چطوره؟",
        romanization: "haalet chetore?",
        translation: "元気？",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "خوبم ممنون",
        romanization: "khoobam mersi",
        translation: "元気だよ、ありがとう",
      },
      {
        type: "speak",
        phrase: "خوبم ممنون",
        romanization: "khoobam mersi",
        translation: "元気だよ、ありがとう",
        praiseText: "آفرین!",
      },
      {
        type: "speak-cloze",
        phrase: "سلام حالت چطوره؟",
        romanization: "salaam haalet chetore?",
        translation: "こんにちは、元気？",
        clozeWord: "چطوره",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak",
        phrase: "سلام! حالت چطوره؟ خوبم ممنون",
        romanization: "salaam! haalet chetore? khoobam mersi",
        translation: "こんにちは！元気？元気だよ、ありがとう",
        praiseText: "عالی بود!",
      },
    ],
  },

  {
    id: "a1-self-intro",
    title: "自己紹介",
    titlePersian: "معرفی خود",
    level: "A1",
    steps: [
      {
        type: "tip",
        phrase: "اسمم ... هست",
        romanization: "esmam ... hast",
        translation: "私の名前は...です",
        tipText: "「エスマム ... ハスト」— 名前を言う時の基本パターンです。",
      },
      {
        type: "listen",
        phrase: "اسمم مینا هست",
        romanization: "esmam Mina hast",
        translation: "私の名前はミーナです",
      },
      {
        type: "speak",
        phrase: "اسمم مینا هست",
        romanization: "esmam Mina hast",
        translation: "私の名前はミーナです",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "من ژاپنی هستم",
        romanization: "man zhaaponi hastam",
        translation: "私は日本人です",
      },
      {
        type: "speak",
        phrase: "من ژاپنی هستم",
        romanization: "man zhaaponi hastam",
        translation: "私は日本人です",
        praiseText: "عالی!",
      },
      {
        type: "tip",
        phrase: "از آشنایی‌تون خوشبختم",
        romanization: "az aashnaayitun khoshbakhtam",
        translation: "お会いできて嬉しいです",
        tipText: "「アズ アーシュナーイートゥン ホシュバフタム」— 初対面の挨拶です。",
      },
      {
        type: "listen",
        phrase: "از آشنایی‌تون خوشبختم",
        romanization: "az aashnaayitun khoshbakhtam",
        translation: "お会いできて嬉しいです",
      },
      {
        type: "speak",
        phrase: "از آشنایی‌تون خوشبختم",
        romanization: "az aashnaayitun khoshbakhtam",
        translation: "お会いできて嬉しいです",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "من ژاپنی هستم",
        romanization: "man zhaaponi hastam",
        translation: "私は日本人です",
        clozeWord: "ژاپنی",
        praiseText: "آفرین!",
      },
      {
        type: "speak",
        phrase: "سلام اسمم مینا هست من ژاپنی هستم",
        romanization: "salaam esmam Mina hast man zhaaponi hastam",
        translation: "こんにちは、私の名前はミーナです。日本人です",
        praiseText: "عالی بود!",
      },
    ],
  },

  {
    id: "a1-numbers-shopping",
    title: "数字と買い物",
    titlePersian: "اعداد و خرید",
    level: "A1",
    steps: [
      {
        type: "tip",
        phrase: "یک دو سه",
        romanization: "yek do se",
        translation: "1 2 3",
        tipText: "ペルシア語の数字は日常会話で頻繁に使います。まず1-3から覚えましょう。",
      },
      {
        type: "listen",
        phrase: "یک دو سه",
        romanization: "yek do se",
        translation: "1 2 3",
      },
      {
        type: "speak",
        phrase: "یک دو سه",
        romanization: "yek do se",
        translation: "1 2 3",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "چند تا؟",
        romanization: "chand taa?",
        translation: "いくつ？",
      },
      {
        type: "speak",
        phrase: "چند تا؟",
        romanization: "chand taa?",
        translation: "いくつ？",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "قیمتش چقدره؟",
        romanization: "gheymatesh cheqadre?",
        translation: "これはいくらですか？",
      },
      {
        type: "speak",
        phrase: "قیمتش چقدره؟",
        romanization: "gheymatesh cheqadre?",
        translation: "これはいくらですか？",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "قیمتش چقدره؟",
        romanization: "gheymatesh cheqadre?",
        translation: "これはいくらですか？",
        clozeWord: "چقدره",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "سه تا لطفاً",
        romanization: "se taa lotfan",
        translation: "3つください",
      },
      {
        type: "speak",
        phrase: "سه تا لطفاً",
        romanization: "se taa lotfan",
        translation: "3つください",
        praiseText: "عالی بود!",
      },
    ],
  },

  {
    id: "a1-thanks",
    title: "ありがとう・ごめん",
    titlePersian: "تشکر و عذرخواهی",
    level: "A1",
    steps: [
      {
        type: "tip",
        phrase: "ممنون",
        romanization: "mersi",
        translation: "ありがとう",
        tipText: "「メルシ」— フランス語由来の「ありがとう」。日常で一番使います。",
      },
      {
        type: "listen",
        phrase: "ممنون",
        romanization: "mersi",
        translation: "ありがとう",
      },
      {
        type: "speak",
        phrase: "ممنون",
        romanization: "mersi",
        translation: "ありがとう",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "خیلی ممنون",
        romanization: "kheyli mersi",
        translation: "本当にありがとう",
      },
      {
        type: "speak",
        phrase: "خیلی ممنون",
        romanization: "kheyli mersi",
        translation: "本当にありがとう",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "ببخشید",
        romanization: "bebakhshid",
        translation: "すみません / ごめんなさい",
      },
      {
        type: "speak",
        phrase: "ببخشید",
        romanization: "bebakhshid",
        translation: "すみません / ごめんなさい",
        praiseText: "خیلی خوب!",
      },
      {
        type: "listen",
        phrase: "خواهش می‌کنم",
        romanization: "khaahesh mikonam",
        translation: "どういたしまして",
      },
      {
        type: "speak",
        phrase: "خواهش می‌کنم",
        romanization: "khaahesh mikonam",
        translation: "どういたしまして",
        praiseText: "آفرین!",
      },
      {
        type: "speak-cloze",
        phrase: "خیلی ممنون خواهش می‌کنم",
        romanization: "kheyli mersi khaahesh mikonam",
        translation: "本当にありがとう — どういたしまして",
        clozeWord: "خواهش",
        praiseText: "عالی بود!",
      },
    ],
  },

  // ═══════════════════════ A2 ═══════════════════════

  {
    id: "a2-cafe-order",
    title: "カフェで注文する",
    titlePersian: "سفارش در کافه",
    level: "A2",
    steps: [
      {
        type: "tip",
        phrase: "یه قهوه لطفاً",
        romanization: "ye qahve lotfan",
        translation: "コーヒーを1つお願いします",
        tipText: "「イェ」は「1つの」のカジュアルな言い方です。",
      },
      {
        type: "listen",
        phrase: "سلام یه قهوه لطفاً",
        romanization: "salaam ye qahve lotfan",
        translation: "こんにちは、コーヒーを1つお願いします",
      },
      {
        type: "speak",
        phrase: "سلام یه قهوه لطفاً",
        romanization: "salaam ye qahve lotfan",
        translation: "こんにちは、コーヒーを1つお願いします",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "با شیر یا بدون شیر؟",
        romanization: "baa shir yaa bedune shir?",
        translation: "ミルクありですか、なしですか？",
      },
      {
        type: "speak",
        phrase: "با شیر لطفاً",
        romanization: "baa shir lotfan",
        translation: "ミルクありでお願いします",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "چیز دیگه‌ای می‌خواید؟",
        romanization: "chize digei mikhaaid?",
        translation: "他にご注文はありますか？",
      },
      {
        type: "speak",
        phrase: "یه کیک هم لطفاً",
        romanization: "ye keyk ham lotfan",
        translation: "ケーキも1つお願いします",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "یه قهوه با شیر لطفاً",
        romanization: "ye qahve baa shir lotfan",
        translation: "ミルク入りコーヒーを1つお願いします",
        clozeWord: "شیر",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "حساب لطفاً",
        romanization: "hesaab lotfan",
        translation: "お会計お願いします",
      },
      {
        type: "speak",
        phrase: "حساب لطفاً",
        romanization: "hesaab lotfan",
        translation: "お会計お願いします",
        praiseText: "عالی بود!",
      },
    ],
  },

  {
    id: "a2-directions",
    title: "道を聞く",
    titlePersian: "پرسیدن آدرس",
    level: "A2",
    steps: [
      {
        type: "tip",
        phrase: "ببخشید",
        romanization: "bebakhshid",
        translation: "すみません",
        tipText: "道を聞く時は必ず「ベバフシード」から始めましょう。",
      },
      {
        type: "listen",
        phrase: "ببخشید مترو کجاست؟",
        romanization: "bebakhshid metro kojaast?",
        translation: "すみません、地下鉄はどこですか？",
      },
      {
        type: "speak",
        phrase: "ببخشید مترو کجاست؟",
        romanization: "bebakhshid metro kojaast?",
        translation: "すみません、地下鉄はどこですか？",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "مستقیم برید",
        romanization: "mostaghim berid",
        translation: "まっすぐ行ってください",
      },
      {
        type: "speak",
        phrase: "مستقیم برید",
        romanization: "mostaghim berid",
        translation: "まっすぐ行ってください",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "بپیچید سمت راست",
        romanization: "bepichid samte raast",
        translation: "右に曲がってください",
      },
      {
        type: "speak",
        phrase: "بپیچید سمت راست",
        romanization: "bepichid samte raast",
        translation: "右に曲がってください",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "ببخشید مترو کجاست؟",
        romanization: "bebakhshid metro kojaast?",
        translation: "すみません、地下鉄はどこですか？",
        clozeWord: "کجاست",
        praiseText: "آفرین!",
      },
      {
        type: "speak",
        phrase: "خیلی ممنون",
        romanization: "kheyli mersi",
        translation: "どうもありがとう",
        praiseText: "عالی بود!",
      },
    ],
  },

  {
    id: "a2-restaurant",
    title: "レストランで注文",
    titlePersian: "سفارش در رستوران",
    level: "A2",
    steps: [
      {
        type: "listen",
        phrase: "یه میز برای دو نفر لطفاً",
        romanization: "ye miz baraaye do nafar lotfan",
        translation: "2名のテーブルをお願いします",
      },
      {
        type: "speak",
        phrase: "یه میز برای دو نفر لطفاً",
        romanization: "ye miz baraaye do nafar lotfan",
        translation: "2名のテーブルをお願いします",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "منو رو ببینم",
        romanization: "menu ro bebinam",
        translation: "メニューを見せてください",
      },
      {
        type: "speak",
        phrase: "منو رو ببینم",
        romanization: "menu ro bebinam",
        translation: "メニューを見せてください",
        praiseText: "عالی!",
      },
      {
        type: "tip",
        phrase: "چلوکباب",
        romanization: "chelow kabaab",
        translation: "チェロケバブ（ご飯+ケバブ）",
        tipText: "イラン料理の代表格。ご飯とケバブのセットです。",
      },
      {
        type: "listen",
        phrase: "یه چلوکباب لطفاً",
        romanization: "ye chelow kabaab lotfan",
        translation: "チェロケバブを1つお願いします",
      },
      {
        type: "speak",
        phrase: "یه چلوکباب لطفاً",
        romanization: "ye chelow kabaab lotfan",
        translation: "チェロケバブを1つお願いします",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "یه میز برای دو نفر لطفاً",
        romanization: "ye miz baraaye do nafar lotfan",
        translation: "2名のテーブルをお願いします",
        clozeWord: "نفر",
        praiseText: "آفرین!",
      },
      {
        type: "speak",
        phrase: "حساب لطفاً خیلی ممنون",
        romanization: "hesaab lotfan kheyli mersi",
        translation: "お会計お願いします、ありがとうございます",
        praiseText: "عالی بود!",
      },
    ],
  },

  {
    id: "a2-time",
    title: "時間を聞く",
    titlePersian: "پرسیدن ساعت",
    level: "A2",
    steps: [
      {
        type: "tip",
        phrase: "ساعت چنده؟",
        romanization: "saa'at chande?",
        translation: "何時ですか？",
        tipText: "「サーアト チャンデ？」— 時間を聞く定番フレーズです。",
      },
      {
        type: "listen",
        phrase: "ساعت چنده؟",
        romanization: "saa'at chande?",
        translation: "何時ですか？",
      },
      {
        type: "speak",
        phrase: "ساعت چنده؟",
        romanization: "saa'at chande?",
        translation: "何時ですか？",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "ساعت سه و نیم",
        romanization: "saa'at se o nim",
        translation: "3時半です",
      },
      {
        type: "speak",
        phrase: "ساعت سه و نیم",
        romanization: "saa'at se o nim",
        translation: "3時半です",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "کی می‌رسی؟",
        romanization: "key miresi?",
        translation: "いつ着きますか？",
      },
      {
        type: "speak",
        phrase: "کی می‌رسی؟",
        romanization: "key miresi?",
        translation: "いつ着きますか？",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "ساعت سه و نیم",
        romanization: "saa'at se o nim",
        translation: "3時半です",
        clozeWord: "نیم",
        praiseText: "عالی بود!",
      },
    ],
  },

  // ═══════════════════════ B1 ═══════════════════════

  {
    id: "b1-travel-plans",
    title: "旅行の計画",
    titlePersian: "برنامه سفر",
    level: "B1",
    steps: [
      {
        type: "tip",
        phrase: "می‌خوام برم سفر",
        romanization: "mikhaam beram safar",
        translation: "旅行に行きたい",
        tipText: "「می‌خوام」(mikhaam) = 〜したい。日常会話で最頻出の表現です。",
      },
      {
        type: "listen",
        phrase: "می‌خوام تابستون برم اصفهان",
        romanization: "mikhaam taabestun beram esfahaan",
        translation: "夏にイスファハンに行きたい",
      },
      {
        type: "speak",
        phrase: "می‌خوام تابستون برم اصفهان",
        romanization: "mikhaam taabestun beram esfahaan",
        translation: "夏にイスファハンに行きたい",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "هتل رزرو کردی؟",
        romanization: "hotel rezerv kardi?",
        translation: "ホテルは予約した？",
      },
      {
        type: "speak",
        phrase: "هنوز نه باید رزرو کنم",
        romanization: "hanuz na baayad rezerv konam",
        translation: "まだ。予約しないと",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "چند روز می‌مونی؟",
        romanization: "chand ruz mimooni?",
        translation: "何日滞在するの？",
      },
      {
        type: "speak",
        phrase: "فکر کنم یه هفته",
        romanization: "fekr konam ye hafte",
        translation: "たぶん1週間",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "می‌خوام تابستون برم اصفهان",
        romanization: "mikhaam taabestun beram esfahaan",
        translation: "夏にイスファハンに行きたい",
        clozeWord: "تابستون",
        praiseText: "عالی بود!",
      },
    ],
  },

  {
    id: "b1-opinions",
    title: "意見を言う",
    titlePersian: "اظهار نظر",
    level: "B1",
    steps: [
      {
        type: "listen",
        phrase: "به نظر من",
        romanization: "be nazare man",
        translation: "私の意見では",
      },
      {
        type: "speak",
        phrase: "به نظر من",
        romanization: "be nazare man",
        translation: "私の意見では",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "به نظر من این فیلم خیلی خوب بود",
        romanization: "be nazare man in film kheyli khoob bud",
        translation: "この映画はとても良かったと思う",
      },
      {
        type: "speak",
        phrase: "به نظر من این فیلم خیلی خوب بود",
        romanization: "be nazare man in film kheyli khoob bud",
        translation: "この映画はとても良かったと思う",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "موافقم ولی فکر می‌کنم",
        romanization: "movaafegham vali fekr mikonam",
        translation: "賛成だけど、思うに...",
      },
      {
        type: "speak",
        phrase: "موافقم ولی فکر می‌کنم",
        romanization: "movaafegham vali fekr mikonam",
        translation: "賛成だけど、思うに...",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "به نظر من این فیلم خیلی خوب بود",
        romanization: "be nazare man in film kheyli khoob bud",
        translation: "この映画はとても良かったと思う",
        clozeWord: "فیلم",
        praiseText: "آفرین!",
      },
      {
        type: "speak",
        phrase: "من مخالفم چون فکر می‌کنم",
        romanization: "man mokhaalefam chon fekr mikonam",
        translation: "反対です、なぜなら思うに...",
        praiseText: "عالی بود!",
      },
    ],
  },

  {
    id: "b1-daily-routine",
    title: "日常を話す",
    titlePersian: "زندگی روزمره",
    level: "B1",
    steps: [
      {
        type: "listen",
        phrase: "صبح زود بیدار می‌شم",
        romanization: "sobh zud bidaar misham",
        translation: "朝早く起きます",
      },
      {
        type: "speak",
        phrase: "صبح زود بیدار می‌شم",
        romanization: "sobh zud bidaar misham",
        translation: "朝早く起きます",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "بعد از صبحانه می‌رم سر کار",
        romanization: "ba'd az sobhaane miram sare kaar",
        translation: "朝食後に仕事に行きます",
      },
      {
        type: "speak",
        phrase: "بعد از صبحانه می‌رم سر کار",
        romanization: "ba'd az sobhaane miram sare kaar",
        translation: "朝食後に仕事に行きます",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "عصرها ورزش می‌کنم",
        romanization: "asrhaa varzesh mikonam",
        translation: "午後は運動します",
      },
      {
        type: "speak",
        phrase: "عصرها ورزش می‌کنم",
        romanization: "asrhaa varzesh mikonam",
        translation: "午後は運動します",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "بعد از صبحانه می‌رم سر کار",
        romanization: "ba'd az sobhaane miram sare kaar",
        translation: "朝食後に仕事に行きます",
        clozeWord: "صبحانه",
        praiseText: "آفرین!",
      },
      {
        type: "speak",
        phrase: "شب‌ها کتاب می‌خونم و می‌خوابم",
        romanization: "shabhaa ketaab mikhoonam o mikhaanam",
        translation: "夜は本を読んで寝ます",
        praiseText: "عالی بود!",
      },
    ],
  },

  {
    id: "b1-work-talk",
    title: "仕事の話",
    titlePersian: "صحبت درباره کار",
    level: "B1",
    steps: [
      {
        type: "listen",
        phrase: "شغلت چیه؟",
        romanization: "shoghlat chie?",
        translation: "仕事は何ですか？",
      },
      {
        type: "speak",
        phrase: "شغلت چیه؟",
        romanization: "shoghlat chie?",
        translation: "仕事は何ですか？",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "من مهندس نرم‌افزار هستم",
        romanization: "man mohandese narm-afzaar hastam",
        translation: "ソフトウェアエンジニアです",
      },
      {
        type: "speak",
        phrase: "من مهندس نرم‌افزار هستم",
        romanization: "man mohandese narm-afzaar hastam",
        translation: "ソフトウェアエンジニアです",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "از کارت راضی هستی؟",
        romanization: "az kaaret raazi hasti?",
        translation: "仕事に満足してる？",
      },
      {
        type: "speak",
        phrase: "آره خیلی دوستش دارم",
        romanization: "aare kheyli dustesh daaram",
        translation: "うん、すごく好きだよ",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "من مهندس نرم‌افزار هستم",
        romanization: "man mohandese narm-afzaar hastam",
        translation: "ソフトウェアエンジニアです",
        clozeWord: "مهندس",
        praiseText: "عالی بود!",
      },
    ],
  },

  // ═══════════════════════ B2 ═══════════════════════

  {
    id: "b2-culture",
    title: "文化を比較する",
    titlePersian: "مقایسه فرهنگ‌ها",
    level: "B2",
    steps: [
      {
        type: "listen",
        phrase: "فرهنگ ایران و ژاپن شباهت‌های زیادی دارن",
        romanization: "farhange iraan o zhaapon shabaahat-haaye ziaadi daaran",
        translation: "イランと日本の文化には多くの類似点がある",
      },
      {
        type: "speak",
        phrase: "فرهنگ ایران و ژاپن شباهت‌های زیادی دارن",
        romanization: "farhange iraan o zhaapon shabaahat-haaye ziaadi daaran",
        translation: "イランと日本の文化には多くの類似点がある",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "مثلاً هر دو فرهنگ به احترام اهمیت می‌دن",
        romanization: "masalan har do farhang be ehteraam ahamiyat midan",
        translation: "例えば、両文化とも礼儀を重視する",
      },
      {
        type: "speak",
        phrase: "مثلاً هر دو فرهنگ به احترام اهمیت می‌دن",
        romanization: "masalan har do farhang be ehteraam ahamiyat midan",
        translation: "例えば、両文化とも礼儀を重視する",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "ولی تفاوت‌هایی هم هست",
        romanization: "vali tafaavot-haayee ham hast",
        translation: "でも違いもある",
      },
      {
        type: "speak",
        phrase: "ولی تفاوت‌هایی هم هست",
        romanization: "vali tafaavot-haayee ham hast",
        translation: "でも違いもある",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "فرهنگ ایران و ژاپن شباهت‌های زیادی دارن",
        romanization: "farhange iraan o zhaapon shabaahat-haaye ziaadi daaran",
        translation: "イランと日本の文化には多くの類似点がある",
        clozeWord: "شباهت‌های",
        praiseText: "عالی بود!",
      },
    ],
  },

  {
    id: "b2-future-dreams",
    title: "将来の夢を語る",
    titlePersian: "آرزوهای آینده",
    level: "B2",
    steps: [
      {
        type: "listen",
        phrase: "آرزوت برای آینده چیه؟",
        romanization: "aarezut baraaye aayande chie?",
        translation: "将来の夢は何ですか？",
      },
      {
        type: "speak",
        phrase: "آرزوت برای آینده چیه؟",
        romanization: "aarezut baraaye aayande chie?",
        translation: "将来の夢は何ですか？",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "دوست دارم یه روز تو ایران زندگی کنم",
        romanization: "dust daaram ye ruz tu iraan zendegi konam",
        translation: "いつかイランに住みたい",
      },
      {
        type: "speak",
        phrase: "دوست دارم یه روز تو ایران زندگی کنم",
        romanization: "dust daaram ye ruz tu iraan zendegi konam",
        translation: "いつかイランに住みたい",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "امیدوارم بتونم این آرزو رو برآورده کنم",
        romanization: "omidvaaram betoonam in aarezu ro baraavarde konam",
        translation: "この夢を叶えられるといいな",
      },
      {
        type: "speak",
        phrase: "امیدوارم بتونم این آرزو رو برآورده کنم",
        romanization: "omidvaaram betoonam in aarezu ro baraavarde konam",
        translation: "この夢を叶えられるといいな",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "دوست دارم یه روز تو ایران زندگی کنم",
        romanization: "dust daaram ye ruz tu iraan zendegi konam",
        translation: "いつかイランに住みたい",
        clozeWord: "زندگی",
        praiseText: "عالی بود!",
      },
    ],
  },

  {
    id: "b2-debate",
    title: "議論する",
    titlePersian: "بحث و مناظره",
    level: "B2",
    steps: [
      {
        type: "listen",
        phrase: "از نظر من این موضوع پیچیده‌ست",
        romanization: "az nazare man in mowzu' pichidast",
        translation: "私の見解では、この問題は複雑だ",
      },
      {
        type: "speak",
        phrase: "از نظر من این موضوع پیچیده‌ست",
        romanization: "az nazare man in mowzu' pichidast",
        translation: "私の見解では、この問題は複雑だ",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "باید همه جوانب رو در نظر بگیریم",
        romanization: "baayad hame javaaneb ro dar nazar begirim",
        translation: "全ての側面を考慮すべきだ",
      },
      {
        type: "speak",
        phrase: "باید همه جوانب رو در نظر بگیریم",
        romanization: "baayad hame javaaneb ro dar nazar begirim",
        translation: "全ての側面を考慮すべきだ",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "با این حال معتقدم که",
        romanization: "baa in haal mo'taghedam ke",
        translation: "それでも私は...と信じている",
      },
      {
        type: "speak",
        phrase: "با این حال معتقدم که",
        romanization: "baa in haal mo'taghedam ke",
        translation: "それでも私は...と信じている",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "باید همه جوانب رو در نظر بگیریم",
        romanization: "baayad hame javaaneb ro dar nazar begirim",
        translation: "全ての側面を考慮すべきだ",
        clozeWord: "جوانب",
        praiseText: "عالی بود!",
      },
    ],
  },

  {
    id: "b2-news",
    title: "ニュースを討論",
    titlePersian: "بحث درباره اخبار",
    level: "B2",
    steps: [
      {
        type: "listen",
        phrase: "اخبار امروز رو دیدی؟",
        romanization: "akhbaare emruz ro didi?",
        translation: "今日のニュース見た？",
      },
      {
        type: "speak",
        phrase: "اخبار امروز رو دیدی؟",
        romanization: "akhbaare emruz ro didi?",
        translation: "今日のニュース見た？",
        praiseText: "آفرین!",
      },
      {
        type: "listen",
        phrase: "آره یه خبر جالب بود درباره",
        romanization: "aare ye khabare jaaleb bud darbaare",
        translation: "うん、...についての面白いニュースがあった",
      },
      {
        type: "speak",
        phrase: "آره یه خبر جالب بود درباره",
        romanization: "aare ye khabare jaaleb bud darbaare",
        translation: "うん、...についての面白いニュースがあった",
        praiseText: "عالی!",
      },
      {
        type: "listen",
        phrase: "فکر می‌کنم تأثیر زیادی داشته باشه",
        romanization: "fekr mikonam ta'sire ziaadi daashte baashe",
        translation: "大きな影響があると思う",
      },
      {
        type: "speak",
        phrase: "فکر می‌کنم تأثیر زیادی داشته باشه",
        romanization: "fekr mikonam ta'sire ziaadi daashte baashe",
        translation: "大きな影響があると思う",
        praiseText: "خیلی خوب!",
      },
      {
        type: "speak-cloze",
        phrase: "فکر می‌کنم تأثیر زیادی داشته باشه",
        romanization: "fekr mikonam ta'sire ziaadi daashte baashe",
        translation: "大きな影響があると思う",
        clozeWord: "تأثیر",
        praiseText: "عالی بود!",
      },
    ],
  },
];

// --- Helper Functions ---

export function getLessonsByLevel(level: CEFRLevel): Lesson[] {
  return GUIDED_LESSONS.filter((l) => l.level === level);
}

export function getLessonById(id: string): Lesson | undefined {
  return GUIDED_LESSONS.find((l) => l.id === id);
}

// --- Progress Management (localStorage) ---

const LESSON_PROGRESS_KEY = "guided-lesson-progress";

export interface LessonProgress {
  lessonId: string;
  completedSteps: number;
  completed: boolean;
  lastDate: string;
  phrasesLearned: number;
}

export function getLessonProgress(): Record<string, LessonProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LESSON_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLessonProgress(lessonId: string, completedSteps: number, totalSteps: number): void {
  const all = getLessonProgress();
  const speakSteps = GUIDED_LESSONS.find((l) => l.id === lessonId)
    ?.steps.filter((s) => s.type === "speak" || s.type === "speak-cloze").length ?? 0;

  all[lessonId] = {
    lessonId,
    completedSteps,
    completed: completedSteps >= totalSteps,
    lastDate: new Date().toISOString().split("T")[0],
    phrasesLearned: speakSteps,
  };
  localStorage.setItem(LESSON_PROGRESS_KEY, JSON.stringify(all));
}

export function getNextLesson(level: CEFRLevel): Lesson | undefined {
  const progress = getLessonProgress();
  const lessons = getLessonsByLevel(level);
  return lessons.find((l) => !progress[l.id]?.completed) ?? lessons[0];
}

export function getLevelLessonStats(level: CEFRLevel): { completed: number; total: number } {
  const progress = getLessonProgress();
  const lessons = getLessonsByLevel(level);
  const completed = lessons.filter((l) => progress[l.id]?.completed).length;
  return { completed, total: lessons.length };
}
