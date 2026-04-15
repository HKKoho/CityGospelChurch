import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs } from 'firebase/firestore';
import { UserProfile, Booking, Room, MediaItem, WorksheetEntry, AttendanceRecord } from '../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Check, X, Trash2, Plus, Users, Calendar, Video, FileSpreadsheet, Activity, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { GeminiGuidance } from './GeminiGuidance';

export const AdminView: React.FC = () => {
  // ... existing states ...
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [worksheet, setWorksheet] = useState<WorksheetEntry[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const seedData = async () => {
    try {
      // Seed Rooms
      const roomsData = [
        { name: 'Sanctuary', capacity: 500, description: 'Main worship hall with high-end audio.', imageUrl: 'https://picsum.photos/seed/sanctuary/800/600' },
        { name: 'Youth Hall', capacity: 100, description: 'Vibrant space for youth activities.', imageUrl: 'https://picsum.photos/seed/youth/800/600' },
        { name: 'Meeting Room A', capacity: 20, description: 'Quiet space for small group meetings.', imageUrl: 'https://picsum.photos/seed/meeting/800/600' },
      ];
      for (const r of roomsData) await addDoc(collection(db, 'rooms'), r);

      // Seed Media
      const mediaData = [
        { title: 'Sunday Service - Hope', type: 'video', url: 'https://example.com/video1', description: 'A powerful message about finding hope in difficult times.', category: 'Sermon', createdAt: new Date().toISOString() },
        { title: 'Worship Set - Morning Grace', type: 'audio', url: 'https://example.com/audio1', description: 'Morning worship session with the choir.', category: 'Worship', createdAt: new Date().toISOString() },
      ];
      for (const m of mediaData) await addDoc(collection(db, 'media'), m);

      // Seed Worksheet
      const worksheetData = [
        { name: 'John Doe', lastFourDigits: '1234' },
        { name: 'Jane Smith', lastFourDigits: '5678' },
        { name: 'Alice Johnson', lastFourDigits: '9012' },
      ];
      for (const w of worksheetData) await addDoc(collection(db, 'worksheet'), w);

      toast.success("Demo data seeded successfully!");
    } catch (error) {
      toast.error("Failed to seed data.");
    }
  };

  // ... rest of the component ...

  // Form states
  const [newRoom, setNewRoom] = useState({ name: '', capacity: 0, description: '', imageUrl: '' });
  const [newMedia, setNewMedia] = useState({ title: '', type: 'video' as any, url: '', description: '', category: '' });
  const [newWorksheet, setNewWorksheet] = useState({ name: '', lastFourDigits: '' });

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snap) => {
      setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });
    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
      setRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room)));
    });
    const unsubMedia = onSnapshot(collection(db, 'media'), (snap) => {
      setMedia(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaItem)));
    });
    const unsubWorksheet = onSnapshot(collection(db, 'worksheet'), (snap) => {
      setWorksheet(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorksheetEntry)));
    });
    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snap) => {
      setAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
    });

    return () => {
      unsubUsers(); unsubBookings(); unsubRooms(); unsubMedia(); unsubWorksheet(); unsubAttendance();
    };
  }, []);

  const handleUpdateUserRole = async (uid: string, role: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      toast.success("User role updated.");
    } catch (error) {
      toast.error("Failed to update role.");
    }
  };

  const handleBookingAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'bookings', id), { status });
      toast.success(`Booking ${status}.`);
    } catch (error) {
      toast.error("Failed to update booking.");
    }
  };

  const handleAddRoom = async () => {
    try {
      await addDoc(collection(db, 'rooms'), newRoom);
      toast.success("Room added.");
      setNewRoom({ name: '', capacity: 0, description: '', imageUrl: '' });
    } catch (error) {
      toast.error("Failed to add room.");
    }
  };

  const handleAddMedia = async () => {
    try {
      await addDoc(collection(db, 'media'), { ...newMedia, createdAt: new Date().toISOString() });
      toast.success("Media added.");
      setNewMedia({ title: '', type: 'video', url: '', description: '', category: '' });
    } catch (error) {
      toast.error("Failed to add media.");
    }
  };

  const handleAddWorksheet = async () => {
    try {
      await addDoc(collection(db, 'worksheet'), newWorksheet);
      toast.success("Worksheet entry added.");
      setNewWorksheet({ name: '', lastFourDigits: '' });
    } catch (error) {
      toast.error("Failed to add worksheet entry.");
    }
  };

  const handleDelete = async (coll: string, id: string) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    try {
      await deleteDoc(doc(db, coll, id));
      toast.success("Deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete.");
    }
  };

  return (
    <div className="space-y-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-heading font-bold">Admin Dashboard</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={seedData}>Seed Demo Data</Button>
          <Badge variant="secondary" className="flex items-center">
            <Users className="w-3 h-3 mr-1" /> {users.length} Users
          </Badge>
          <Badge variant="secondary" className="flex items-center">
            <Activity className="w-3 h-3 mr-1" /> {attendance.length} Records
          </Badge>
        </div>
      </div>

      <GeminiGuidance />

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="bookings"><Calendar className="w-4 h-4 mr-2" /> Bookings</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" /> Users</TabsTrigger>
          <TabsTrigger value="worksheet"><FileSpreadsheet className="w-4 h-4 mr-2" /> Worksheet</TabsTrigger>
          <TabsTrigger value="rooms"><MapPin className="w-4 h-4 mr-2" /> Rooms</TabsTrigger>
          <TabsTrigger value="media"><Video className="w-4 h-4 mr-2" /> Media</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Booking Requests</CardTitle>
              <CardDescription>Approve or reject room booking requests from the congregation.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.userName}</TableCell>
                      <TableCell>{booking.roomName}</TableCell>
                      <TableCell>{format(new Date(booking.startTime), "MMM d, p")}</TableCell>
                      <TableCell>{booking.purpose}</TableCell>
                      <TableCell>
                        <Badge variant={booking.status === 'approved' ? 'default' : booking.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {booking.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleBookingAction(booking.id, 'approved')}>
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleBookingAction(booking.id, 'rejected')}>
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDelete('bookings', booking.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user roles and permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select value={user.role} onValueChange={(val) => handleUpdateUserRole(user.uid, val)}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="congregation">Congregation</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleDelete('users', user.uid)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="worksheet">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Roll Call Worksheet</CardTitle>
                <CardDescription>Mapping of last 4 digits to member names.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Last 4 Digits</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {worksheet.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono font-bold">{entry.lastFourDigits}</TableCell>
                        <TableCell>{entry.name}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => handleDelete('worksheet', entry.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={newWorksheet.name} onChange={(e) => setNewWorksheet({...newWorksheet, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Last 4 Digits</Label>
                  <Input maxLength={4} value={newWorksheet.lastFourDigits} onChange={(e) => setNewWorksheet({...newWorksheet, lastFourDigits: e.target.value})} />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleAddWorksheet}>Add to Worksheet</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rooms">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Manage Rooms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rooms.map((room) => (
                    <Card key={room.id} className="relative group">
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg">{room.name}</CardTitle>
                        <CardDescription>Capacity: {room.capacity}</CardDescription>
                      </CardHeader>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete('rooms', room.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Room</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={newRoom.name} onChange={(e) => setNewRoom({...newRoom, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input type="number" value={newRoom.capacity} onChange={(e) => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={newRoom.description} onChange={(e) => setNewRoom({...newRoom, description: e.target.value})} />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleAddRoom}>Create Room</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="media">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Media Library</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {media.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => handleDelete('media', item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={newMedia.title} onChange={(e) => setNewMedia({...newMedia, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newMedia.type} onValueChange={(val) => setNewMedia({...newMedia, type: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={newMedia.url} onChange={(e) => setNewMedia({...newMedia, url: e.target.value})} />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleAddMedia}>Add Media</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
