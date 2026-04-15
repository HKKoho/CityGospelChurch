import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.SERVER_PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set. Gemini endpoints will return 503.');
}

app.post('/api/gemini/guidance', async (_req, res) => {
  if (!GEMINI_API_KEY) {
    res.status(503).json({ error: 'Gemini API is not configured.' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
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
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
