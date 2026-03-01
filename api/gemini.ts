import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { action, payload } = req.body;

    if (action === 'transcribe') {
      const { base64Data, mimeType, glossaryText } = payload;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: `請將這段語音轉錄為繁體中文逐字稿。
要求：
1. 盡可能保留所有細節，包含語氣詞。
2. 加上時間標記 (Timestamps)，格式為 [MM:SS] 或 [HH:MM:SS]，每隔一段對話或段落標記一次。
3. 根據語意適當分段。
${glossaryText ? `\n4. 請特別注意以下專有名詞，確保辨識正確（可能包含人名、技術名詞、地名等）：\n${glossaryText}` : ''}
`,
            },
          ],
        },
      });
      return res.status(200).json({ text: response.text });
    }

    if (action === 'clean') {
      const { transcript, glossaryText } = payload;
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `以下是一段語音轉錄的逐字稿。請幫我進行「清稿」（Cleanup）。
要求：
1. 去除冗言贅字（如：嗯、啊、那個、就是說等）。
2. 修正語法錯誤，使句子通順。
3. 保持原本的語意和說話者的風格。
4. 重新排版，加上適當的標點符號和分段。
5. 保留原本的時間標記 (Timestamps)。
${glossaryText ? `\n6. 請特別注意以下專有名詞，確保辨識正確（可能包含人名、技術名詞、地名等）：\n${glossaryText}` : ''}

原始逐字稿：
${transcript}
`,
      });
      return res.status(200).json({ text: response.text });
    }

    if (action === 'summarize') {
      const { cleanedText, customPrompt } = payload;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `以下是一段經過清稿的會議記錄/訪談逐字稿。請根據以下要求進行內容產出。
要求格式與風格：
${customPrompt}

清稿內容：
${cleanedText}
`,
      });
      return res.status(200).json({ text: response.text });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
