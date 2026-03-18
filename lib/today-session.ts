// Today's study session builder — assembles an optimal learning flow

import { getAllCards, isDue, type SRSCard } from "./srs";
import { getNextLesson, getLessonById, type Lesson } from "./guided-lessons";
import { getCEFRProgress } from "./level-manager";
import type { CEFRLevel } from "./level-manager";
import { getScenariosByLevel, type ScenarioMeta } from "./conversation-practice";

export interface TodaySession {
  level: CEFRLevel;
  // SRS phase
  srsCards: SRSCard[];
  // Lesson phase
  lesson: Lesson | null;
  // Conversation phase — simplified: phrases from a scenario to practice
  conversationPhrases: { persian: string; romanization: string; japanese: string }[];
  scenarioTitle: string;
  // Totals
  totalSubSteps: number;
}

export function buildTodaySession(): TodaySession {
  const progress = getCEFRProgress();
  const level = progress.currentLevel;

  // 1. SRS cards due (max 10)
  const allCards = getAllCards();
  const dueCards = Object.values(allCards).filter(isDue).slice(0, 10);

  // 2. Next lesson
  const lesson = getNextLesson(level) ?? null;

  // 3. Conversation phrases — pick a random scenario and extract user turns (max 5 phrases)
  const scenarios = getScenariosByLevel(level);
  let conversationPhrases: { persian: string; romanization: string; japanese: string }[] = [];
  let scenarioTitle = "";

  if (scenarios.length > 0) {
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    scenarioTitle = randomScenario.title;
    // We'll generate simple phrases from the scenario vocabulary
    // (the actual dialogue requires API call, so we use a lightweight approach)
    conversationPhrases = getQuickPhrases(level);
  }

  // Calculate total sub-steps
  const srsSubSteps = dueCards.length;
  const lessonSubSteps = lesson ? lesson.steps.length : 0;
  const convSubSteps = conversationPhrases.length;
  const totalSubSteps = srsSubSteps + lessonSubSteps + convSubSteps;

  return {
    level,
    srsCards: dueCards,
    lesson,
    conversationPhrases,
    scenarioTitle,
    totalSubSteps,
  };
}

