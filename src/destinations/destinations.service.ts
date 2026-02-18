import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.module';

@Injectable()
export class DestinationsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findAll(category?: string) {
    let query = this.supabase
      .from('destinations')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getTrending() {
    const { data, error } = await this.supabase
      .from('destinations')
      .select('*')
      .eq('is_trending', true)
      .order('rating', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data;
  }

  async getCategories() {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  }

  async search(query: string) {
    const { data, error } = await this.supabase
      .from('destinations')
      .select('*')
      .or(`name.ilike.%${query}%,location.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    return data;
  }
}
