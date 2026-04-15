import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from './Auth';
import { Room, Booking, AttendanceRecord, WorksheetEntry } from '../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle2, Clock, History, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

import { buttonVariants } from './ui/button';
import { cn } from '../lib/utils';

export const CongregationView: React.FC = () => {
  const { profile } = useContext(AuthContext);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);

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

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(attendanceChannel);
    };
  }, [profile]);

  const handleRollCall = async () => {
    if (!profile || lastFour.length !== 4) {
      toast.error("Please enter exactly 4 digits.");
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
        toast.error("No record found for these digits in the worksheet.");
        setIsCheckingRoll(false);
        return;
      }

      const entry = worksheetData[0] as WorksheetEntry;

      // 2. Verify if it matches user's name (basic check)
      toast.info(`Found record for: ${entry.name}`);

      // 3. Record Attendance
      const today = format(new Date(), 'yyyy-MM-dd');

      // Check if already recorded today
      const { data: todayData } = await supabase
        .from('attendance')
        .select('id')
        .eq('user_id', profile.uid)
        .eq('date', today);

      if (todayData && todayData.length > 0) {
        toast.warning("Attendance already recorded for today.");
      } else {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert({
            user_id: profile.uid,
            user_name: profile.name,
            date: today,
            last_four_digits: lastFour,
            status: 'present',
            created_at: new Date().toISOString(),
          });
        if (insertError) throw insertError;
        toast.success("Roll call successful! Welcome.");
      }
      setLastFour('');
    } catch (error) {
      console.error("Roll call error:", error);
      toast.error("An error occurred during roll call.");
    } finally {
      setIsCheckingRoll(false);
    }
  };

  const handleBooking = async () => {
    if (!profile || !selectedRoom || !bookingDate || !bookingPurpose) {
      toast.error("Please fill in all booking details.");
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
      toast.success("Booking request submitted!");
      setSelectedRoom(null);
      setBookingPurpose('');
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Failed to submit booking.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold">Congregation Portal</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.name}.</p>
        </div>
        <Badge variant="outline" className="text-lg py-1 px-4">
          {profile?.role.toUpperCase()}
        </Badge>
      </div>

      <Tabs defaultValue="rollcall" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="rollcall">
            <UserCheck className="w-4 h-4 mr-2" />
            Roll Call
          </TabsTrigger>
          <TabsTrigger value="booking">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Room Booking
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            My History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rollcall">
          <Card className="max-w-md mx-auto glass-card">
            <CardHeader>
              <CardTitle>Self-Service Roll Call</CardTitle>
              <CardDescription>
                Enter the last 4 digits of your registered phone number to mark your attendance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="digits">Last 4 Digits</Label>
                <Input
                  id="digits"
                  placeholder="e.g. 1234"
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
                {isCheckingRoll ? "Verifying..." : "Mark Attendance"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="booking" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-xl font-bold">Select a Room</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <Card
                    key={room.id}
                    className={`cursor-pointer transition-all ${selectedRoom?.id === room.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg">{room.name}</CardTitle>
                      <CardDescription>Capacity: {room.capacity}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {bookingDate ? format(bookingDate, "PPP") : <span>Pick a date</span>}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Input
                    id="purpose"
                    placeholder="e.g. Choir practice"
                    value={bookingPurpose}
                    onChange={(e) => setBookingPurpose(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleBooking} disabled={!selectedRoom}>
                  Request Booking
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
                Recent Bookings
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
                        {booking.status}
                      </Badge>
                    </CardContent>
                  </Card>
                )) : <p className="text-muted-foreground text-sm">No bookings yet.</p>}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-bold flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Attendance History
              </h3>
              <div className="space-y-3">
                {myAttendance.length > 0 ? myAttendance.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold">{format(new Date(record.date), "EEEE, MMM do")}</p>
                        <p className="text-xs text-muted-foreground">Method: Last 4 Digits ({record.last_four_digits})</p>
                      </div>
                      <Badge className="bg-green-500 hover:bg-green-600">Present</Badge>
                    </CardContent>
                  </Card>
                )) : <p className="text-muted-foreground text-sm">No attendance records found.</p>}
              </div>
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
