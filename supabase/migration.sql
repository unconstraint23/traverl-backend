-- =====================================================
-- TravelAI Database Schema Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Profiles table (renamed from 'users' to avoid conflict with Supabase auth.users)
-- Stores profile data for ALL users (email auth + third-party auth)
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

-- Unique constraint: one user per provider + provider_user_id combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_provider_unique
  ON profiles(auth_provider, provider_user_id);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- Destinations table
CREATE TABLE IF NOT EXISTS destinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  image_url TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  category VARCHAR(100),
  height INTEGER DEFAULT 200,
  is_trending BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trips table
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

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trip_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Places cache table (Foursquare POI data)
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

-- Itinerary cache table (DeepSeek AI generated)
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
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_provider ON profiles(auth_provider);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);
CREATE INDEX IF NOT EXISTS idx_destinations_trending ON destinations(is_trending);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_trip_id ON favorites(trip_id);
CREATE INDEX IF NOT EXISTS idx_comments_trip_id ON comments(trip_id);
CREATE INDEX IF NOT EXISTS idx_places_cache_city ON places_cache(city);
CREATE INDEX IF NOT EXISTS idx_places_cache_expires ON places_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_itinerary_cache_key ON itinerary_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_itinerary_cache_expires ON itinerary_cache(expires_at);

-- =====================================================
-- SEED DATA
-- =====================================================

-- Categories
INSERT INTO categories (name, icon, sort_order) VALUES
  ('Trending', 'local-fire-department', 1),
  ('Beaches', 'beach-access', 2),
  ('Nature', 'hiking', 3),
  ('Food', 'restaurant', 4),
  ('Culture', 'museum', 5),
  ('Adventure', 'terrain', 6)
ON CONFLICT (name) DO NOTHING;

-- Destinations: 不再使用静态种子数据
-- 目的地记录会在创建 trip 时自动同步到 destinations 表
-- 参见 TripsService.syncDestination()

-- Demo user (password: Test123!) — email auth via Supabase
-- Note: In production, this user should be created via supabase.auth.signUp first,
-- then a profile record is created here. For dev seed, we insert directly.
INSERT INTO profiles (email, password_hash, name, avatar_url, bio, auth_provider, provider_user_id) VALUES
  ('alex@travelai.com', '$2b$10$YourHashedPasswordHere', 'Alex Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop', 'Travel Enthusiast', 'email', 'seed-demo-user')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (Optional - for production)
-- =====================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE places_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_cache ENABLE ROW LEVEL SECURITY;

-- Drop old policies (from previous migration that used 'users' table name)
DROP POLICY IF EXISTS "Service role has full access to users" ON profiles;
DROP POLICY IF EXISTS "Service role has full access to categories" ON categories;
DROP POLICY IF EXISTS "Service role has full access to destinations" ON destinations;
DROP POLICY IF EXISTS "Service role has full access to trips" ON trips;
DROP POLICY IF EXISTS "Service role has full access to favorites" ON favorites;
DROP POLICY IF EXISTS "Service role has full access to comments" ON comments;

-- Drop new policies if they already exist (for idempotent re-runs)
DROP POLICY IF EXISTS "Service role has full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Service role has full access to places_cache" ON places_cache;
DROP POLICY IF EXISTS "Service role has full access to itinerary_cache" ON itinerary_cache;

-- Allow all operations for service_role (used by backend)
CREATE POLICY "Service role has full access to profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to destinations" ON destinations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to trips" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to favorites" ON favorites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to comments" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to places_cache" ON places_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to itinerary_cache" ON itinerary_cache FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- FIX: Foreign key constraints (users → profiles)
-- Run this in Supabase SQL Editor if tables already exist
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
