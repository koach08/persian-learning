import Link from "next/link";

const modules = [
  {
    href: "/flashcard",
    title: "フラッシュカード",
    subtitle: "単語を覚えよう",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    color: "bg-emerald-500",
  },
  {
    href: "/conjugation",
    title: "動詞活用ドリル",
    subtitle: "活用をマスター",
    icon: "M4 6h16M4 10h16M4 14h16M4 18h16",
    color: "bg-blue-500",
  },
  {
    href: "/conversation",
    title: "AIフリートーク",
    subtitle: "会話を練習",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    color: "bg-purple-500",
  },
  {
    href: "/pronunciation",
    title: "発音評価",
    subtitle: "発音をチェック",
    icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z",
    color: "bg-orange-500",
  },
];

export default function Home() {
  return (
    <div className="px-4 pt-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          <span className="persian-text text-4xl text-emerald-600">فارسی</span>
        </h1>
        <p className="text-lg text-gray-600">ペルシア語学習</p>
        <p className="text-sm text-gray-400 mt-1">Farsi Learning App</p>
      </div>

      <div className="grid gap-4">
        {modules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
          >
            <div
              className={`${mod.color} w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0`}
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={mod.icon} />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{mod.title}</h2>
              <p className="text-sm text-gray-500">{mod.subtitle}</p>
            </div>
            <svg
              className="w-5 h-5 text-gray-400 ml-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
