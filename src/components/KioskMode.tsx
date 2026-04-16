import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Session, WorksheetEntry, AttendanceRecord } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Mic, MicOff, CheckCircle2, AlertCircle, User, Phone, ArrowLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type KioskStatus = 'idle' | 'searching' | 'found' | 'confirmed' | 'error';

export const KioskMode: React.FC = () => {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [digits, setDigits] = useState('');
  const [status, setStatus] = useState<KioskStatus>('idle');
  const [foundEntry, setFoundEntry] = useState<WorksheetEntry | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [isListening, setIsListening] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch active session
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('is_active', true)
        .limit(1);
      if (data && data.length > 0) setActiveSession(data[0] as Session);
      else setActiveSession(null);
    };
    fetchSession();

    const channel = supabase
      .channel('kiosk-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchSession();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch today's attendance for the active session
  useEffect(() => {
    if (!activeSession) return;

    const fetchAttendance = async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('created_at', { ascending: false });
      if (data) setTodayAttendance(data as AttendanceRecord[]);
    };
    fetchAttendance();

    const channel = supabase
      .channel('kiosk-attendance')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'attendance',
      }, () => {
        fetchAttendance();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeSession?.id]);

  // Auto-reset countdown
  useEffect(() => {
    if (status === 'confirmed') {
      setCountdown(5);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            resetState();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [status]);

  // Focus input on idle
  useEffect(() => {
    if (status === 'idle' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [status]);

  const resetState = useCallback(() => {
    setDigits('');
    setStatus('idle');
    setFoundEntry(null);
    setErrorMsg('');
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'zh-TW';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      // Extract digits from speech
      const chineseDigitMap: Record<string, string> = {
        '零': '0', '一': '1', '二': '2', '三': '3', '四': '4',
        '五': '5', '六': '6', '七': '7', '八': '8', '九': '9',
        '〇': '0', '兩': '2',
      };
      let extracted = '';
      for (const char of transcript) {
        if (/\d/.test(char)) extracted += char;
        else if (chineseDigitMap[char]) extracted += chineseDigitMap[char];
      }
      if (extracted.length >= 4) {
        setDigits(extracted.slice(-4));
      }
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, []);

  const toggleSpeech = () => {
    if (!recognitionRef.current) {
      toast.error('您的瀏覽器不支援語音識別。');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Auto-search when 4 digits entered
  useEffect(() => {
    if (digits.length === 4 && status === 'idle') {
      handleSearch();
    }
  }, [digits]);

  const handleSearch = async () => {
    if (digits.length !== 4) return;
    setStatus('searching');

    try {
      const { data, error } = await supabase
        .from('worksheet')
        .select('*')
        .eq('last_four_digits', digits)
        .limit(1);

      if (error || !data || data.length === 0) {
        setStatus('error');
        setErrorMsg('找不到此號碼的參與者。');
        setTimeout(resetState, 3000);
        return;
      }

      // Check if already checked in today for this session
      if (activeSession) {
        const { data: existing } = await supabase
          .from('attendance')
          .select('id')
          .eq('last_four_digits', digits)
          .eq('session_id', activeSession.id);

        if (existing && existing.length > 0) {
          setStatus('error');
          setErrorMsg('此號碼今日已報到。');
          setTimeout(resetState, 3000);
          return;
        }
      }

      setFoundEntry(data[0] as WorksheetEntry);
      setStatus('found');
    } catch {
      setStatus('error');
      setErrorMsg('查詢時發生錯誤。');
      setTimeout(resetState, 3000);
    }
  };

  const handleConfirm = async () => {
    if (!foundEntry || !activeSession) return;

    try {
      const { error } = await supabase.rpc('kiosk_checkin', {
        p_session_id: activeSession.id,
        p_last_four: foundEntry.last_four_digits,
        p_name: foundEntry.name,
      });

      if (error) throw error;
      setStatus('confirmed');
    } catch {
      setStatus('error');
      setErrorMsg('報到失敗，請重試。');
      setTimeout(resetState, 3000);
    }
  };

  const handleExit = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'public' } }));
  };

  // No active session
  if (!activeSession) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-6">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-3xl font-heading font-bold text-muted-foreground">目前沒有進行中的點名活動</h1>
        <p className="text-muted-foreground">請聯繫管理員啟用點名。</p>
        <Button variant="outline" onClick={handleExit}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回首頁
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/95">
        <div className="flex items-center gap-3">
          <Badge className="bg-green-500 animate-pulse">進行中</Badge>
          <span className="font-bold text-lg">{activeSession.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            已報到 {todayAttendance.length} 人
          </Badge>
          <Button variant="ghost" size="icon" onClick={handleExit}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content - Two Panes */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left Pane - Input */}
        <div className="flex flex-col items-center justify-center p-8 border-r bg-muted/20">
          <AnimatePresence mode="wait">
            {(status === 'idle' || status === 'searching') && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-md space-y-8 text-center"
              >
                <div className="space-y-2">
                  <Phone className="w-12 h-12 mx-auto text-primary" />
                  <h2 className="text-3xl font-heading font-bold">自助報到</h2>
                  <p className="text-muted-foreground">
                    請輸入您電話號碼的末 4 碼
                  </p>
                </div>

                <div className="relative">
                  <Input
                    ref={inputRef}
                    value={digits}
                    onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    maxLength={4}
                    className="text-center text-6xl tracking-[2rem] font-mono h-24 text-primary"
                    disabled={status === 'searching'}
                  />
                </div>

                <div className="flex justify-center gap-4">
                  {recognitionRef.current && (
                    <Button
                      variant={isListening ? 'destructive' : 'outline'}
                      size="lg"
                      onClick={toggleSpeech}
                      className="h-14 w-14 rounded-full p-0"
                    >
                      {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </Button>
                  )}
                </div>

                {status === 'searching' && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    搜尋中...
                  </div>
                )}

                {isListening && (
                  <div className="flex items-center justify-center gap-2 text-destructive">
                    <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    正在聆聽...
                  </div>
                )}
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center space-y-4"
              >
                <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
                <h2 className="text-2xl font-bold text-destructive">{errorMsg}</h2>
                <p className="text-muted-foreground">3 秒後自動重置...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Pane - Confirmation / Attendance Log */}
        <div className="flex flex-col items-center justify-center p-8 bg-background">
          <AnimatePresence mode="wait">
            {status === 'found' && foundEntry && (
              <motion.div
                key="found"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-md space-y-8 text-center"
              >
                <div className="space-y-4">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <User className="w-12 h-12 text-primary" />
                  </div>
                  <h2 className="text-4xl font-heading font-bold">{foundEntry.name}</h2>
                  {foundEntry.department && (
                    <Badge variant="secondary" className="text-base px-4 py-1">
                      {foundEntry.department}
                    </Badge>
                  )}
                  <p className="text-muted-foreground font-mono text-lg">
                    末 4 碼：{foundEntry.last_four_digits}
                  </p>
                </div>

                <div className="flex gap-4 justify-center">
                  <Button size="lg" className="h-14 px-8 text-lg" onClick={handleConfirm}>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    確認出席
                  </Button>
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg" onClick={resetState}>
                    取消
                  </Button>
                </div>
              </motion.div>
            )}

            {status === 'confirmed' && (
              <motion.div
                key="confirmed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center space-y-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <CheckCircle2 className="w-24 h-24 mx-auto text-green-500" />
                </motion.div>
                <h2 className="text-4xl font-heading font-bold text-green-600">已確認！</h2>
                <p className="text-xl text-muted-foreground">
                  {foundEntry?.name}，您的出席已記錄。
                </p>
                {/* Countdown bar */}
                <div className="w-full max-w-xs mx-auto space-y-2">
                  <p className="text-sm text-muted-foreground">{countdown} 秒後自動重置</p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-green-500 rounded-full"
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 5, ease: 'linear' }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {(status === 'idle' || status === 'searching' || status === 'error') && (
              <motion.div
                key="log"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-md"
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span>即時出席記錄</span>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        已確認 {todayAttendance.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {todayAttendance.length > 0 ? todayAttendance.slice(0, 20).map((record, index) => (
                        <motion.div
                          key={record.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{record.user_name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {format(new Date(record.created_at), 'HH:mm:ss')}
                          </span>
                        </motion.div>
                      )) : (
                        <p className="text-center text-muted-foreground text-sm py-8">
                          等待報到中...
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
