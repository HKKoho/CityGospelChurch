import React, { useState, useEffect, useContext } from 'react';
import {
  rooms as roomsApi,
  bookings as bookingsApi,
  attendance as attendanceApi,
  worksheet as worksheetApi,
  sessions as sessionsApi,
  poll,
} from '../lib/api';
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
import { format } from 'date-fns';
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

    const fetchData = async () => {
      try {
        const [roomsData, bookingsData, attendanceData] = await Promise.all([
          roomsApi.list(),
          bookingsApi.list(),
          attendanceApi.list(),
        ]);
        setRooms(roomsData as Room[]);
        setMyBookings(bookingsData as Booking[]);
        setMyAttendance(attendanceData as AttendanceRecord[]);
      } catch (err) {
        console.error('Failed to fetch congregation data:', err);
      }
    };

    const fetchSession = async () => {
      try {
        const data = await sessionsApi.getActive();
        if (data && data.length > 0) setActiveSession(data[0] as Session);
        else setActiveSession(null);
      } catch {
        setActiveSession(null);
      }
    };

    // Poll for updates (replaces Supabase Realtime)
    const stop = poll(() => { fetchData(); fetchSession(); }, 10000);
    return stop;
  }, [profile]);

  const handleRollCall = async () => {
    if (!profile || lastFour.length !== 4) {
      toast.error("請輸入正好 4 位數字。");
      return;
    }

    setIsCheckingRoll(true);
    try {
      // 1. Check Worksheet for mapping
      const worksheetData = await worksheetApi.lookup(lastFour);

      if (!worksheetData || worksheetData.length === 0) {
        toast.error("在工作表中找不到此號碼的記錄。");
        setIsCheckingRoll(false);
        return;
      }

      const entry = worksheetData[0] as WorksheetEntry;
      toast.info(`找到記錄：${entry.name}`);

      // 2. Record Attendance
      const today = format(new Date(), 'yyyy-MM-dd');

      try {
        await attendanceApi.create({
          date: today,
          user_name: profile.name,
          last_four_digits: lastFour,
          status: 'present',
          session_id: activeSession?.id || null,
        });
        toast.success("點名成功！歡迎。");
      } catch (err: any) {
        if (err.message?.includes('Already')) {
          toast.warning("今日出席已記錄。");
        } else {
          throw err;
        }
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
      await bookingsApi.create({
        room_id: selectedRoom.id,
        room_name: selectedRoom.name,
        user_name: profile.name,
        start_time: bookingDate.toISOString(),
        end_time: new Date(bookingDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        purpose: bookingPurpose,
      });
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
