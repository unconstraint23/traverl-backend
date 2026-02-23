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
    // 1. 获取 destinations 表中标记为 trending 的数据
    const { data: trendingDestinations, error: destError } = await this.supabase
      .from('destinations')
      .select('*')
      .eq('is_trending', true)
      .order('rating', { ascending: false })
      .limit(10);

    if (destError) throw destError;

    // 去重：destinations 表可能有同名重复记录，只保留 rating 最高的
    const destMap = new Map<string, any>();
    for (const dest of trendingDestinations || []) {
      const key = dest.name.toLowerCase();
      if (!destMap.has(key)) {
        destMap.set(key, dest);
      }
    }
    const uniqueDestinations = [...destMap.values()];

    // 2. 从 trips 表中获取已生成的行程目的地
    const { data: tripDestinations, error: tripError } = await this.supabase
      .from('trips')
      .select('destination, cover_image, created_at')
      .eq('status', 'generated')
      .order('created_at', { ascending: false });

    if (tripError) throw tripError;

    // 3. 合并：将 trips 中独有的目的地转换为 trending 格式追加
    const existingNames = new Set(
      uniqueDestinations.map((d) => d.name.toLowerCase()),
    );
    const tripMap = new Map<string, any>();

    for (const trip of tripDestinations || []) {
      const key = trip.destination.toLowerCase();
      if (!existingNames.has(key) && !tripMap.has(key)) {
        tripMap.set(key, {
          id: `trip-${key}`,
          name: trip.destination,
          location: trip.destination,
          image_url: trip.cover_image,
          rating: 4.5,
          category: 'Trending',
          height: 200,
          is_trending: true,
          created_at: trip.created_at,
          source: 'trip',
        });
      }
    }

    return [...uniqueDestinations, ...tripMap.values()].slice(0, 10);
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
