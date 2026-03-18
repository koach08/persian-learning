# Capacitor ネイティブアプリ ビルドガイド

## 前提条件

- **iOS**: Xcode + CocoaPods (`sudo gem install cocoapods`)
- **Android**: Android Studio + SDK

## 開発モード（ローカルdevサーバーに接続）

1. `capacitor.config.ts` の `server.url` をアンコメント：
```ts
server: {
  url: "http://192.168.11.12:3000",  // ← MacのローカルIP
  cleartext: true,
}
```

2. devサーバー起動：
```bash
npm run dev -- -H 0.0.0.0
```

3. Xcode/Android Studioで開く：
```bash
npm run cap:open:ios     # Xcodeが開く
npm run cap:open:android # Android Studioが開く
```

## プロダクションビルド

### 重要: APIルートについて
Next.jsのAPIルート（`/api/chat`, `/api/tts` 等）はサーバーサイドなので、
ネイティブアプリでは別途APIサーバーが必要：
- Vercelにデプロイして `server.url` をVercel URLに設定
- または `output: "export"` で静的ビルドし、APIをCloud Functionsに移す

### 手順
```bash
# 1. Vercelにデプロイ（APIサーバー）
npx vercel

# 2. capacitor.config.ts を本番URLに設定
#    server: { url: "https://your-app.vercel.app" }

# 3. Sync & Build
npm run cap:sync
npm run cap:open:ios
# Xcode で Archive → App Store Connect へ
```

## マイク権限（iOS）

`ios/App/App/Info.plist` に以下を追加：
```xml
<key>NSMicrophoneUsageDescription</key>
<string>ペルシア語の音声入力に使用します</string>
```
