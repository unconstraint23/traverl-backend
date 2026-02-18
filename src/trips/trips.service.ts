import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.module';
import { CreateTripDto } from './dto/create-trip.dto';

@Injectable()
export class TripsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async create(userId: string, dto: CreateTripDto) {
    // Generate a mock AI itinerary based on the input
    const itineraryData = this.generateMockItinerary(dto);

    const title = dto.title || `${dto.destination}: A ${dto.duration}-Day ${dto.vibe} Trip`;
    const description = `An AI-curated ${dto.duration}-day ${dto.budget.toLowerCase()} ${dto.vibe.toLowerCase()} trip to ${dto.destination}. Crafted to match your travel style.`;

    const { data, error } = await this.supabase
      .from('trips')
      .insert({
        user_id: userId,
        destination: dto.destination,
        duration: dto.duration,
        budget: dto.budget,
        vibe: dto.vibe,
        title,
        description,
        cover_image: `https://source.unsplash.com/800x600/?${encodeURIComponent(dto.destination)},travel`,
        itinerary_data: itineraryData,
        status: 'generated',
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async findAllByUser(userId: string) {
    const { data, error } = await this.supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .from('trips')
      .select(`
        *,
        profiles:user_id (id, name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Trip not found');
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('trips')
      .select(`
        *,
        profiles:user_id (id, name, avatar_url)
      `)
      .eq('status', 'generated')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  }

  private generateMockItinerary(dto: CreateTripDto) {
    const days = [];
    for (let i = 1; i <= dto.duration; i++) {
      days.push({
        day: i,
        title: `Day ${i} in ${dto.destination}`,
        time_range: '09:00 AM - 06:00 PM',
        activities: [
          {
            name: `Explore ${dto.destination} - Activity ${i}`,
            description: `A curated ${dto.vibe.toLowerCase()} experience for your ${dto.budget.toLowerCase()} budget trip.`,
            image: `https://source.unsplash.com/400x300/?${encodeURIComponent(dto.destination)},day${i}`,
          },
        ],
      });
    }
    return { days };
  }
}
