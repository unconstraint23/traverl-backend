import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.module';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findByTrip(tripId: string) {
    const { data, error } = await this.supabase
      .from('comments')
      .select(`
        *,
        users:user_id (id, name, avatar_url)
      `)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async create(userId: string, tripId: string, content: string) {
    const { data, error } = await this.supabase
      .from('comments')
      .insert({
        user_id: userId,
        trip_id: tripId,
        content,
        likes: 0,
      })
      .select(`
        *,
        users:user_id (id, name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  async getCount(tripId: string) {
    const { count, error } = await this.supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId);

    if (error) throw error;
    return { count: count || 0 };
  }
}
