# Business Card & Meeting Follow-up Email Generator (PWA)

名刺の撮影画像やカレンダーの予定テキストから、相手先情報（会社名・氏名・メールアドレス）を抽出し、検索性の高い件名と簡潔なフォローアップメール文面を生成するモバイル対応 Web アプリケーション（PWA）です。

## 主な機能

1. **名刺画像からの挨拶メール作成 (`/`)**
   - スマートフォンのカメラ撮影（`capture="environment"`）またはアルバム選択に対応
   - クライアント側の HTML5 Canvas で画像を最大幅 `1280px` / JPEG 品質 `0.8` に自動圧縮してから送信し、モバイル回線での通信量を削減
   - 備忘録メモ（イベント名や話題）と名刺画像を Vision LLM で解析し、後からメール検索しやすい具体的な件名と本文を JSON 形式で構造化抽出
2. **面談・ミーティングのお礼メール作成 (`/mendan`)**
   - カレンダーの予定詳細や案内メール本文から、会社名・担当者名・返信先メールアドレス（`no-reply` 自動除外）を抽出
   - Gemini API 直結呼び出しと OpenRouter API への自動フォールバック構成
3. **ワンタップ送信連携**
   - 生成結果のインライン編集、`mailto:` スキームによるメーラー直接起動、クリップボードへの一括コピー

## 技術スタック

- **Framework**: Next.js 14 (App Router) / React 18 / TypeScript
- **AI / Vision**: Google Gemini (`gemini-2.0-flash` / `gemini-2.5-flash`) & OpenRouter API
- **Frontend / PWA**: HTML5 Canvas API (クライアント画像圧縮), Web App Manifest (`manifest.json`), Bulma CSS
- **Deployment**: Vercel

## セットアップ

```bash
git clone https://github.com/jokojama-gou/business-card-email-gen.git
cd business-card-email-gen
npm install
cp .env.example .env.local
```

`.env.local` に `OPENROUTER_API_KEY`（または `GEMINI_API_KEY`）を設定して起動します。

```bash
npm run dev
```

---

## Author

横山 豪 (Go Yokoyama) / 慶應義塾大学 SFC / [@jokojama-gou](https://github.com/jokojama-gou)
