import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'Gemini API is not configured.' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents:
        'Provide 3 contemporary tips for improving church community engagement using digital platforms. Focus on room booking efficiency and roll call accuracy.',
      config: {
        systemInstruction:
          'You are a digital transformation consultant for community organizations. Provide concise, actionable advice in markdown format.',
      },
    });

    res.json({ text: response.text || 'No guidance generated.' });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to generate guidance.' });
  }
}
