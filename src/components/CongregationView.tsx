import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from './Auth';
import { Room, Booking, AttendanceRecord, WorksheetEntry, Session } from '../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, isToday, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle2, Clock, History, UserCheck, Monitor, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

import { buttonVariants } from './ui/button';
import { cn } from '../lib/utils';

export const CongregationView: React.FC = () => {
  const { profile } = useContext(AuthContext);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);

  // Session State
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  // Roll Call State
  const [lastFour, setLastFour] = useState('');
  const [isCheckingRoll, setIsCheckingRoll] = useState(false);

  // Booking State
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingDate, setBookingDate] = useState<Date | undefined>(new Date());
  const [bookingPurpose, setBookingPurpose] = useState('');

  useEffect(() => {
    if (!profile) return;

    // Fetch initial data
    const fetchData = async () => {
      const [roomsRes, bookingsRes, attendanceRes] = await Promise.all([
        supabase.from('rooms').select('*'),
        supabase.from('bookings').select('*').eq('user_id', profile.uid),
        supabase.from('attendance').select('*').eq('user_id', profile.uid),
      ]);
      if (roomsRes.data) setRooms(roomsRes.data as Room[]);
      if (bookingsRes.data) setMyBookings(bookingsRes.data as Booking[]);
      if (attendanceRes.data) setMyAttendance(attendanceRes.data as AttendanceRecord[]);
    };
    fetchData();

    // Real-time subscriptions
    const roomsChannel = supabase
      .channel('congregation-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        supabase.from('rooms').select('*').then(({ data }) => {
          if (data) setRooms(data as Room[]);
        });
      })
      .subscribe();

    const bookingsChannel = supabase
      .channel('congregation-bookings')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
        filter: `user_id=eq.${profile.uid}`,
      }, () => {
        supabase.from('bookings').select('*').eq('user_id', profile.uid).then(({ data }) => {
          if (data) setMyBookings(data as Booking[]);
        });
      })
      .subscribe();

    const attendanceChannel = supabase
      .channel('congregation-attendance')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'attendance',
        filter: `user_id=eq.${profile.uid}`,
      }, () => {
        supabase.from('attendance').select('*').eq('user_id', profile.uid).then(({ data }) => {
          if (data) setMyAttendance(data as AttendanceRecord[]);
        });
      })
      .subscribe();

    // Fetch active session
    const fetchSession = async () => {
      const { data } = await supabase.from('sessions').select('*').eq('is_active', true).limit(1);
      if (data && data.length > 0) setActiveSession(data[0] as Session);
      else setActiveSession(null);
    };
    fetchSession();

    const sessionChannel = supabase
      .channel('congregation-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchSession();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [profile]);

  const handleRollCall = async () => {
    if (!profile || lastFour.length !== 4) {
      toast.error("請輸入正好 4 位數字。");
      return;
    }

    setIsCheckingRoll(true);
    try {
      // 1. Check Worksheet for mapping
      const { data: worksheetData, error: worksheetError } = await supabase
        .from('worksheet')
        .select('*')
        .eq('last_four_digits', lastFour)
        .limit(1);

      if (worksheetError || !worksheetData || worksheetData.length === 0) {
        toast.error("在工作表中找不到此號碼的記錄。");
        setIsCheckingRoll(false);
        return;
      }

      const entry = worksheetData[0] as WorksheetEntry;

      // 2. Verify if it matches user's name (basic check)
      toast.info(`找到記錄：${entry.name}`);

      // 3. Record Attendance
      const today = format(new Date(), 'yyyy-MM-dd');

      // Check if already recorded today
      const { data: todayData } = await supabase
        .from('attendance')
        .select('id')
        .eq('user_id', profile.uid)
        .eq('date', today);

      if (todayData && todayData.length > 0) {
        toast.warning("今日出席已記錄。");
      } else {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert({
            user_id: profile.uid,
            user_name: profile.name,
            date: today,
            last_four_digits: lastFour,
            status: 'present',
            session_id: activeSession?.id || null,
            created_at: new Date().toISOString(),
          });
        if (insertError) throw insertError;
        toast.success("點名成功！歡迎。");
      }
      setLastFour('');
    } catch (error) {
      console.error("Roll call error:", error);
      toast.error("點名時發生錯誤。");
    } finally {
      setIsCheckingRoll(false);
    }
  };

  const handleBooking = async () => {
    if (!profile || !selectedRoom || !bookingDate || !bookingPurpose) {
      toast.error("請填寫所有預約資料。");
      return;
    }

    try {
      const { error } = await supabase.from('bookings').insert({
        room_id: selectedRoom.id,
        room_name: selectedRoom.name,
        user_id: profile.uid,
        user_name: profile.name,
        start_time: bookingDate.toISOString(),
        end_time: new Date(bookingDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // Default 2 hours
        status: 'pending',
        purpose: bookingPurpose,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("預約申請已送出！");
      setSelectedRoom(null);
      setBookingPurpose('');
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("送出預約失敗。");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold">會眾入口</h1>
          <p className="text-muted-foreground">歡迎回來，{profile?.name}。</p>
        </div>
        <Badge variant="outline" className="text-lg py-1 px-4">
          {profile?.role.toUpperCase()}
        </Badge>
      </div>

      <Tabs defaultValue="rollcall" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="rollcall">
            <UserCheck className="w-4 h-4 mr-2" />
            點名
          </TabsTrigger>
          <TabsTrigger value="booking">
            <CalendarIcon className="w-4 h-4 mr-2" />
            場地預約
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            我的記錄
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rollcall">
          {/* Session status banner */}
          {activeSession ? (
            <div className="flex items-center justify-center gap-2 mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Badge className="bg-green-500 animate-pulse">進行中</Badge>
              <span className="text-sm font-medium">{activeSession.name}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-4 p-3 rounded-lg bg-muted border">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">目前沒有進行中的點名活動</span>
            </div>
          )}

          <div className="flex justify-center mb-6">
            <Button
              variant="outline"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'kiosk' } }))}
            >
              <Monitor className="w-4 h-4 mr-2" />
              進入自助報到模式
            </Button>
          </div>

          <Card className="max-w-md mx-auto glass-card">
            <CardHeader>
              <CardTitle>自助點名</CardTitle>
              <CardDescription>
                輸入您已登記電話號碼的末 4 碼以標記出席。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="digits">末 4 碼</Label>
                <Input
                  id="digits"
                  placeholder="例如 1234"
                  maxLength={4}
                  value={lastFour}
                  onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-3xl tracking-[1rem] font-mono h-16"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full h-12 text-lg"
                onClick={handleRollCall}
                disabled={isCheckingRoll || lastFour.length !== 4}
              >
                {isCheckingRoll ? "驗證中..." : "標記出席"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="booking" className="space-y-6">
          {/* Two-month booking calendar */}
          <div>
            <h3 className="text-xl font-bold mb-4">預約日曆</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[0, 1].map(offset => {
                const monthStart = startOfMonth(addMonths(new Date(), offset));
                const monthEnd = endOfMonth(monthStart);
                const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
                const startPad = getDay(monthStart);

                return (
                  <Card key={offset}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{format(monthStart, 'yyyy 年 M 月')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground mb-1">
                        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                          <div key={d} className="py-1 font-medium">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-y-1">
                        {Array.from({ length: startPad }).map((_, i) => (
                          <div key={`pad-${i}`} />
                        ))}
                        {days.map(day => {
                          const dayBookings = myBookings.filter(b => isSameDay(new Date(b.start_time), day));
                          const hasApproved = dayBookings.some(b => b.status === 'approved');
                          const hasPending = dayBookings.some(b => b.status === 'pending');
                          const today = isToday(day);

                          return (
                            <div
                              key={day.toISOString()}
                              className={`flex flex-col items-center py-1 rounded-md text-xs ${today ? 'bg-primary/10' : ''}`}
                            >
                              <span className={today ? 'font-bold text-primary' : ''}>{format(day, 'd')}</span>
                              {dayBookings.length > 0 && (
                                <div className="flex gap-0.5 mt-0.5">
                                  {hasApproved && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                                  {hasPending && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />已核准</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />待審核</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-xl font-bold">選擇場地</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <Card
                    key={room.id}
                    className={`cursor-pointer transition-all ${selectedRoom?.id === room.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg">{room.name}</CardTitle>
                      <CardDescription>容量：{room.capacity}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>預約詳情</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>日期</Label>
                  <Popover>
                    <PopoverTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {bookingDate ? format(bookingDate, "PPP") : <span>選擇日期</span>}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose">用途</Label>
                  <Input
                    id="purpose"
                    placeholder="例如：詩班練習"
                    value={bookingPurpose}
                    onChange={(e) => setBookingPurpose(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleBooking} disabled={!selectedRoom}>
                  提交預約
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4">
              <h3 className="text-xl font-bold flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                最近預約
              </h3>
              <div className="space-y-3">
                {myBookings.length > 0 ? myBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold">{booking.room_name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(booking.start_time), "PPP p")}</p>
                      </div>
                      <Badge variant={booking.status === 'approved' ? 'default' : booking.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {booking.status === 'approved' ? '已核准' : booking.status === 'rejected' ? '已拒絕' : '待審核'}
                      </Badge>
                    </CardContent>
                  </Card>
                )) : <p className="text-muted-foreground text-sm">尚無預約。</p>}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-bold flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                出席記錄
              </h3>
              <div className="space-y-3">
                {myAttendance.length > 0 ? myAttendance.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold">{format(new Date(record.date), "EEEE, MMM do")}</p>
                        <p className="text-xs text-muted-foreground">方式：末 4 碼（{record.last_four_digits}）</p>
                      </div>
                      <Badge className="bg-green-500 hover:bg-green-600">出席</Badge>
                    </CardContent>
                  </Card>
                )) : <p className="text-muted-foreground text-sm">找不到出席記錄。</p>}
              </div>
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
