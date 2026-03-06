# 数据库优化方案总结

## 问题回顾

前端从首页列表获取的 ID 无法与数据库中的 trip ID 匹配，导致查询详情时返回 404 错误。

**根本原因**：
- `destinations` 表返回的 ID 是 destination 的 UUID
- 前端用这个 ID 去查询 `/trips/:id`
- `trips` 表中不存在这个 ID，导致 404

## 解决方案：方案 A（统一数据源）

删除 `destinations` 和 `categories` 表，统一使用 `trips` 表作为唯一数据源。

## 需要执行的 SQL 文件

### 1. `supabase/drop_unused_tables.sql`
删除不再需要的表：
- destinations 表
- categories 表
- 相关的索引和 RLS 策略

### 2. `supabase/add_indexes.sql`
为 trips 表添加优化索引：
- `idx_trips_destination` - 按目的地查询
- `idx_trips_status` - 按状态过滤
- `idx_trips_created_at` - 按时间排序
- `idx_trips_vibe` - 按分类查询
- `idx_trips_status_created` - 组合索引
- `idx_comments_user_id` - 用户评论查询

## 代码变更

### 修改的文件

1. **`src/destinations/destinations.service.ts`**
   - `getTrending()` - 只从 trips 表获取，按目的地去重
   - `getCategories()` - 从 trips.vibe 动态生成分类
   - `search()` - 直接搜索 trips 表
   - `findAll()` - 从 trips 表获取，支持按 vibe 过滤

2. **`src/trips/trips.service.ts`**
   - 删除 `syncDestination()` 方法
   - 删除创建 trip 后的同步逻辑

3. **`src/trips/trips.controller.ts`**
   - 已添加 `NotFoundException` 导入（已完成）

## 执行步骤

1. **备份数据**（重要！）
   ```sql
   CREATE TABLE destinations_backup AS SELECT * FROM destinations;
   CREATE TABLE categories_backup AS SELECT * FROM categories;
   ```

2. **执行 SQL 文件**
   - 在 Supabase SQL Editor 中执行 `drop_unused_tables.sql`
   - 执行 `add_indexes.sql`

3. **重启服务**
   ```bash
   npm run start:dev
   ```

4. **测试验证**
   - 测试 `/destinations/trending`
   - 测试 `/destinations/categories`
   - 测试 `/destinations/search?q=东京`
   - 测试 `/trips/:id`（使用 trending 返回的 ID）

## 优势

✅ **解决 ID 匹配问题**：所有 ID 都来自 trips 表  
✅ **简化数据结构**：减少表关联，降低复杂度  
✅ **提升查询性能**：添加针对性索引  
✅ **动态分类**：基于实际数据自动生成  
✅ **减少维护成本**：单一数据源，易于维护  

## 参考文档

- `supabase/EXECUTION_GUIDE.md` - 详细执行指南
- `supabase/optimized_schema.sql` - 优化后的完整 schema（供参考）
- `SOLUTION.md` - 问题分析和解决方案详解

## 注意事项

⚠️ 执行前务必备份数据  
⚠️ 先在开发环境测试  
⚠️ 确保前端代码兼容  
⚠️ 删除表后无法恢复  

## 当前状态

✅ 代码已修改并编译成功  
✅ SQL 文件已准备就绪  
⏳ 等待执行 SQL 文件  
⏳ 等待重启服务并测试  
