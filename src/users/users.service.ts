import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.module';

@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, email, name, avatar_url, bio, created_at')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateProfile(userId: string, updates: { name?: string; avatar_url?: string; bio?: string }) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, email, name, avatar_url, bio, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  async getStats(userId: string) {
    const { count: tripsCount } = await this.supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: favoritesCount } = await this.supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return {
      trips_planned: tripsCount || 0,
      favorites: favoritesCount || 0,
    };
  }
}
