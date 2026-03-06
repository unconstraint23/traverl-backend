-- =====================================================
-- 优化方案：删除 destinations 表和 categories 表
-- 原因：采用方案 A，统一使用 trips 表作为数据源
-- 执行时间：2026-03-06
-- =====================================================

-- 1. 删除 destinations 表相关的 RLS 策略
DROP POLICY IF EXISTS "Service role has full access to destinations" ON destinations;

-- 2. 删除 destinations 表的索引
DROP INDEX IF EXISTS idx_destinations_category;
DROP INDEX IF EXISTS idx_destinations_trending;

-- 3. 删除 destinations 表
DROP TABLE IF EXISTS destinations CASCADE;

-- 4. 删除 categories 表相关的 RLS 策略
DROP POLICY IF EXISTS "Service role has full access to categories" ON categories;

-- 5. 删除 categories 表
DROP TABLE IF EXISTS categories CASCADE;

-- =====================================================
-- 说明：
-- - destinations 表已被废弃，所有目的地数据直接从 trips 表获取
-- - categories 表也不再需要，分类功能可以通过 trips.vibe 字段实现
-- - 这样可以简化数据结构，避免数据不一致的问题
-- =====================================================
