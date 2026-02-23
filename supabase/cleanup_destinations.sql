-- =====================================================
-- Destinations 表数据清理 & 图片修复脚本
-- 在 Supabase SQL Editor 中运行
-- =====================================================

-- 1. 删除所有旧的种子数据（非 trips 同步的假数据）
DELETE FROM destinations;

-- 2. 修复 trips 表中已损坏的 source.unsplash.com 封面图链接
-- 默认旅行封面图（用于无法匹配的目的地）
UPDATE trips
SET cover_image = CASE
  WHEN LOWER(destination) IN ('东京', 'tokyo')
    THEN 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1920&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('京都', 'kyoto')
    THEN 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('巴黎', 'paris')
    THEN 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2073&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('伦敦', 'london')
    THEN 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1920&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('巴厘岛', 'bali')
    THEN 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=2038&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('纽约', 'new york')
    THEN 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1920&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('罗马', 'rome')
    THEN 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1920&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('曼谷', 'bangkok')
    THEN 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=1920&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('新加坡', 'singapore')
    THEN 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?q=80&w=1920&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('首尔', 'seoul')
    THEN 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?q=80&w=1920&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('北京', 'beijing')
    THEN 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=1920&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('上海', 'shanghai')
    THEN 'https://images.unsplash.com/photo-1537531383496-f4749b90c650?q=80&w=1920&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('香港', 'hong kong')
    THEN 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?q=80&w=1920&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('圣托里尼', 'santorini')
    THEN 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1929&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('瑞士', 'switzerland', 'swiss alps')
    THEN 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=2070&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('迪拜', 'dubai')
    THEN 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1920&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('悉尼', 'sydney')
    THEN 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=1920&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('巴塞罗那', 'barcelona')
    THEN 'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=1920&auto=format&fit=crop'
  WHEN LOWER(destination) IN ('马丘比丘', 'machu picchu')
    THEN 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?q=80&w=2076&auto=format&fit=crop'
  ELSE 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1920&auto=format&fit=crop'
END
WHERE cover_image LIKE '%source.unsplash.com%';

-- 3. 从已修复的 trips 表中重新同步目的地到 destinations 表
INSERT INTO destinations (name, location, image_url, rating, category, height, is_trending)
SELECT DISTINCT ON (LOWER(destination))
  destination AS name,
  destination AS location,
  cover_image AS image_url,
  4.5 AS rating,
  'Trending' AS category,
  200 AS height,
  TRUE AS is_trending
FROM trips
WHERE status = 'generated'
ORDER BY LOWER(destination), created_at DESC;
