-- =====================================================
-- 为 trips 表添加优化索引
-- 提升查询性能
-- =====================================================

-- 为 destination 字段添加索引（用于按目的地查询和去重）
CREATE INDEX IF NOT EXISTS idx_trips_destination ON trips(destination);

-- 为 status 字段添加索引（用于过滤状态）
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);

-- 为 created_at 字段添加降序索引（用于排序）
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC);

-- 为 vibe 字段添加索引（用于分类查询）
CREATE INDEX IF NOT EXISTS idx_trips_vibe ON trips(vibe);

-- 组合索引：status + created_at（用于获取已生成的行程列表）
CREATE INDEX IF NOT EXISTS idx_trips_status_created ON trips(status, created_at DESC);

-- 为 comments 表的 user_id 添加索引（用于查询用户评论）
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- =====================================================
-- 说明：
-- 这些索引会显著提升以下查询的性能：
-- 1. getTrending() - 按 status 过滤并按 created_at 排序
-- 2. findAll() - 按 vibe 分类查询
-- 3. search() - 按 destination 搜索
-- =====================================================
