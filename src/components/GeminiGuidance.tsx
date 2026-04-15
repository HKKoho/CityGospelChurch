import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

export const GeminiGuidance: React.FC = () => {
  const [guidance, setGuidance] = useState('');
  const [loading, setLoading] = useState(false);

  const generateGuidance = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Provide 3 contemporary tips for improving church community engagement using digital platforms. Focus on room booking efficiency and roll call accuracy.",
        config: {
          systemInstruction: "You are a digital transformation consultant for community organizations. Provide concise, actionable advice in markdown format.",
        },
      });
      setGuidance(response.text || 'No guidance generated.');
    } catch (error) {
      console.error("Gemini error:", error);
      setGuidance("Failed to generate guidance. Please check your API key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="bg-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Platform Insights
            </CardTitle>
            <CardDescription>Get contemporary guidance on platform management.</CardDescription>
          </div>
          <Button onClick={generateGuidance} disabled={loading} size="sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Tips"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <AnimatePresence mode="wait">
          {guidance ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="prose prose-sm dark:prose-invert max-w-none"
            >
              <ReactMarkdown>{guidance}</ReactMarkdown>
            </motion.div>
          ) : (
            <div className="text-center py-8 text-muted-foreground italic">
              Click the button to generate AI-powered insights for your community.
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
