import { NextRequest, NextResponse } from "next/server";

// OpenRouter上の有効なモデルIDを定義
const DEFAULT_MODEL = "google/gemini-2.5-flash";

export async function POST(req: NextRequest) {
  try {
    // 1. Check OpenRouter API Key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "サーバー側で OPENROUTER_API_KEY が設定されていません。" },
        { status: 500 }
      );
    }

    // 2. Parse Body
    const body = await req.json();
    const { imageBase64, memo = "" } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "名刺画像データが添付されていません。" },
        { status: 400 }
      );
    }

    // Format Data URL for OpenRouter Vision API
    const imageUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    // 使用するモデルの判定（環境変数 OPENROUTER_MODEL 優先、指定がなければ DEFAULT_MODEL）
    const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

    const systemPrompt = `あなたは優秀なビジネスアシスタントです。名刺画像と備忘録メモから、相手情報（会社名・氏名・メールアドレス）を抽出し、後からの検索性に優れ・かつ丁寧なビジネス御礼挨拶メールの件名と本文を自動作成してください。

【厳格な生成ルール】:
1. 件名ルール（後からメール検索で連絡先を探すためのルール）:
   - メモに含まれる「固有のイベント名」「主催企業・場所名」「具体の話題」などのユニークな情報を必ず件名に具体的に含めてください。
     × 単なる「LT会」「展示会」など抽象的な名前は避けて
     ○ 「燈社LT会」「Keio Tech Expo」「クラウド移行のご相談」など具体的キーワードを入れる
   - 件名フォーマット例: 「【燈社LT会】ご挨拶（横山）」や「【展示会・クラウド移行相談】お礼のご挨拶（横山）」
   - 「（株式会社〇〇 差出人）」などのダミー・仮表記文字列は絶対に含めないでください。

2. 本文のトーンと表現:
   - 「感銘を受けました」「感無量」などの過剰・大げさな表現は避け、短い交流会でお話しした程度にふさわしい、自然・スマートで当たり障りのない丁寧なビジネス文面にしてください。
   - 備忘録メモにある具体的な内容（会場名、話題、約束）を1〜2文程度で自然に本文へ反映させてください。

3. 署名:
   - 本文の末尾には必ず「横山 豪」の署名を入れてください。

返却データは必ず以下のJSON構造のみを含む有効なJSONオブジェクトとして出力してください。

JSONキーの説明:
- "company": 抽出された会社名
- "name": 抽出された氏名
- "email": 抽出されたメールアドレス（不明な場合は空文字 ""）
- "subject": 生成されたメール件名
- "body": 生成されたメール本文

フォーマット例:
{
  "company": "株式会社サンプルテクノロジー",
  "name": "佐藤 健一",
  "email": "contact@example.com",
  "subject": "【燈社 フィジカルAIロボットLT会】ご挨拶（横山）",
  "body": "株式会社サンプルテクノロジー\\n佐藤様\\n\\n大変お世話になっております。横山です。\\n\\n先日は燈社でのフィジカルAIロボットLT会にてお話しさせていただき、誠にありがとうございました。\\n短い時間ではございましたが、直接ご挨拶とお話しができて嬉しく思っております。\\n\\nまた機会がございましたら、情報交換などさせていただけますと幸いです。\\n今後とも何卒よろしくお願い申し上げます。\\n\\n--\\n横山 豪"
}`;

    const userPrompt = `【備忘録メモ】:\n${memo ? memo : "（メモなし）"}`;

    // 3. Call OpenRouter API
    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://localhost:3000",
          "X-Title": "Business Card Email Generator",
        },
        body: JSON.stringify({
          model: model,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
                {
                  type: "text",
                  text: userPrompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error("OpenRouter API Error Response:", errorText);
      return NextResponse.json(
        {
          error: `OpenRouter API エラー (${openRouterResponse.status}): ${errorText}`,
        },
        { status: openRouterResponse.status }
      );
    }

    const openRouterData = await openRouterResponse.json();
    const rawContent = openRouterData?.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json(
        { error: "AIからの応答本文が空でした。" },
        { status: 500 }
      );
    }

    // Strip markdown json codeblock wrappers if present
    const cleanedContent = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsedResult = JSON.parse(cleanedContent);

    return NextResponse.json({
      company: parsedResult.company || "",
      name: parsedResult.name || "",
      email: parsedResult.email || "",
      subject: parsedResult.subject || "",
      body: parsedResult.body || "",
    });
  } catch (error: any) {
    console.error("Generate API Error:", error);
    return NextResponse.json(
      {
        error:
          error?.message || "メール生成処理中にエラーが発生いたしました。",
      },
      { status: 500 }
    );
  }
}
