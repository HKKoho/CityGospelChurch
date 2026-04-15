import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MediaItem, Room } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Play, Music, Image as ImageIcon, MapPin, Users } from 'lucide-react';
import { motion } from 'motion/react';

import { GeminiGuidance } from './GeminiGuidance';

export const PublicView: React.FC = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    // Fetch initial data
    const fetchData = async () => {
      const [mediaRes, roomsRes] = await Promise.all([
        supabase.from('media').select('*').limit(6),
        supabase.from('rooms').select('*').limit(4),
      ]);
      if (mediaRes.data) setMedia(mediaRes.data as MediaItem[]);
      if (roomsRes.data) setRooms(roomsRes.data as Room[]);
    };
    fetchData();

    // Subscribe to real-time changes
    const mediaChannel = supabase
      .channel('public-media')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, () => {
        supabase.from('media').select('*').limit(6).then(({ data }) => {
          if (data) setMedia(data as MediaItem[]);
        });
      })
      .subscribe();

    const roomsChannel = supabase
      .channel('public-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        supabase.from('rooms').select('*').limit(4).then(({ data }) => {
          if (data) setRooms(data as Room[]);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(mediaChannel);
      supabase.removeChannel(roomsChannel);
    };
  }, []);

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
            Welcome to <span className="text-primary">Ecclesia</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A contemporary space for community, worship, and growth.
            Explore our media library and book spaces for your gatherings.
          </p>
        </motion.div>
      </section>

      {/* Media Highlights */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold">Latest Media</h2>
            <p className="text-muted-foreground">Sermons, worship sessions, and community highlights.</p>
          </div>
          <Badge variant="outline" className="px-4 py-1">View All</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {media.length > 0 ? media.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-all group">
                <div className="relative aspect-video bg-muted">
                  <img
                    src={item.type === 'video' ? `https://picsum.photos/seed/${item.id}/800/450` : item.url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                    {item.type === 'video' && <Play className="w-12 h-12 text-white fill-white" />}
                    {item.type === 'audio' && <Music className="w-12 h-12 text-white" />}
                  </div>
                </div>
                <CardHeader className="p-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <Badge variant="secondary" className="text-[10px] uppercase">{item.type}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          )) : (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
            ))
          )}
        </div>
      </section>

      {/* Room Showcase */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold">Our Spaces</h2>
            <p className="text-muted-foreground">Beautiful rooms available for bookings and events.</p>
          </div>
        </div>

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
                    <span>Up to {room.capacity} people</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-primary" />
                    <span>Main Campus</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="pt-12">
        <GeminiGuidance />
      </section>
    </div>
  );
};
