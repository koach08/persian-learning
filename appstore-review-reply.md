# App Review Reply — Persian Learning

以下をApp Store Connectの「メモ」欄に貼り付けてください。

---

## 2. App Purpose

Persian Learning is a language learning app for Japanese speakers who want to learn Persian (Farsi). It provides structured lessons from beginner (CEFR A1) to advanced (C2), vocabulary flashcards with spaced repetition, pronunciation practice with audio scoring, and AI-powered conversation practice.

The app solves a specific problem: there are very few Persian language learning resources available in Japanese, and no major language app (Duolingo, Busuu, etc.) offers Persian courses for Japanese speakers. This app fills that gap with 4,626 vocabulary words, 100+ guided lessons, and pronunciation assessment.

## 3. Instructions for Accessing Main Features

No account or login is required. The app is fully functional immediately after launch.

Main features and how to access them:
- **Home Screen**: Shows daily study flow, CEFR level selector (A1-C2), and skill grid
- **Guided Lessons**: Tap "学習" tab → Select a lesson → Listen, repeat, and practice through steps
- **Vocabulary / SRS Flashcards**: Tap "単語" tab → Review flashcards with spaced repetition
- **AI Conversation**: Tap "会話" tab → Select a scenario → Chat with AI partner in Persian
- **Pronunciation Practice**: Tap "発音" tab → Record your voice → Receive word-by-word scoring
- **Exercises**: Available within lessons — listening quiz, dictation, cloze fill-in, sentence reordering
- **Microphone**: The app requests microphone access for pronunciation recording. Users can decline and still use all other features.

There are no paid features, subscriptions, or in-app purchases. The app is completely free.

## 4. External Services

The app uses the following external services:

- **OpenAI API (GPT-4o)**: Used for AI conversation practice (generating AI partner responses), pronunciation assessment (audio analysis), and reading comprehension passage generation. Audio recordings are sent to the server-side API for processing and are not stored after assessment.
- **Azure Cognitive Services (Speech)**: Used for text-to-speech (TTS) to generate native Persian audio playback. No user data is sent to Azure.
- **Vercel**: Hosts the server-side API routes that proxy requests to OpenAI and Azure. The app connects to the deployed backend at persian-learning.vercel.app.

No user data is collected, stored, or shared with any third party. All learning progress (vocabulary, SRS data, lesson completion, XP, streak) is stored locally on the device using localStorage.

## 5. Regional Differences

The app functions consistently across all regions. There are no regional differences in features or content. The UI language is Japanese. The learning content (Persian vocabulary, lessons, conversations) is the same worldwide.

## 6. Regulated Industry

This app does not operate in a regulated industry. It is a language learning tool and does not require any special authorization or credentials.
