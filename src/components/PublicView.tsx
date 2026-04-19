import React, { useState, useEffect, useContext } from 'react';
import { media as mediaApi, rooms as roomsApi, poll } from '../lib/api';
import { MediaItem, Room } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Play, Music, Image as ImageIcon, MapPin, Users, CalendarDays, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { AuthContext } from './Auth';

import { GeminiGuidance } from './GeminiGuidance';

interface SectionItem {
  id: string;
  title: string;
  description: string;
  url: string;
  type: string;
  category: string;
}

export const PublicView: React.FC = () => {
  const { profile, signIn } = useContext(AuthContext);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [showGuidance, setShowGuidance] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);

  // Section content from database
  const [worshipItems, setWorshipItems] = useState<SectionItem[]>([]);
  const [devotionItems, setDevotionItems] = useState<SectionItem[]>([]);
  const [rollCallItems, setRollCallItems] = useState<SectionItem[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [mediaData, roomsData, worshipData, devotionData, rollCallData] = await Promise.all([
          mediaApi.list(undefined, 6),
          roomsApi.list(4),
          mediaApi.list('worship_youtube'),
          mediaApi.list('devotion'),
          mediaApi.list('roll_call'),
        ]);
        setMedia(mediaData as MediaItem[]);
        setRooms(roomsData as Room[]);
        setWorshipItems(worshipData as SectionItem[]);
        setDevotionItems(devotionData as SectionItem[]);
        setRollCallItems(rollCallData as SectionItem[]);
      } catch (err) {
        console.error('Failed to fetch public data:', err);
      }
    };

    // Poll every 15s for updates (replaces Supabase Realtime)
    const stop = poll(fetchAll, 15000);
    return stop;
  }, []);

  const handleAdminAccess = () => {
    if (profile && profile.role === 'admin') {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'admin' } }));
    } else if (profile) {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'admin' } }));
    } else {
      signIn();
    }
  };

  const sectionCards = [
    {
      icon: <Play className="w-10 h-10" />,
      label: '崇拜YouTube',
      items: worshipItems,
      clickAction: (item: SectionItem) => window.open(item.url, '_blank'),
    },
    {
      icon: <Music className="w-10 h-10" />,
      label: '靈修日程',
      items: devotionItems,
      clickAction: () => setShowGuidance(!showGuidance),
      isGuidance: true,
    },
    {
      icon: <ImageIcon className="w-10 h-10" />,
      label: '參與記名',
      items: rollCallItems,
      clickAction: () => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'congregation' } }));
      },
    },
  ];

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden rounded-3xl mt-6">
        <div className="absolute inset-0 z-0">
          <img
            src="https://picsum.photos/seed/church/1920/1080"
            alt="Hero"
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center space-y-4 px-4"
        >
          <h1 className="text-6xl md:text-8xl font-heading font-bold tracking-tighter">
            歡迎來到<span className="text-primary">城市福音教會</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            一個屬於社群敬拜與生活的現代空間。
            探索媒體庫，成長靈命和預約場地。
          </p>
          {/* Admin Button */}
          <div className="pt-4">
            <Button
              variant="outline"
              size="sm"
              className="opacity-60 hover:opacity-100 transition-opacity"
              onClick={handleAdminAccess}
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              {profile?.role === 'admin' ? '進入管理後台' : '管理員登入'}
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Three Section Cards — always visible */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold">教會服務</h2>
            <p className="text-muted-foreground">崇拜影片、靈修資源與參與記名。</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sectionCards.map((section, i) => {
            const hasItems = section.items.length > 0;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card
                  className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary hover:shadow-lg transition-all"
                  onClick={() => {
                    if (hasItems && !section.isGuidance && section.items[0]) {
                      section.clickAction(section.items[0]);
                    } else if (section.isGuidance) {
                      (section.clickAction as () => void)();
                    } else {
                      (section.clickAction as () => void)();
                    }
                  }}
                >
                  <div className={`relative aspect-video flex flex-col items-center justify-center gap-3 ${hasItems ? 'bg-primary/5' : 'bg-muted'}`}>
                    <div className={hasItems ? 'text-primary' : 'text-muted-foreground/50'}>
                      {section.icon}
                    </div>
                    <span className={`text-lg font-bold ${hasItems ? 'text-primary' : 'text-muted-foreground'}`}>
                      {section.label}
                    </span>
                  </div>
                  <CardHeader className="p-4">
                    {hasItems ? (
                      <>
                        <CardTitle className="text-lg">{section.items[0].title}</CardTitle>
                        <CardDescription className="line-clamp-2">{section.items[0].description}</CardDescription>
                      </>
                    ) : (
                      <>
                        <CardTitle className="text-lg text-muted-foreground/50">
                          {section.isGuidance ? '點擊開啟 AI 助理' : '點擊進入'}
                        </CardTitle>
                        <CardDescription>
                          {section.isGuidance ? '教會 AI 聖經資料查詢助理' : '請管理員新增內容。'}
                        </CardDescription>
                      </>
                    )}
                  </CardHeader>
                  {hasItems && section.items.length > 1 && (
                    <CardContent className="pt-0 pb-4 px-4">
                      <div className="space-y-1">
                        {section.items.slice(1, 4).map((item) => (
                          <div
                            key={item.id}
                            className="text-sm text-muted-foreground hover:text-primary cursor-pointer truncate"
                            onClick={(e) => {
                              e.stopPropagation();
                              section.clickAction(item);
                            }}
                          >
                            • {item.title}
                          </div>
                        ))}
                        {section.items.length > 4 && (
                          <div className="text-xs text-muted-foreground">...還有 {section.items.length - 4} 項</div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* AI Guidance (toggled from 靈修日程) */}
      {showGuidance && (
        <section>
          <GeminiGuidance />
        </section>
      )}

      {/* Room Showcase */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold">我們的場地</h2>
            <p className="text-muted-foreground">精美的場地可供預約及舉辦活動。</p>
          </div>
          <Button
            size="lg"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'congregation' } }));
            }}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            立即預約
          </Button>
        </div>

        {/* Monthly Booking Map */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              本月場地預約狀況
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-400" />
                <span>可預約</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-400" />
                <span>部分時段已佔用</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-400" />
                <span>已滿</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-muted" />
                <span>不適用</span>
              </div>
            </div>
          </div>
          {(() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const today = now.getDate();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDayOfWeek = new Date(year, month, 1).getDay();
            const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

            // Mock occupied data
            const mockStatus: Record<number, 'available' | 'partial' | 'full'> = {
              3: 'partial', 5: 'full', 6: 'full',
              10: 'partial', 12: 'full', 13: 'partial',
              17: 'full', 19: 'partial', 20: 'full',
              24: 'partial', 25: 'full', 26: 'partial', 27: 'full',
            };

            const statusColor = (day: number) => {
              if (day < today) return 'bg-muted text-muted-foreground/40';
              const s = mockStatus[day];
              if (s === 'full') return 'bg-red-400/80 text-white';
              if (s === 'partial') return 'bg-orange-400/80 text-white';
              return 'bg-green-400/80 text-white';
            };

            return (
              <div className="grid grid-cols-7 gap-1">
                {weekdays.map((d) => (
                  <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">{d}</div>
                ))}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === today;
                  return (
                    <div
                      key={day}
                      className={`relative text-center py-2 rounded-md text-sm font-medium transition-colors ${statusColor(day)} ${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {rooms.map((room) => (
            <Card key={room.id} className="flex flex-col md:flex-row overflow-hidden border-none shadow-none bg-muted/30">
              <div className="w-full md:w-1/2 aspect-video md:aspect-auto">
                <img
                  src={room.image_url || `https://picsum.photos/seed/${room.id}/600/400`}
                  alt={room.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-6 flex flex-col justify-center space-y-4">
                <h3 className="text-2xl font-bold">{room.name}</h3>
                <p className="text-muted-foreground">{room.description}</p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1 text-primary" />
                    <span>最多容納 {room.capacity} 人</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-primary" />
                    <span>主堂</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};
