import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.module';

@Injectable()
export class FavoritesService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async add(userId: string, tripId: string) {
    // Check if already favorited
    const { data: existing } = await this.supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('trip_id', tripId)
      .single();

    if (existing) {
      return { message: 'Already favorited' };
    }

    const { data, error } = await this.supabase
      .from('favorites')
      .insert({ user_id: userId, trip_id: tripId })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async remove(userId: string, tripId: string) {
    const { error } = await this.supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('trip_id', tripId);

    if (error) throw error;
    return { message: 'Removed from favorites' };
  }

  async list(userId: string) {
    const { data, error } = await this.supabase
      .from('favorites')
      .select(`
        *,
        trips:trip_id (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async isFavorited(userId: string, tripId: string) {
    const { data } = await this.supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('trip_id', tripId)
      .single();

    return { favorited: !!data };
  }
}
