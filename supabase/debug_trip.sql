-- 检查 trips 表中是否存在该 ID
SELECT id, destination, user_id, status, created_at 
FROM trips 
WHERE id = '90a0db4b-332a-4fa3-96da-21f6d34c0c9f';

-- 检查所有 trips
SELECT id, destination, user_id, status, created_at 
FROM trips 
ORDER BY created_at DESC 
LIMIT 10;

-- 检查 profiles 表
SELECT id, name, email 
FROM profiles 
LIMIT 5;
