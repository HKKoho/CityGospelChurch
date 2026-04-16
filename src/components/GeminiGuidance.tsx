import React, { useState } from 'react';
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
      const res = await fetch('/api/gemini/guidance', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGuidance(data.text);
    } catch (error) {
      console.error("Gemini error:", error);
      setGuidance("無法產生建議，請稍後再試。");
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
              教會 AI 聖經資料查詢助理
            </CardTitle>
            <CardDescription>輸入問題，取得 AI 驅動的聖經資料回應。</CardDescription>
          </div>
          <Button onClick={generateGuidance} disabled={loading} size="sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "查詢"}
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
              點擊按鈕以產生 AI 驅動的回應。
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
