import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, Booking, Room, MediaItem, WorksheetEntry, AttendanceRecord } from '../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Check, X, Trash2, Plus, Users, Calendar, Video, FileSpreadsheet, Activity, MapPin, Home, Play, Music, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

import { GeminiGuidance } from './GeminiGuidance';

export const AdminView: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [worksheet, setWorksheet] = useState<WorksheetEntry[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const seedData = async () => {
    try {
      // Seed Rooms
      const { error: roomsError } = await supabase.from('rooms').insert([
        { name: '聖殿', capacity: 500, description: '配備高端音響的主要敬拜大廳。', image_url: 'https://picsum.photos/seed/sanctuary/800/600' },
        { name: '青年廳', capacity: 100, description: '充滿活力的青年活動空間。', image_url: 'https://picsum.photos/seed/youth/800/600' },
        { name: '會議室 A', capacity: 20, description: '適合小組聚會的安靜空間。', image_url: 'https://picsum.photos/seed/meeting/800/600' },
      ]);
      if (roomsError) throw roomsError;

      // Seed Media
      const { error: mediaError } = await supabase.from('media').insert([
        { title: '主日崇拜 - 盼望', type: 'video', url: 'https://example.com/video1', description: '一篇關於在困境中尋找盼望的有力信息。', category: '講道', created_at: new Date().toISOString() },
        { title: '敬拜組曲 - 晨恩', type: 'audio', url: 'https://example.com/audio1', description: '詩班的早晨敬拜聚會。', category: '敬拜', created_at: new Date().toISOString() },
      ]);
      if (mediaError) throw mediaError;

      // Seed Worksheet
      const { error: worksheetError } = await supabase.from('worksheet').insert([
        { name: '張三', last_four_digits: '1234' },
        { name: '李四', last_four_digits: '5678' },
        { name: '王五', last_four_digits: '9012' },
      ]);
      if (worksheetError) throw worksheetError;

      toast.success("範例資料已成功建立！");
    } catch (error) {
      console.error("Seed error:", error);
      toast.error("建立範例資料失敗。");
    }
  };

  // Section content
  const [worshipItems, setWorshipItems] = useState<MediaItem[]>([]);
  const [devotionItems, setDevotionItems] = useState<MediaItem[]>([]);
  const [rollCallItems, setRollCallItems] = useState<MediaItem[]>([]);

  // Form states
  const [newRoom, setNewRoom] = useState({ name: '', capacity: 0, description: '', image_url: '' });
  const [newMedia, setNewMedia] = useState({ title: '', type: 'video' as any, url: '', description: '', category: '' });
  const [newWorksheet, setNewWorksheet] = useState({ name: '', last_four_digits: '' });
  const [newWorship, setNewWorship] = useState({ title: '', url: '', description: '' });
  const [newDevotion, setNewDevotion] = useState({ title: '', url: '', description: '' });
  const [newRollCall, setNewRollCall] = useState({ title: '', url: '', description: '' });

  useEffect(() => {
    // Fetch initial data for all tables
    const fetchAll = async () => {
      const [usersRes, bookingsRes, roomsRes, mediaRes, worksheetRes, attendanceRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('bookings').select('*'),
        supabase.from('rooms').select('*'),
        supabase.from('media').select('*'),
        supabase.from('worksheet').select('*'),
        supabase.from('attendance').select('*'),
      ]);
      if (usersRes.data) setUsers(usersRes.data as UserProfile[]);
      if (bookingsRes.data) setBookings(bookingsRes.data as Booking[]);
      if (roomsRes.data) setRooms(roomsRes.data as Room[]);
      if (mediaRes.data) setMedia(mediaRes.data as MediaItem[]);
      if (worksheetRes.data) setWorksheet(worksheetRes.data as WorksheetEntry[]);
      if (attendanceRes.data) setAttendance(attendanceRes.data as AttendanceRecord[]);
    };
    fetchAll();

    // Fetch section content
    const fetchSections = async () => {
      const [worshipRes, devotionRes, rollCallRes] = await Promise.all([
        supabase.from('media').select('*').eq('category', 'worship_youtube'),
        supabase.from('media').select('*').eq('category', 'devotion'),
        supabase.from('media').select('*').eq('category', 'roll_call'),
      ]);
      if (worshipRes.data) setWorshipItems(worshipRes.data as MediaItem[]);
      if (devotionRes.data) setDevotionItems(devotionRes.data as MediaItem[]);
      if (rollCallRes.data) setRollCallItems(rollCallRes.data as MediaItem[]);
    };
    fetchSections();

    // Real-time subscriptions for all tables
    const channels = [
      { name: 'admin-users', table: 'users', setter: setUsers },
      { name: 'admin-bookings', table: 'bookings', setter: setBookings },
      { name: 'admin-rooms', table: 'rooms', setter: setRooms },
      { name: 'admin-media', table: 'media', setter: (data: any) => {
        setMedia(data);
        // Also refresh section content
        supabase.from('media').select('*').eq('category', 'worship_youtube').then(({ data: d }) => { if (d) setWorshipItems(d as MediaItem[]); });
        supabase.from('media').select('*').eq('category', 'devotion').then(({ data: d }) => { if (d) setDevotionItems(d as MediaItem[]); });
        supabase.from('media').select('*').eq('category', 'roll_call').then(({ data: d }) => { if (d) setRollCallItems(d as MediaItem[]); });
      } },
      { name: 'admin-worksheet', table: 'worksheet', setter: setWorksheet },
      { name: 'admin-attendance', table: 'attendance', setter: setAttendance },
    ].map(({ name, table, setter }) =>
      supabase
        .channel(name)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          supabase.from(table).select('*').then(({ data }) => {
            if (data) setter(data as any);
          });
        })
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, []);

  const handleUpdateUserRole = async (uid: string, role: string) => {
    try {
      const { error } = await supabase.from('users').update({ role }).eq('uid', uid);
      if (error) throw error;
      toast.success("使用者角色已更新。");
    } catch (error) {
      toast.error("更新角色失敗。");
    }
  };

  const handleBookingAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
      if (error) throw error;
      toast.success(`預約已${status === 'approved' ? '核准' : '拒絕'}。`);
    } catch (error) {
      toast.error("更新預約失敗。");
    }
  };

  const handleAddRoom = async () => {
    try {
      const { error } = await supabase.from('rooms').insert(newRoom);
      if (error) throw error;
      toast.success("場地已新增。");
      setNewRoom({ name: '', capacity: 0, description: '', image_url: '' });
    } catch (error) {
      toast.error("新增場地失敗。");
    }
  };

  const handleAddMedia = async () => {
    try {
      const { error } = await supabase.from('media').insert({ ...newMedia, created_at: new Date().toISOString() });
      if (error) throw error;
      toast.success("媒體已新增。");
      setNewMedia({ title: '', type: 'video', url: '', description: '', category: '' });
    } catch (error) {
      toast.error("新增媒體失敗。");
    }
  };

  const handleAddSectionItem = async (category: string, item: { title: string; url: string; description: string }, resetFn: () => void) => {
    if (!item.title || !item.url) {
      toast.error("請填寫標題和網址。");
      return;
    }
    try {
      const { error } = await supabase.from('media').insert({
        title: item.title,
        type: 'video',
        url: item.url,
        description: item.description,
        category,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("內容已新增。");
      resetFn();
    } catch (error) {
      toast.error("新增內容失敗。");
    }
  };

  const handleAddWorksheet = async () => {
    try {
      const { error } = await supabase.from('worksheet').insert(newWorksheet);
      if (error) throw error;
      toast.success("工作表項目已新增。");
      setNewWorksheet({ name: '', last_four_digits: '' });
    } catch (error) {
      toast.error("新增工作表項目失敗。");
    }
  };

  const handleDelete = async (table: string, id: string) => {
    if (!confirm("確定要刪除此項目嗎？")) return;
    try {
      const column = table === 'users' ? 'uid' : 'id';
      const { error } = await supabase.from(table).delete().eq(column, id);
      if (error) throw error;
      toast.success("已成功刪除。");
    } catch (error) {
      toast.error("刪除失敗。");
    }
  };

  return (
    <div className="space-y-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-heading font-bold">管理儀表板</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={seedData}>建立範例資料</Button>
          <Badge variant="secondary" className="flex items-center">
            <Users className="w-3 h-3 mr-1" /> {users.length} 位使用者
          </Badge>
          <Badge variant="secondary" className="flex items-center">
            <Activity className="w-3 h-3 mr-1" /> {attendance.length} 筆記錄
          </Badge>
        </div>
      </div>

      <GeminiGuidance />

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-8">
          <TabsTrigger value="homepage"><Home className="w-4 h-4 mr-2" /> 首頁內容</TabsTrigger>
          <TabsTrigger value="bookings"><Calendar className="w-4 h-4 mr-2" /> 預約</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" /> 使用者</TabsTrigger>
          <TabsTrigger value="worksheet"><FileSpreadsheet className="w-4 h-4 mr-2" /> 工作表</TabsTrigger>
          <TabsTrigger value="rooms"><MapPin className="w-4 h-4 mr-2" /> 場地</TabsTrigger>
          <TabsTrigger value="media"><Video className="w-4 h-4 mr-2" /> 媒體</TabsTrigger>
        </TabsList>

        <TabsContent value="homepage">
          <div className="space-y-8">
            {/* 崇拜YouTube Section */}
            {(() => {
              const now = new Date();
              const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
              const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

              const currentWeekItem = worshipItems.find((item) => {
                if (!item.created_at) return false;
                const created = parseISO(item.created_at);
                return isWithinInterval(created, { start: weekStart, end: weekEnd });
              });

              const archiveItems = worshipItems
                .filter((item) => {
                  if (!item.created_at) return true;
                  const created = parseISO(item.created_at);
                  return !isWithinInterval(created, { start: weekStart, end: weekEnd });
                })
                .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="w-5 h-5 text-primary" />
                      崇拜YouTube
                    </CardTitle>
                    <CardDescription>
                      管理每週崇拜 YouTube 影片。每週一自動將上週影片歸檔。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current Week */}
                    <div>
                      <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Badge className="bg-green-500">本週</Badge>
                        {format(weekStart, 'MM/dd')} — {format(weekEnd, 'MM/dd')}
                      </h4>
                      {currentWeekItem ? (
                        <Card className="border-green-500/50 bg-green-500/5">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="font-bold text-lg">{currentWeekItem.title}</p>
                              {currentWeekItem.description && (
                                <p className="text-sm text-muted-foreground">{currentWeekItem.description}</p>
                              )}
                              <a href={currentWeekItem.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                                {currentWeekItem.url}
                              </a>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete('media', currentWeekItem.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className="border-dashed">
                          <CardContent className="p-4">
                            <p className="text-muted-foreground text-sm mb-4">本週尚未設定崇拜 YouTube 影片。</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label>標題</Label>
                                <Input placeholder="例如：主日崇拜 04/15" value={newWorship.title} onChange={(e) => setNewWorship({...newWorship, title: e.target.value})} />
                              </div>
                              <div className="space-y-1">
                                <Label>YouTube 網址</Label>
                                <Input placeholder="https://youtube.com/..." value={newWorship.url} onChange={(e) => setNewWorship({...newWorship, url: e.target.value})} />
                              </div>
                              <div className="space-y-1">
                                <Label>描述（選填）</Label>
                                <div className="flex gap-2">
                                  <Input placeholder="選填" value={newWorship.description} onChange={(e) => setNewWorship({...newWorship, description: e.target.value})} />
                                  <Button onClick={() => handleAddSectionItem('worship_youtube', newWorship, () => setNewWorship({ title: '', url: '', description: '' }))}>
                                    設定本週
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Archive Table */}
                    <div>
                      <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Badge variant="secondary">歷史存檔</Badge>
                        共 {archiveItems.length} 筆
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>日期</TableHead>
                            <TableHead>標題</TableHead>
                            <TableHead>YouTube 網址</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {archiveItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm">{item.created_at ? format(parseISO(item.created_at), 'yyyy/MM/dd') : '—'}</TableCell>
                              <TableCell className="font-medium">{item.title}</TableCell>
                              <TableCell>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block max-w-[250px]">
                                  {item.url}
                                </a>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="ghost" onClick={() => handleDelete('media', item.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {archiveItems.length === 0 && (
                            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">尚無存檔記錄</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* 靈修日程 Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  靈修日程
                </CardTitle>
                <CardDescription>管理首頁「靈修日程」區塊的內容。</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>標題</TableHead>
                          <TableHead>網址</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {devotionItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{item.url}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => handleDelete('media', item.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {devotionItems.length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">尚無內容</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">新增靈修資源</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label>標題</Label>
                        <Input placeholder="例如：每日靈修 - 詩篇23篇" value={newDevotion.title} onChange={(e) => setNewDevotion({...newDevotion, title: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label>網址</Label>
                        <Input placeholder="https://..." value={newDevotion.url} onChange={(e) => setNewDevotion({...newDevotion, url: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label>描述</Label>
                        <Input placeholder="選填" value={newDevotion.description} onChange={(e) => setNewDevotion({...newDevotion, description: e.target.value})} />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" onClick={() => handleAddSectionItem('devotion', newDevotion, () => setNewDevotion({ title: '', url: '', description: '' }))}>
                        新增
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* 參與記名 Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  參與記名
                </CardTitle>
                <CardDescription>管理首頁「參與記名」區塊的內容。</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>標題</TableHead>
                          <TableHead>網址</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rollCallItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{item.url}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => handleDelete('media', item.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {rollCallItems.length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">尚無內容</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">新增參與記名資源</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label>標題</Label>
                        <Input placeholder="例如：本週服事表" value={newRollCall.title} onChange={(e) => setNewRollCall({...newRollCall, title: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label>網址</Label>
                        <Input placeholder="https://..." value={newRollCall.url} onChange={(e) => setNewRollCall({...newRollCall, url: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label>描述</Label>
                        <Input placeholder="選填" value={newRollCall.description} onChange={(e) => setNewRollCall({...newRollCall, description: e.target.value})} />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" onClick={() => handleAddSectionItem('roll_call', newRollCall, () => setNewRollCall({ title: '', url: '', description: '' }))}>
                        新增
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>預約申請</CardTitle>
              <CardDescription>核准或拒絕會眾的場地預約申請。</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>使用者</TableHead>
                    <TableHead>場地</TableHead>
                    <TableHead>日期/時間</TableHead>
                    <TableHead>用途</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.user_name}</TableCell>
                      <TableCell>{booking.room_name}</TableCell>
                      <TableCell>{format(new Date(booking.start_time), "MMM d, p")}</TableCell>
                      <TableCell>{booking.purpose}</TableCell>
                      <TableCell>
                        <Badge variant={booking.status === 'approved' ? 'default' : booking.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {booking.status === 'approved' ? '已核准' : booking.status === 'rejected' ? '已拒絕' : '待審核'}
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
              <CardTitle>使用者管理</CardTitle>
              <CardDescription>管理使用者角色與權限。</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>電子郵件</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead className="text-right">操作</TableHead>
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
                            <SelectItem value="public">公開</SelectItem>
                            <SelectItem value="congregation">會眾</SelectItem>
                            <SelectItem value="admin">管理員</SelectItem>
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
                <CardTitle>點名工作表</CardTitle>
                <CardDescription>末 4 碼與會友姓名的對照表。</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>末 4 碼</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {worksheet.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono font-bold">{entry.last_four_digits}</TableCell>
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
                <CardTitle>新增項目</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>姓名</Label>
                  <Input value={newWorksheet.name} onChange={(e) => setNewWorksheet({...newWorksheet, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>末 4 碼</Label>
                  <Input maxLength={4} value={newWorksheet.last_four_digits} onChange={(e) => setNewWorksheet({...newWorksheet, last_four_digits: e.target.value})} />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleAddWorksheet}>新增至工作表</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rooms">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>管理場地</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rooms.map((room) => (
                    <Card key={room.id} className="relative group">
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg">{room.name}</CardTitle>
                        <CardDescription>容量：{room.capacity}</CardDescription>
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
                <CardTitle>新增場地</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>名稱</Label>
                  <Input value={newRoom.name} onChange={(e) => setNewRoom({...newRoom, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>容量</Label>
                  <Input type="number" value={newRoom.capacity} onChange={(e) => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Input value={newRoom.description} onChange={(e) => setNewRoom({...newRoom, description: e.target.value})} />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleAddRoom}>建立場地</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="media">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>媒體庫</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>標題</TableHead>
                      <TableHead>類型</TableHead>
                      <TableHead className="text-right">操作</TableHead>
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
                <CardTitle>新增媒體</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>標題</Label>
                  <Input value={newMedia.title} onChange={(e) => setNewMedia({...newMedia, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>類型</Label>
                  <Select value={newMedia.type} onValueChange={(val) => setNewMedia({...newMedia, type: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">影片</SelectItem>
                      <SelectItem value="audio">音訊</SelectItem>
                      <SelectItem value="image">圖片</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>網址</Label>
                  <Input value={newMedia.url} onChange={(e) => setNewMedia({...newMedia, url: e.target.value})} />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleAddMedia}>新增媒體</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
