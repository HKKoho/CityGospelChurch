/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Database, ShieldCheck, Clock, LayoutDashboard, Monitor, Settings } from "lucide-react";
import { db, auth } from "./firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { ActivitySession } from "./types";
import KioskMode from "./components/KioskMode";
import AdminPanel from "./components/AdminPanel";
import { cn } from "./lib/utils";

export default function App() {
  const [view, setView] = useState<"kiosk" | "admin">("kiosk");
  const [activeSession, setActiveSession] = useState<ActivitySession | null>(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    // Check if firebase-applet-config.json exists by trying to listen to a collection
    const unsub = onSnapshot(collection(db, "sessions"), (snapshot) => {
      setIsFirebaseReady(true);
      const active = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as ActivitySession))
        .find(s => s.isActive);
      setActiveSession(active || null);
    }, (err) => {
      console.error("Firebase connection error:", err);
      setIsFirebaseReady(false);
    });

    return () => unsub();
  }, []);

  if (!isFirebaseReady) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[32px] p-10 shadow-sm border border-black/5 text-center"
        >
          <div className="w-16 h-16 bg-[#5A5A40] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#5A5A40]/20">
            <Database className="text-white w-8 h-8" />
          </div>
          
          <h1 className="text-3xl font-serif font-medium text-[#1a1a1a] mb-4">
            Setting up RollCall Pro
          </h1>
          
          <p className="text-[#5A5A40]/70 leading-relaxed mb-8">
            I'm ready to build your identification-based roll-call system. 
            To ensure high-traffic reliability and accurate history, I need to connect to a database.
          </p>

          <div className="space-y-4 text-left bg-[#f5f5f0]/50 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#5A5A40] mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a]">Firebase Setup Required</p>
                <p className="text-xs text-[#5A5A40]/60">Please accept the terms in the setup window to enable the database.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#5A5A40] mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a]">Real-time Ready</p>
                <p className="text-xs text-[#5A5A40]/60">Once accepted, I'll implement instant lookup and automatic timestamping.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm font-medium text-[#5A5A40]">
            <div className="w-2 h-2 bg-[#5A5A40] rounded-full animate-pulse" />
            Waiting for database confirmation...
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Navigation Rail */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-black/5 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center">
            <Database className="text-white w-5 h-5" />
          </div>
          <span className="font-serif font-bold text-xl tracking-tight">RollCall Pro</span>
        </div>

        <div className="flex bg-[#f5f5f0] p-1 rounded-2xl">
          <button
            onClick={() => setView("kiosk")}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all",
              view === "kiosk" ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#5A5A40]/40 hover:text-[#5A5A40]"
            )}
          >
            <Monitor size={16} />
            Kiosk Mode
          </button>
          <button
            onClick={() => setView("admin")}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all",
              view === "admin" ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#5A5A40]/40 hover:text-[#5A5A40]"
            )}
          >
            <LayoutDashboard size={16} />
            Admin Panel
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/40">Status</p>
            <p className="text-sm font-medium flex items-center gap-2 justify-end">
              <span className={cn("w-2 h-2 rounded-full", activeSession ? "bg-green-500 animate-pulse" : "bg-red-500")} />
              {activeSession ? "Live Session" : "No Active Session"}
            </p>
          </div>
          <button className="w-10 h-10 rounded-full bg-[#f5f5f0] flex items-center justify-center text-[#5A5A40] hover:bg-[#e4e4db] transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </nav>

      <main className="pt-32 pb-12 px-8 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {view === "kiosk" ? (
            <motion.div
              key="kiosk"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {activeSession ? (
                <KioskMode activeSession={activeSession} />
              ) : (
                <div className="h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-black/5">
                    <Clock size={40} className="text-[#5A5A40]/20" />
                  </div>
                  <h2 className="text-3xl font-serif font-medium mb-2">Roll Call is Disabled</h2>
                  <p className="text-[#5A5A40]/60 max-w-md">
                    Please ask an administrator to enable the self-serving roll call from the Admin Panel.
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