/** Quick conversation phrases by level (no API needed) */
function getQuickPhrases(level: CEFRLevel): { persian: string; romanization: string; japanese: string }[] {
  const phrases: Record<CEFRLevel, { persian: string; romanization: string; japanese: string }[]> = {
    A1: [
      { persian: "سلام حالت چطوره؟", romanization: "salaam haalet chetore?", japanese: "こんにちは、元気？" },
      { persian: "ممنون خوبم", romanization: "mersi khoobam", japanese: "ありがとう、元気だよ" },
      { persian: "اسمت چیه؟", romanization: "esmet chie?", japanese: "名前は何？" },
      { persian: "خداحافظ", romanization: "khodaahafez", japanese: "さようなら" },
      { persian: "لطفاً", romanization: "lotfan", japanese: "お願いします" },
    ],
    A2: [
      { persian: "ببخشید یه سوال دارم", romanization: "bebakhshid ye so'aal daaram", japanese: "すみません、質問があります" },
      { persian: "می‌تونم کمکتون کنم؟", romanization: "mitoonam komaketuun konam?", japanese: "お手伝いできますか？" },
      { persian: "چقدر می‌شه؟", romanization: "cheqadr mishe?", japanese: "いくらですか？" },
      { persian: "کجا می‌ری؟", romanization: "kojaa miri?", japanese: "どこに行くの？" },
      { persian: "فردا وقت داری؟", romanization: "fardaa vaght daari?", japanese: "明日時間ある？" },
    ],
    B1: [
      { persian: "به نظرم این ایده خوبیه", romanization: "be nazaram in ide khoobiye", japanese: "いいアイデアだと思う" },
      { persian: "موافقم ولی یه مشکلی هست", romanization: "movaafegham vali ye moshkeli hast", japanese: "賛成だけど問題がある" },
      { persian: "می‌خوام درباره‌ش صحبت کنیم", romanization: "mikhaam darbaaresh sohbat konim", japanese: "それについて話したい" },
      { persian: "تجربه‌ت تو این زمینه چیه؟", romanization: "tajrobat tu in zamine chie?", japanese: "この分野の経験は？" },
      { persian: "باید بیشتر فکر کنم", romanization: "baayad bishtar fekr konam", japanese: "もっと考えないと" },
    ],
    B2: [
      { persian: "از دیدگاه من این موضوع پیچیده‌ست", romanization: "az didgaahe man in mowzu pichidast", japanese: "私の見方ではこの問題は複雑だ" },
      { persian: "باید جوانب مختلف رو بررسی کنیم", romanization: "baayad javaanebe mokhtalef ro barresi konim", japanese: "様々な側面を検討すべきだ" },
      { persian: "تحقیقات نشون می‌ده که", romanization: "tahghighaat neshun mide ke", japanese: "研究によると" },
      { persian: "نتیجه‌گیری من اینه که", romanization: "natijegiri man ine ke", japanese: "私の結論は" },
      { persian: "این مسئله نیاز به بحث بیشتری داره", romanization: "in mas'ale niaaz be bahse bishtari daare", japanese: "この問題はもっと議論が必要だ" },
    ],
    C1: [
      { persian: "با توجه به شرایط فعلی باید استراتژی‌مون رو تغییر بدیم", romanization: "baa tavajoh be sharaayete fe'li baayad estratezhimun ro taghyir bedim", japanese: "現状を踏まえて戦略を変えるべきだ" },
      { persian: "این تحلیل نشون‌دهنده یه روند نگران‌کننده‌ست", romanization: "in tahlil neshundahandeye ye ravande negarankonandast", japanese: "この分析は懸念すべきトレンドを示している" },
      { persian: "از منظر تاریخی این پدیده بی‌سابقه نیست", romanization: "az manzare tarikhi in padide bisaabeghe nist", japanese: "歴史的に見ればこの現象は前例がないわけではない" },
      { persian: "پیامدهای بلندمدت این تصمیم رو باید در نظر بگیریم", romanization: "payaamadhaaye bolandmodat in tasmim ro baayad dar nazar begirim", japanese: "この決定の長期的影響を考慮すべきだ" },
      { persian: "بین این دو رویکرد تضاد اساسی وجود داره", romanization: "beyne in do ruykard tazaade asaasi vojud daare", japanese: "この二つのアプローチには根本的な矛盾がある" },
    ],
    C2: [
      { persian: "ماهیت این مسئله فراتر از یه بحث صرفاً نظری‌ست", romanization: "maahiyate in mas'ale faraatar az ye bahse serfan nazarist", japanese: "この問題の本質は純粋に理論的な議論を超えている" },
      { persian: "در بطن این تحول اجتماعی عوامل متعددی نهفته", romanization: "dar batne in tahavvole ejtemaa'i avaamele mota'addedi nahoftast", japanese: "この社会変革の根底には複数の要因が潜んでいる" },
      { persian: "تجربه زیسته مردم با روایت رسمی همخوانی نداره", romanization: "tajrobeye zistaye mardom baa revaayate rasmi hamkhaani nadaare", japanese: "人々の生きた経験は公式の語りと一致しない" },
      { persian: "باید از کلیشه‌های رایج فاصله بگیریم و عمیق‌تر بررسی کنیم", romanization: "baayad az kelishehaye raayej faasele begirim o amightar barresi konim", japanese: "ありがちなステレオタイプから離れて、より深く分析すべきだ" },
      { persian: "تقلیل‌گرایی در تحلیل این پدیده خطرناکه", romanization: "taghligaraayi dar tahlile in padide khatarnaake", japanese: "この現象を単純化して分析するのは危険だ" },
    ],
  };
  return phrases[level] || phrases.A1;
}
