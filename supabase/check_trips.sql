-- 检查特定 trip ID
SELECT * FROM trips WHERE id = '90a0db4b-332a-4fa3-96da-21f6d34c0c9f';

-- 检查所有 trips
SELECT id, destination, user_id, status FROM trips ORDER BY created_at DESC LIMIT 10;
