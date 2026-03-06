-- =====================================================
-- TravelAI 优化后的数据库 Schema
-- 采用方案 A：统一使用 trips 表作为数据源
-- 执行时间：2026-03-06
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 核心表
-- =====================================================

-- Profiles table (用户资料表)
-- 存储所有用户的资料数据（邮箱认证 + 第三方认证）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  auth_provider VARCHAR(50) NOT NULL DEFAULT 'email',
  provider_user_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 唯一约束：每个 provider + provider_user_id 组合只能有一个用户
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_provider_unique
  ON profiles(auth_provider, provider_user_id);

-- Trips table (行程表) - 核心数据源
-- 所有目的地数据都从这个表获取
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  destination VARCHAR(255) NOT NULL,
  duration INTEGER NOT NULL,
  budget VARCHAR(50) NOT NULL,
  vibe VARCHAR(50) NOT NULL,
  title VARCHAR(500),
  description TEXT,
  cover_image TEXT,
  itinerary_data JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'generated',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites table (收藏表)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trip_id)
);

-- Comments table (评论表)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 缓存表
-- =====================================================

-- Places cache table (Foursquare POI 数据缓存)
CREATE TABLE IF NOT EXISTS places_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fsq_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  category VARCHAR(100),
  rating DECIMAL(3,1),
  photos JSONB DEFAULT '[]',
  city VARCHAR(255),
  country VARCHAR(255),
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Itinerary cache table (DeepSeek AI 生成的行程缓存)
CREATE TABLE IF NOT EXISTS itinerary_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key VARCHAR(500) UNIQUE NOT NULL,
  destination VARCHAR(255) NOT NULL,
  duration INTEGER NOT NULL,
  budget VARCHAR(50) NOT NULL,
  vibe VARCHAR(50) NOT NULL,
  itinerary_data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 days'),
  hit_count INTEGER DEFAULT 0
);

-- =====================================================
-- 索引优化
-- =====================================================

-- Profiles 索引
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_provider ON profiles(auth_provider);

-- Trips 索引（核心表，需要优化查询性能）
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_destination ON trips(destination); -- 新增：用于按目的地查询
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status); -- 新增：用于过滤状态
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC); -- 新增：用于排序

-- Favorites 索引
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_trip_id ON favorites(trip_id);

-- Comments 索引
CREATE INDEX IF NOT EXISTS idx_comments_trip_id ON comments(trip_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id); -- 新增：用于查询用户评论

-- Cache 索引
CREATE INDEX IF NOT EXISTS idx_places_cache_city ON places_cache(city);
CREATE INDEX IF NOT EXISTS idx_places_cache_expires ON places_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_itinerary_cache_key ON itinerary_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_itinerary_cache_expires ON itinerary_cache(expires_at);

-- =====================================================
-- 种子数据
-- =====================================================

-- Demo user (password: Test123!)
INSERT INTO profiles (email, password_hash, name, avatar_url, bio, auth_provider, provider_user_id) VALUES
  ('alex@travelai.com', '$2b$10$YourHashedPasswordHere', 'Alex Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop', 'Travel Enthusiast', 'email', 'seed-demo-user')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 行级安全策略 (RLS)
-- =====================================================

-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE places_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_cache ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Service role has full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Service role has full access to trips" ON trips;
DROP POLICY IF EXISTS "Service role has full access to favorites" ON favorites;
DROP POLICY IF EXISTS "Service role has full access to comments" ON comments;
DROP POLICY IF EXISTS "Service role has full access to places_cache" ON places_cache;
DROP POLICY IF EXISTS "Service role has full access to itinerary_cache" ON itinerary_cache;

-- 创建新策略：允许 service_role 完全访问（后端使用）
CREATE POLICY "Service role has full access to profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to trips" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to favorites" ON favorites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to comments" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to places_cache" ON places_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to itinerary_cache" ON itinerary_cache FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 外键约束修复
-- =====================================================

ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_user_id_fkey;
ALTER TABLE trips ADD CONSTRAINT trips_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE favorites ADD CONSTRAINT favorites_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE comments ADD CONSTRAINT comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- =====================================================
-- 优化说明
-- =====================================================
-- 1. 删除了 destinations 表：所有目的地数据直接从 trips 表获取
-- 2. 删除了 categories 表：分类功能通过 trips.vibe 字段实现
-- 3. 新增了 trips 表的索引：destination, status, created_at
-- 4. 简化了数据结构，避免数据不一致问题
-- 5. 提升了查询性能，减少了表关联
