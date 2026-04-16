/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, CheckCircle2, AlertCircle, User, Phone, ArrowRight } from "lucide-react";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, onSnapshot } from "firebase/firestore";
import { Participant, ActivitySession, AttendanceRecord } from "../types";
import { cn } from "../lib/utils";

interface KioskModeProps {
  activeSession: ActivitySession;
}

export default function KioskMode({ activeSession }: KioskModeProps) {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [foundParticipant, setFoundParticipant] = useState<Participant | null>(null);
  const [status, setStatus] = useState<"idle" | "searching" | "confirming" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Speech Recognition Setup
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const digits = transcript.replace(/\D/g, "").slice(-4);
      if (digits.length === 4) {
        setInput(digits);
        handleSearch(digits);
      }
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      recognition?.start();
      setIsListening(true);
    }
  };

  const handleSearch = async (val: string) => {
    if (val.length !== 4) return;
    
    setStatus("searching");
    try {
      const q = query(collection(db, "participants"), where("mobileLast4", "==", val));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setStatus("error");
        setErrorMsg("No participant found with these digits.");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        const p = querySnapshot.docs[0].data() as Participant;
        p.id = querySnapshot.docs[0].id;
        setFoundParticipant(p);
        setStatus("confirming");
        startCountdown();
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Database error. Please try again.");
    }
  };

  const startCountdown = () => {
    setCountdown(5);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          resetKiosk();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetKiosk = () => {
    setInput("");
    setFoundParticipant(null);
    setStatus("idle");
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleConfirm = async () => {
    if (!foundParticipant || !activeSession) return;
    
    try {
      const record: Omit<AttendanceRecord, "id"> = {
        sessionId: activeSession.id,
        participantId: foundParticipant.id,
        participantName: foundParticipant.name,
        confirmedAt: Date.now(),
        date: activeSession.date
      };
      
      await addDoc(collection(db, `sessions/${activeSession.id}/attendance`), record);
      setStatus("success");
      setTimeout(resetKiosk, 2000);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Failed to confirm attendance.");
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[calc(100vh-120px)]">
      {/* Window 1: Input */}
      <motion.div 
        layout
        className="bg-white rounded-[32px] p-10 shadow-sm border border-black/5 flex flex-col justify-center items-center text-center"
      >
        <div className="w-16 h-16 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center mb-6">
          <Phone className="text-[#5A5A40] w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif font-medium text-[#1a1a1a] mb-2">Check-in</h2>
        <p className="text-[#5A5A40]/60 mb-8">Enter the last 4 digits of your mobile number</p>
        
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            maxLength={4}
            value={input}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setInput(val);
              if (val.length === 4) handleSearch(val);
            }}
            placeholder="0000"
            className="w-full text-center text-5xl font-mono tracking-[0.5em] py-6 bg-[#f5f5f0] rounded-2xl border-2 border-transparent focus:border-[#5A5A40] outline-none transition-all placeholder:opacity-20"
          />
          
          <button
            onClick={toggleListening}
            className={cn(
              "absolute -right-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg",
              isListening ? "bg-red-500 text-white animate-pulse" : "bg-white text-[#5A5A40] hover:bg-[#f5f5f0]"
            )}
            title="Speech to Text"
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        </div>

        {status === "searching" && (
          <div className="mt-6 flex items-center gap-2 text-[#5A5A40] animate-pulse">
            <div className="w-2 h-2 bg-[#5A5A40] rounded-full" />
            Searching...
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 flex items-center gap-2 text-red-500">
            <AlertCircle size={18} />
            {errorMsg}
          </div>
        )}
      </motion.div>

      {/* Window 2: Confirmation */}
      <motion.div 
        layout
        className="bg-[#5A5A40] rounded-[32px] p-10 shadow-xl text-white flex flex-col justify-center items-center text-center relative overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {status === "confirming" && foundParticipant ? (
            <motion.div
              key="confirming"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center w-full"
            >
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
                <User size={48} />
              </div>
              <h3 className="text-sm uppercase tracking-widest opacity-60 mb-2">Welcome</h3>
              <h2 className="text-4xl font-serif font-medium mb-8">{foundParticipant.name}</h2>
              
              <button
                onClick={handleConfirm}
                className="group relative bg-white text-[#5A5A40] px-12 py-5 rounded-2xl font-bold text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
              >
                Confirm Attendance
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="mt-8 flex flex-col items-center gap-2">
                <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="h-full bg-white"
                  />
                </div>
                <p className="text-xs opacity-60">Auto-reset in {countdown}s</p>
              </div>
            </motion.div>
          ) : status === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <CheckCircle2 size={80} className="mb-6 text-white" />
              <h2 className="text-3xl font-serif font-medium mb-2">Confirmed!</h2>
              <p className="opacity-60">Your attendance has been recorded.</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              className="flex flex-col items-center"
            >
              <User size={80} className="mb-6 opacity-20" />
              <p className="text-xl font-serif italic">Waiting for input...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-3xl" />
      </motion.div>
    </div>
  );
}
