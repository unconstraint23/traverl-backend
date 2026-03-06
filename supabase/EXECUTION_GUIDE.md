# 数据库优化执行指南

## 概述

采用**方案 A（统一数据源）**，删除 `destinations` 和 `categories` 表，统一使用 `trips` 表作为数据源。

## 执行步骤

### 步骤 1：备份数据（重要！）

在执行任何删除操作前，先备份数据：

```sql
-- 备份 destinations 表（如果需要保留数据）
CREATE TABLE destinations_backup AS SELECT * FROM destinations;

-- 备份 categories 表（如果需要保留数据）
CREATE TABLE categories_backup AS SELECT * FROM categories;
```

### 步骤 2：执行 SQL 文件

按以下顺序在 Supabase SQL Editor 中执行：

#### 2.1 删除不需要的表

执行文件：`supabase/drop_unused_tables.sql`

```bash
# 这个文件会删除：
# - destinations 表及其索引和 RLS 策略
# - categories 表及其 RLS 策略
```

#### 2.2 添加优化索引

执行文件：`supabase/add_indexes.sql`

```bash
# 这个文件会为 trips 表添加以下索引：
# - idx_trips_destination (按目的地查询)
# - idx_trips_status (按状态过滤)
# - idx_trips_created_at (按时间排序)
# - idx_trips_vibe (按分类查询)
# - idx_trips_status_created (组合索引，提升性能)
# - idx_comments_user_id (查询用户评论)
```

### 步骤 3：重启后端服务

```bash
# 停止当前服务（Ctrl+C）
# 然后重新启动
npm run start:dev
```

### 步骤 4：验证功能

测试以下接口确保正常工作：

```bash
# 1. 获取 trending 目的地
curl http://localhost:3001/destinations/trending

# 2. 获取分类列表
curl http://localhost:3001/destinations/categories

# 3. 搜索目的地
curl http://localhost:3001/destinations/search?q=东京

# 4. 获取特定行程详情（使用 trending 返回的 ID）
curl http://localhost:3001/trips/{trip_id}
```

## 代码变更说明

### 1. `destinations.service.ts` 优化

- **`getTrending()`**：只从 `trips` 表获取数据，按目的地去重
- **`getCategories()`**：从 `trips.vibe` 字段动态生成分类
- **`search()`**：直接搜索 `trips` 表
- **`findAll()`**：从 `trips` 表获取数据，支持按 `vibe` 过滤

### 2. `trips.service.ts` 清理

- 删除了 `syncDestination()` 方法
- 删除了创建 trip 后同步到 destinations 表的逻辑

## 优势

✅ **数据一致性**：单一数据源，不会出现 ID 不匹配问题  
✅ **简化维护**：减少表关联，降低复杂度  
✅ **提升性能**：添加了针对性索引，查询更快  
✅ **动态分类**：分类基于实际数据，自动更新  
✅ **减少存储**：删除冗余数据

## 回滚方案

如果需要回滚，执行以下步骤：

1. 恢复备份的表：
```sql
CREATE TABLE destinations AS SELECT * FROM destinations_backup;
CREATE TABLE categories AS SELECT * FROM categories_backup;
```

2. 恢复索引和 RLS 策略（参考 `migration.sql`）

3. 回滚代码到之前的版本

## 注意事项

⚠️ **执行前务必备份数据**  
⚠️ **在生产环境执行前，先在开发环境测试**  
⚠️ **确保前端代码兼容新的数据格式**  
⚠️ **删除表后无法恢复，请谨慎操作**

## 性能对比

### 优化前
- 查询 trending：需要关联 `destinations` 和 `trips` 两个表
- 查询分类：需要查询 `categories` 表
- 数据不一致：`destinations` 表的 ID 与 `trips` 表不匹配

### 优化后
- 查询 trending：只查询 `trips` 表，使用索引优化
- 查询分类：动态生成，基于实际数据
- 数据一致：所有 ID 都来自 `trips` 表，100% 匹配

## 监控建议

优化后，建议监控以下指标：

1. **查询性能**：`getTrending()` 的响应时间
2. **索引使用率**：确认新索引被正确使用
3. **错误率**：确保没有 404 错误
4. **数据准确性**：验证返回的数据格式正确

## 完成检查清单

- [ ] 备份 destinations 和 categories 表
- [ ] 执行 drop_unused_tables.sql
- [ ] 执行 add_indexes.sql
- [ ] 重启后端服务
- [ ] 测试 /destinations/trending 接口
- [ ] 测试 /destinations/categories 接口
- [ ] 测试 /destinations/search 接口
- [ ] 测试 /trips/:id 接口
- [ ] 验证前端功能正常
- [ ] 删除备份表（可选）
