import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { MediaItem, Room } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Play, Music, Image as ImageIcon, MapPin, Users, CalendarDays, ShieldCheck, ChevronDown, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { AuthContext } from './Auth';
import { GeminiGuidance } from './GeminiGuidance';
import { ChurchAuth } from './ChurchAuth';

interface ChurchSession {
  last_four: string;
  name: string;
}

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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [worshipItems, setWorshipItems] = useState<SectionItem[]>([]);
  const [devotionItems, setDevotionItems] = useState<SectionItem[]>([]);
  const [rollCallItems, setRollCallItems] = useState<SectionItem[]>([]);
  const [showGuidance, setShowGuidance] = useState(false);
  const [openPortal, setOpenPortal] = useState<'church' | 'service' | null>(null);
  const [churchSession, setChurchSession] = useState<ChurchSession | null>(() => {
    try {
      const stored = localStorage.getItem('church_session');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  useEffect(() => {
    const fetchData = async () => {
      const [mediaRes, roomsRes] = await Promise.all([
        supabase.from('media').select('*').limit(6),
        supabase.from('rooms').select('*').limit(4),
      ]);
      if (mediaRes.data) setMedia(mediaRes.data as MediaItem[]);
      if (roomsRes.data) setRooms(roomsRes.data as Room[]);
    };
    fetchData();

    const fetchSections = async () => {
      const [worshipRes, devotionRes, rollCallRes] = await Promise.all([
        supabase.from('media').select('*').eq('category', 'worship_youtube'),
        supabase.from('media').select('*').eq('category', 'devotion'),
        supabase.from('media').select('*').eq('category', 'roll_call'),
      ]);
      if (worshipRes.data) setWorshipItems(worshipRes.data as SectionItem[]);
      if (devotionRes.data) setDevotionItems(devotionRes.data as SectionItem[]);
      if (rollCallRes.data) setRollCallItems(rollCallRes.data as SectionItem[]);
    };
    fetchSections();

    const mediaChannel = supabase
      .channel('public-media')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, () => {
        supabase.from('media').select('*').limit(6).then(({ data }) => { if (data) setMedia(data as MediaItem[]); });
        supabase.from('media').select('*').eq('category', 'worship_youtube').then(({ data }) => { if (data) setWorshipItems(data as SectionItem[]); });
        supabase.from('media').select('*').eq('category', 'devotion').then(({ data }) => { if (data) setDevotionItems(data as SectionItem[]); });
        supabase.from('media').select('*').eq('category', 'roll_call').then(({ data }) => { if (data) setRollCallItems(data as SectionItem[]); });
      })
      .subscribe();

    const roomsChannel = supabase
      .channel('public-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        supabase.from('rooms').select('*').limit(4).then(({ data }) => { if (data) setRooms(data as Room[]); });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(mediaChannel);
      supabase.removeChannel(roomsChannel);
    };
  }, []);

  const handleAdminAccess = () => {
    if (profile) {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'admin' } }));
    } else {
      signIn();
    }
  };

  const togglePortal = (portal: 'church' | 'service') => {
    setOpenPortal(prev => prev === portal ? null : portal);
    setShowGuidance(false);
  };

  const handleChurchAuthSuccess = (last_four: string, name: string) => {
    setChurchSession({ last_four, name });
  };

  const handleChurchLogout = () => {
    localStorage.removeItem('church_session');
    setChurchSession(null);
    setShowGuidance(false);
  };

  const churchServices = [
    {
      icon: <Play className="w-8 h-8" />,
      label: '崇拜 YouTube',
      items: worshipItems,
      clickAction: (item: SectionItem) => window.open(item.url, '_blank'),
    },
    {
      icon: <Music className="w-8 h-8" />,
      label: '靈修日誌',
      items: devotionItems,
      clickAction: () => setShowGuidance(v => !v),
      isGuidance: true,
    },
    {
      icon: <ImageIcon className="w-8 h-8" />,
      label: '參與記名',
      items: rollCallItems,
      clickAction: () => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'congregation' } }));
      },
    },
  ];

  return (
    <div className="space-y-8 pb-20">

      {/* Admin button — subtle top-right */}
      <div className="flex justify-end pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="opacity-40 hover:opacity-80 transition-opacity"
          onClick={handleAdminAccess}
        >
          <ShieldCheck className="w-4 h-4 mr-2" />
          {profile?.role === 'admin' ? '進入管理後台' : '管理員登入'}
        </Button>
      </div>

      {/* Two big portal cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Portal 1 — 城市福音教會 */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <button
            onClick={() => togglePortal('church')}
            className={`w-full rounded-3xl border-2 transition-all duration-300 overflow-hidden text-left focus:outline-none
              ${openPortal === 'church'
                ? 'border-primary shadow-xl shadow-primary/10 bg-primary/5'
                : 'border-border hover:border-primary/40 hover:shadow-lg bg-card'
              }`}
          >
            <div className="flex flex-col items-center justify-center gap-6 p-10">
              <img
                src="/CityGospelChurch.png"
                alt="城市福音教會"
                className="w-36 h-36 object-contain"
              />
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-heading font-bold">城市福音教會</h2>
                <div className="flex flex-wrap justify-center gap-2">
                  {['崇拜 YouTube', '參與記名', '靈修日誌'].map(s => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${openPortal === 'church' ? 'rotate-180' : ''}`}
              />
            </div>
          </button>
        </motion.div>

        {/* Portal 2 — 1cm 綜合服務中心 */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <button
            onClick={() => togglePortal('service')}
            className={`w-full rounded-3xl border-2 transition-all duration-300 overflow-hidden text-left focus:outline-none
              ${openPortal === 'service'
                ? 'border-primary shadow-xl shadow-primary/10 bg-primary/5'
                : 'border-border hover:border-primary/40 hover:shadow-lg bg-card'
              }`}
          >
            <div className="flex flex-col items-center justify-center gap-6 p-10">
              <img
                src="/1cmServiceCentre.jpg"
                alt="1cm 綜合服務中心"
                className="w-36 h-36 object-contain rounded-full"
              />
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-heading font-bold">1cm 綜合服務中心</h2>
                <div className="flex flex-wrap justify-center gap-2">
                  {['場地預約', '活動空間', '設施管理'].map(s => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${openPortal === 'service' ? 'rotate-180' : ''}`}
              />
            </div>
          </button>
        </motion.div>
      </section>

      {/* Expanded: 城市福音教會 */}
      <AnimatePresence>
        {openPortal === 'church' && (
          <motion.section
            key="church"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              {!churchSession ? (
                /* ── Auth gate ── */
                <div className="space-y-6">
                  <div className="text-center space-y-1">
                    <h3 className="text-2xl font-heading font-bold">城市福音教會</h3>
                    <p className="text-muted-foreground text-sm">請登入以使用教會服務</p>
                  </div>
                  <ChurchAuth onSuccess={handleChurchAuthSuccess} />
                </div>
              ) : (
                /* ── Authenticated services ── */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-heading font-bold">教會服務</h3>
                      <p className="text-muted-foreground text-sm">
                        歡迎回來，{churchSession.name || `末 4 碼 ${churchSession.last_four}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleChurchLogout} className="text-muted-foreground">
                      <LogOut className="w-4 h-4 mr-1" />
                      登出
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {churchServices.map((section, i) => {
                      const hasItems = section.items.length > 0;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                        >
                          <Card
                            className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary hover:shadow-lg transition-all"
                            onClick={() => {
                              if (hasItems && !section.isGuidance && section.items[0]) {
                                section.clickAction(section.items[0]);
                              } else {
                                (section.clickAction as () => void)();
                              }
                            }}
                          >
                            <div className={`relative aspect-video flex flex-col items-center justify-center gap-3 ${hasItems ? 'bg-primary/5' : 'bg-muted'}`}>
                              <div className={hasItems ? 'text-primary' : 'text-muted-foreground/50'}>
                                {section.icon}
                              </div>
                              <span className={`text-base font-bold ${hasItems ? 'text-primary' : 'text-muted-foreground'}`}>
                                {section.label}
                              </span>
                            </div>
                            <CardHeader className="p-4">
                              {hasItems ? (
                                <>
                                  <CardTitle className="text-base">{section.items[0].title}</CardTitle>
                                  <CardDescription className="line-clamp-2">{section.items[0].description}</CardDescription>
                                </>
                              ) : (
                                <>
                                  <CardTitle className="text-base text-muted-foreground/50">
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
                                  {section.items.slice(1, 4).map(item => (
                                    <div
                                      key={item.id}
                                      className="text-sm text-muted-foreground hover:text-primary cursor-pointer truncate"
                                      onClick={e => { e.stopPropagation(); section.clickAction(item); }}
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

                  {showGuidance && <GeminiGuidance />}
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Expanded: 1cm 綜合服務中心 */}
      <AnimatePresence>
        {openPortal === 'service' && (
          <motion.section
            key="service"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-6 pt-2">
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="text-2xl font-heading font-bold">場地預約</h3>
                  <p className="text-muted-foreground text-sm">精美的場地可供預約及舉辦活動。</p>
                </div>
                <Button
                  size="lg"
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'congregation' } }))}
                >
                  <CalendarDays className="w-4 h-4 mr-2" />
                  立即預約
                </Button>
              </div>

              {/* Monthly Booking Map */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    本月場地預約狀況
                  </h4>
                  <div className="flex items-center gap-4 text-xs">
                    {[['bg-green-400', '可預約'], ['bg-orange-400', '部分已佔用'], ['bg-red-400', '已滿']].map(([color, label]) => (
                      <div key={label} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded ${color}`} />
                        <span>{label}</span>
                      </div>
                    ))}
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
                      {weekdays.map(d => (
                        <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">{d}</div>
                      ))}
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        return (
                          <div
                            key={day}
                            className={`text-center py-2 rounded-md text-sm font-medium ${statusColor(day)} ${day === today ? 'ring-2 ring-primary ring-offset-2' : ''}`}
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
                {rooms.map(room => (
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
                      <h4 className="text-2xl font-bold">{room.name}</h4>
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
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};
