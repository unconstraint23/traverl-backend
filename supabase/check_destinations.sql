-- 检查 destinations 表
SELECT id, name, location, is_trending FROM destinations ORDER BY created_at DESC LIMIT 10;

-- 检查是否有 ID 为 90a0db4b-332a-4fa3-96da-21f6d34c0c9f 的记录
SELECT * FROM destinations WHERE id = '90a0db4b-332a-4fa3-96da-21f6d34c0c9f';
