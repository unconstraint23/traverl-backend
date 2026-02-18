-- =====================================================
-- TravelAI Database Schema Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trip_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);
CREATE INDEX IF NOT EXISTS idx_destinations_trending ON destinations(is_trending);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_trip_id ON favorites(trip_id);
CREATE INDEX IF NOT EXISTS idx_comments_trip_id ON comments(trip_id);

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

-- Destinations
INSERT INTO destinations (name, location, image_url, rating, category, height, is_trending) VALUES
  ('Kyoto', 'Japan', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop', 4.8, 'Culture', 250, TRUE),
  ('Santorini', 'Greece', 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1929&auto=format&fit=crop', 4.9, 'Beaches', 200, TRUE),
  ('Banff', 'Canada', 'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?q=80&w=2070&auto=format&fit=crop', 4.7, 'Nature', 200, TRUE),
  ('Cinque Terre', 'Italy', 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1886&auto=format&fit=crop', 4.6, 'Culture', 250, TRUE),
  ('Bali', 'Indonesia', 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=2038&auto=format&fit=crop', 4.8, 'Beaches', 220, TRUE),
  ('Swiss Alps', 'Switzerland', 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=2070&auto=format&fit=crop', 4.9, 'Nature', 240, TRUE),
  ('Marrakech', 'Morocco', 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?q=80&w=2073&auto=format&fit=crop', 4.5, 'Food', 200, FALSE),
  ('Machu Picchu', 'Peru', 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?q=80&w=2076&auto=format&fit=crop', 4.9, 'Adventure', 230, TRUE)
ON CONFLICT DO NOTHING;

-- Demo user (password: Test123!)
INSERT INTO users (email, password_hash, name, avatar_url, bio) VALUES
  ('alex@travelai.com', '$2b$10$YourHashedPasswordHere', 'Alex Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop', 'Travel Enthusiast')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (Optional - for production)
-- =====================================================

-- Disable RLS for development (Supabase enables it by default on new tables)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service_role (used by backend)
CREATE POLICY "Service role has full access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to destinations" ON destinations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to trips" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to favorites" ON favorites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to comments" ON comments FOR ALL USING (true) WITH CHECK (true);
