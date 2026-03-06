import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.module';

@Injectable()
export class DestinationsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findAll(category?: string) {
    // 优化：直接从 trips 表获取数据，不再使用 destinations 表
    let query = this.supabase
      .from('trips')
      .select('id, destination, cover_image, created_at, title, description, vibe')
      .eq('status', 'generated')
      .order('created_at', { ascending: false });

    // 如果指定了 category，通过 vibe 字段过滤
    if (category && category !== 'Trending') {
      query = query.eq('vibe', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    // 转换为前端期望的格式
    return (data || []).map(trip => ({
      id: trip.id,
      name: trip.destination,
      location: trip.destination,
      image_url: trip.cover_image,
      rating: 4.5,
      category: trip.vibe || 'Trending',
      height: 200,
      is_trending: true,
      created_at: trip.created_at,
      trip_id: trip.id,
      source: 'trip',
    }));
  }

  async getTrending() {
    // 方案 A：统一使用 trips 表作为数据源
    // 这样可以确保返回的 ID 始终是有效的 trip ID
    const { data: trips, error } = await this.supabase
      .from('trips')
      .select('id, destination, cover_image, created_at, title, description')
      .eq('status', 'generated')
      .order('created_at', { ascending: false })
      .limit(50); // 多取一些，用于去重后保证有足够数据

    if (error) throw error;

    // 按目的地去重，每个目的地只保留最新的 trip
    const uniqueDestinations = new Map<string, any>();
    
    for (const trip of trips || []) {
      const key = trip.destination.toLowerCase().trim();
      
      // 如果该目的地还没有记录，则添加
      if (!uniqueDestinations.has(key)) {
        uniqueDestinations.set(key, {
          id: trip.id, // ✅ 使用真实的 trip ID
          name: trip.destination,
          location: trip.destination,
          image_url: trip.cover_image,
          rating: 4.5,
          category: 'Trending',
          height: 200,
          is_trending: true,
          created_at: trip.created_at,
          trip_id: trip.id,
          source: 'trip',
        });
      }
    }

    // 返回前 10 个唯一目的地
    return Array.from(uniqueDestinations.values()).slice(0, 10);
  }

  async getCategories() {
    // 优化：从 trips 表的 vibe 字段动态生成分类
    const { data, error } = await this.supabase
      .from('trips')
      .select('vibe')
      .eq('status', 'generated');

    if (error) throw error;

    // 统计每个 vibe 的数量
    const vibeCount = new Map<string, number>();
    for (const trip of data || []) {
      const vibe = trip.vibe || 'Trending';
      vibeCount.set(vibe, (vibeCount.get(vibe) || 0) + 1);
    }

    // 预定义的分类图标映射
    const iconMap: Record<string, string> = {
      'Trending': 'local-fire-department',
      'Relaxing': 'beach-access',
      'Adventure': 'terrain',
      'Cultural': 'museum',
      'Foodie': 'restaurant',
      'Nature': 'hiking',
      'Romantic': 'favorite',
      'Family': 'family-restroom',
    };

    // 转换为前端期望的格式
    const categories = Array.from(vibeCount.entries()).map(([vibe, count], index) => ({
      id: `vibe-${vibe.toLowerCase()}`,
      name: vibe,
      icon: iconMap[vibe] || 'place',
      sort_order: index + 1,
      count,
    }));

    // 确保 Trending 始终在第一位
    categories.sort((a, b) => {
      if (a.name === 'Trending') return -1;
      if (b.name === 'Trending') return 1;
      return b.count - a.count; // 按数量降序排列
    });

    return categories;
  }

  async search(query: string) {
    // 优化：直接从 trips 表搜索
    const { data, error } = await this.supabase
      .from('trips')
      .select('id, destination, cover_image, created_at, title, description, vibe')
      .eq('status', 'generated')
      .or(`destination.ilike.%${query}%,title.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;

    // 转换为前端期望的格式
    return (data || []).map(trip => ({
      id: trip.id,
      name: trip.destination,
      location: trip.destination,
      image_url: trip.cover_image,
      rating: 4.5,
      category: trip.vibe || 'Trending',
      height: 200,
      is_trending: true,
      created_at: trip.created_at,
      trip_id: trip.id,
      source: 'trip',
    }));
  }
}
