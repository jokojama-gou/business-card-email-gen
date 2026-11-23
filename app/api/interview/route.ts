import { NextRequest, NextResponse } from "next/server";

interface InterviewExtractResponse {
  company: string;
  interviewerName: string;
  email: string;
  subject: string;
  body: string;
}

export async function POST(req: NextRequest) {
  try {
    const { calendarText, emailInput = "", memo = "" } = await req.json();

    if (!calendarText && !emailInput) {
      return NextResponse.json(
        { error: "カレンダーまたはメールの本文、あるいは宛先メールアドレスを入力してください。" },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (!geminiKey && !openrouterKey) {
      return NextResponse.json(
        { error: "APIキー (GEMINI_API_KEY または OPENROUTER_API_KEY) が設定されていません。" },
        { status: 500 }
      );
    }

    const prompt = `あなたは就活生（慶應義塾大学・横山 豪）の専属アシスタントです。
面接・面談の案内メールやGoogleカレンダーの詳細テキストを解析し、相手情報（会社名・面接官名・メールアドレス）を抽出し、
「簡潔で自然な短文のビジネスお礼メール」を作成してください。

【入力テキスト】:
${calendarText || "(なし)"}

【手動指定された宛先メアド（もしあれば）】:
${emailInput || "(未指定)"}

【面接後の一言メモ（もしあれば）】:
${memo || "(特になし)"}

【抽出＆生成ルール】:
1. 会社名 (company):
   - 正式な会社名（例: 株式会社サンプルテクノロジー、〇〇グループ 等）を抽出してください。
2. 担当者名・面接官名 (interviewerName):
   - 本文中に「担当：佐藤」や「佐藤 健一」などの面接官・リクルーター名があれば「佐藤 様」のように姓＋「様」を抽出。
   - 特定の個人名が見当たらない場合は「採用ご担当者 様」としてください。
3. メールアドレス (email):
   - 手動指定があればそれを最優先で使用。
   - なければ本文中から問い合わせ先・返信先メールアドレス（例: recruit@..., hr@...）を探してください。
   - ※注意: "no-reply" や "noreply" を含むシステム自動送信アドレスは返信不可のため絶対に除外してください。見つからなければ空文字 "" にしてください。
4. 件名 (subject):
   - 余計な煽り文句やAI風の装飾を排除した、端的なビジネス件名。
   - 基本フォーマット: "本日の面接のお礼（慶應義塾大学・横山 豪）" または "本日の面談のお礼（慶應義塾大学・横山 豪）"
5. 本文 (body):
   - 3〜5行程度の、簡潔で読みやすい短文。
   - 長文や大げさな表現（「感銘を受けました」「感無量」等）は厳禁。
   - 構成例:
     {company}
     {interviewerName}

     本日お時間をいただきました、慶應義塾大学の横山です。

     本日はご多忙のところ、面談の機会をいただき誠にありがとうございました。
     ${memo ? `${memo}についてもお話しでき、大変有意義な時間となりました。` : "お話しさせていただき、大変有意義な時間となりました。"}

     まずは取り急ぎ、面談のお礼を申し上げたくご連絡いたしました。
     引き続き何卒よろしくお願い申し上げます。

     --------------------------------------------------
     横山 豪 (Go Yokoyama)
     慶應義塾大学
     --------------------------------------------------

【出力フォーマット】:
必ず以下のキーを持つJSONオブジェクトのみを出力してください（Markdownのコードブロック \`\`\`json も可）。
{
  "company": "会社名",
  "interviewerName": "担当者名（様付き）",
  "email": "抽出したメールアドレス（または空文字）",
  "subject": "件名",
  "body": "本文"
}`;

    let responseText = "";

    // 1. まず Gemini API (無料枠) を試行
    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      } catch (err) {
        console.warn("Gemini direct API failed, falling back to OpenRouter:", err);
      }
    }

    // 2. Gemini が使えない/失敗した場合は OpenRouter へフォールバック
    if (!responseText && openrouterKey) {
      const openrouterModel = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
      const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openrouterKey}`,
        },
        body: JSON.stringify({
          model: openrouterModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
      });

      if (!openrouterRes.ok) {
        const errText = await openrouterRes.text();
        return NextResponse.json(
          { error: `LLM API Error: ${errText}` },
          { status: 500 }
        );
      }

      const openrouterData = await openrouterRes.json();
      responseText = openrouterData.choices?.[0]?.message?.content || "";
    }

    if (!responseText) {
      return NextResponse.json(
        { error: "メール文面の生成に失敗しました。" },
        { status: 500 }
      );
    }

    // Clean JSON response (strip markdown fences if present)
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed: InterviewExtractResponse = JSON.parse(cleanJson);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Interview email generation error:", error);
    return NextResponse.json(
      { error: error.message || "予期せぬエラーが発生しました。" },
      { status: 500 }
    );
  }
}
