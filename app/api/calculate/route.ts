import OpenAI from "openai";
import { NextResponse } from "next/server";
import { calculateFromExtractedData } from "@/lib/formula";
import type { ExtractedData } from "@/lib/types";

export const runtime = "nodejs";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    const form = await req.formData();
    const image = form.get("image");

    if (!(image instanceof File)) {
        return NextResponse.json(
            { ok: false, error: "没有收到图片" },
            { status: 400 },
        );
    }

    const arrayBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = image.type || "image/jpeg";

    const prompt = `
你是一个数据提取工具。

任务：从图片中提取手写的中文标签和数字，并输出严格 JSON。

⚠️ 必须遵守：
- 只输出 JSON
- 不要 markdown
- 不要解释
- 不要多余字段
- 识别不确定的内容用 null
- 所有数字必须转成 number
- 按图片从上到下顺序输出
- 划掉/覆盖的内容忽略（以未划掉的为准）
- 摄氏度符号 °C 不要放进 number
- 中文标签必须保留。
- 如果图片里没有某个标签，不要补。
- 不要猜测图片里不存在的数据。

------------------------

支持的标签：
鸭、猪、尖（注意：脚 = 尖）、牛、鸡、辣

------------------------

⚠️ 重要规则：

1️⃣ 两种数据格式：

【格式 A（尖 / 牛）】
品类 原液重量 混合液重量 盐度计读数

例如：
尖 54.6 344.7 0.38
牛 43.8 236.1 0.35

对应：
originalWeight = 原液重量
mixedWeight = 混合液重量
meterReading = 盐度计读数

---

【格式 B（其他品类）】
品类 盐度计读数

例如：
鸭 3.53
猪 2.41
鸡 3.26

对应：
originalWeight = null
mixedWeight = null
meterReading = 数值

---

2️⃣ 品类标准化：
- “脚” → 统一输出为 "尖"

---

输出格式必须是：

{
  "items": [
    {
      "label": "尖",
      "originalWeight": 54.6,
      "mixedWeight": 344.7,
      "meterReading": 0.38,
      "raw": "尖 54.6 344.7 0.38"
    },
    {
      "label": "鸭",
      "originalWeight": null,
      "mixedWeight": null,
      "meterReading": 3.53,
      "raw": "鸭 3.53"
    }
  ]
}
`.trim();

    const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
            {
                role: "user",
                content: [
                    {
                        type: "input_text",
                        text: prompt,
                    },
                    {
                        type: "input_image",
                        detail: "auto",
                        image_url: `data:${mimeType};base64,${base64}`,
                    },
                ],
            },
        ],
    });

    console.log(response.output_text);
    const text = response.output_text;

    try {
        const parsed = JSON.parse(text);
        const calculation = calculateFromExtractedData(parsed as ExtractedData);

        return NextResponse.json({
            ok: true,
            data: parsed,
            calculation,
        });
    } catch {
        return NextResponse.json({
            ok: false,
            error: "模型返回的不是合法 JSON",
            raw: text,
        });
    }
}
