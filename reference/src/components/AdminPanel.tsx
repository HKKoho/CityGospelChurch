/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Upload, Play, Square, Users, FileSpreadsheet, Trash2, Clock, Search } from "lucide-react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy, writeBatch } from "firebase/firestore";
import { Participant, ActivitySession, AttendanceRecord } from "../types";
import { cn } from "../lib/utils";

export default function AdminPanel() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [activeSession, setActiveSession] = useState<ActivitySession | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Listen to participants
    const unsubParticipants = onSnapshot(collection(db, "participants"), (snapshot) => {
      setParticipants(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
    });

    // Listen to sessions
    const unsubSessions = onSnapshot(query(collection(db, "sessions"), orderBy("createdAt", "desc")), (snapshot) => {
      const sessList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ActivitySession));
      setSessions(sessList);
      setActiveSession(sessList.find(s => s.isActive) || null);
    });

    return () => {
      unsubParticipants();
      unsubSessions();
    };
  }, []);

  useEffect(() => {
    if (activeSession) {
      const unsubAttendance = onSnapshot(
        query(collection(db, `sessions/${activeSession.id}/attendance`), orderBy("confirmedAt", "desc")),
        (snapshot) => {
          setAttendance(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
        }
      );
      return () => unsubAttendance();
    } else {
      setAttendance([]);
    }
  }, [activeSession]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        // Simple CSV parser (assuming Name, MobileLast4)
        const rows = text.split("\n").slice(1); // Skip header
        const batch = writeBatch(db);
        
        for (const row of rows) {
          const [name, mobile] = row.split(",").map(s => s.trim());
          if (name && mobile) {
            const newDoc = doc(collection(db, "participants"));
            batch.set(newDoc, { name, mobileLast4: mobile.slice(-4) });
          }
        }
        await batch.commit();
        alert("Participants uploaded successfully!");
      } catch (err) {
        console.error(err);
        alert("Error parsing CSV. Ensure format is: Name, MobileNumber");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(file);
  };

  const startSession = async () => {
    const name = prompt("Enter Activity Name:", "New Activity");
    if (!name) return;

    const newSession: Omit<ActivitySession, "id"> = {
      name,
      date: new Date().toISOString().split("T")[0],
      isActive: true,
      createdAt: Date.now()
    };

    // Deactivate others
    const batch = writeBatch(db);
    sessions.forEach(s => {
      if (s.isActive) batch.update(doc(db, "sessions", s.id), { isActive: false });
    });
    
    const sessionRef = doc(collection(db, "sessions"));
    batch.set(sessionRef, newSession);
    await batch.commit();
  };

  const stopSession = async () => {
    if (!activeSession) return;
    await updateDoc(doc(db, "sessions", activeSession.id), { isActive: false });
  };

  const clearParticipants = async () => {
    if (!confirm("Are you sure you want to clear all participants?")) return;
    const batch = writeBatch(db);
    participants.forEach(p => batch.delete(doc(db, "participants", p.id)));
    await batch.commit();
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Session Control */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5">
            <h3 className="text-xl font-serif font-medium mb-6 flex items-center gap-2">
              <Play size={20} className="text-[#5A5A40]" />
              Session Control
            </h3>
            
            {activeSession ? (
              <div className="space-y-4">
                <div className="p-4 bg-[#5A5A40]/5 rounded-2xl border border-[#5A5A40]/10">
                  <p className="text-xs uppercase tracking-widest text-[#5A5A40]/60 mb-1">Active Session</p>
                  <p className="font-medium text-lg">{activeSession.name}</p>
                  <p className="text-sm text-[#5A5A40]/60">{activeSession.date}</p>
                </div>
                <button
                  onClick={stopSession}
                  className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                  <Square size={18} />
                  Stop Roll Call
                </button>
              </div>
            ) : (
              <button
                onClick={startSession}
                className="w-full py-6 bg-[#5A5A40] text-white rounded-2xl font-semibold flex flex-col items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-[#5A5A40]/20"
              >
                <Play size={24} />
                Enable Self-Serving Roll Call
              </button>
            )}
          </div>

          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5">
            <h3 className="text-xl font-serif font-medium mb-6 flex items-center gap-2">
              <Users size={20} className="text-[#5A5A40]" />
              Participant List
            </h3>
            <div className="flex gap-2 mb-6">
              <label className="flex-1 cursor-pointer bg-[#f5f5f0] hover:bg-[#e4e4db] text-[#5A5A40] py-3 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                <Upload size={16} />
                Upload CSV
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
              <button 
                onClick={clearParticipants}
                className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {participants.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-[#f5f5f0]/50 rounded-xl text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs font-mono opacity-40">***{p.mobileLast4}</span>
                </div>
              ))}
              {participants.length === 0 && (
                <p className="text-center py-8 text-sm text-[#5A5A40]/40 italic">No participants uploaded yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Attendance */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-serif font-medium flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-[#5A5A40]" />
                Live Attendance Log
              </h3>
              <div className="px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-xs font-bold flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {attendance.length} Confirmed
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-widest text-[#5A5A40]/40 border-bottom">
                    <th className="pb-4 font-semibold">Time</th>
                    <th className="pb-4 font-semibold">Participant</th>
                    <th className="pb-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {attendance.map((record) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={record.id} 
                      className="group"
                    >
                      <td className="py-4 text-sm font-mono text-[#5A5A40]/60">
                        {new Date(record.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-4 font-medium">{record.participantName}</td>
                      <td className="py-4">
                        <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          Present
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-20 text-center text-[#5A5A40]/40 italic">
                        Waiting for check-ins...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
