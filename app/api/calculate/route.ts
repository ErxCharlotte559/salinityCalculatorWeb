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

------------------------

支持的标签：
鸭、猪、脚、牛、鸡、辣

------------------------

行类型一：普通盐度/温度数据

可能格式：
标签 盐度 : 温度
标签 盐度, 温度
标签 盐度，温度
标签 盐度 温度
标签 盐度, 温度°C

例子：
鸭 3.50, 19.7°C
猪 2.60, 20.4°C
鸡 3.44 : 20.3

含义：
- 第一个数字 = 盐度
- 第二个数字 = 温度

输出：
{
  "label": "鸭",
  "values": [3.5, 19.7],
  "raw": "鸭 3.50, 19.7°C"
}

------------------------

行类型二：称重换算数据，仅用于 脚 / 牛

格式两行：

第一行：
容器重量 (总重量) 盐度

第二行：
容器重量 (总重量) 温度

含义：
- time = 容器重量
- bracket = 总重量
- value = 第一行是盐度，第二行是温度

输出：
{
  "label": "脚",
  "rows": [
    {
      "time": 12,
      "bracket": 215,
      "value": 0.46,
      "raw": "12 (215) 0.46"
    },
    {
      "time": 3,
      "bracket": 47,
      "value": 19.8,
      "raw": "3 (47) 19.8"
    }
  ],
  "raw": "脚 12 (215) 0.46 3 (47) 19.8"
}

------------------------

提取要求：

1. 按图片从上到下顺序输出。
2. 中文标签必须保留。
3. 普通数据只放 values，不要放 rows。
4. 称重数据才放 rows。
5. 摄氏度符号 °C 不要放进 number。
6. 如果图片里没有某个标签，不要补。
7. 不要猜测图片里不存在的数据。

------------------------

输出格式必须是：

{
  "items": [
    {
      "label": string | null,
      "values": number[],
      "raw": string
    }
  ]
}

或者：

{
  "items": [
    {
      "label": string | null,
      "rows": [
        {
          "time": number | null,
          "bracket": number | null,
          "value": number | null,
          "raw": string
        }
      ],
      "raw": string
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
                        image_url: `data:${mimeType};base64,${base64}`,
                    },
                ],
            },
        ],
    } as any);

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
