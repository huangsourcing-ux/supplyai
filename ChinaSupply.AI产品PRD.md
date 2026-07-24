# ChinaSupply.AI 产品需求文档（PRD）

> 版本：**v1.4 Frozen** ｜ Status: **Approved for Implementation** ｜ 日期：2026-07-24
> 用途：供 AI 编码代理（Codex 等）直接执行开发。需求以可验收的结构化条目编写。
> 技术栈：见《ChinaSupply.AI技术栈-最终冻结版.md》，本文档不重复选型讨论。
> 优先级定义：P0 = V1 必须；P1 = V1 后第一批迭代；P2 = 路线图。
> **冻结规则：本文档 V1 范围自此冻结。任何新需求只能进入第 10 节 P1/P2 路线图，不得修改 V1 范围。与实现冲突时先改文档再改代码，本文档是唯一事实源。**
>
> v1.1 变更摘要：明确 Drizzle 为唯一 Schema Owner（Payload 只管内容）；新增地图专用 API 与 Admin API；补齐数据模型字段与显式搜索列；固化 API envelope 与 cursor 契约；导航坐标系改为 M0 真机验证门；补用户删除生命周期、隐私合规、导入/备份细则；修正 V1 范围矛盾。
>
> v1.2 变更摘要：冻结 M1-T2 的全量 API wire contract；明确公开筛选标识、英语公开字段与 A-5 双语地址例外、GeoJSON 形状、媒体 URL、写操作回执、Admin 可写字段、Clerk webhook 最小输入以及 R2 预签名请求/响应。未增加 V1 功能范围。
>
> v1.3 变更摘要：冻结 MAP-2 的 PostGIS 边界简化容差——zoom `<10` 使用 `0.01°`，zoom `10–11` 使用 `0.002°`，zoom `≥12` 返回原始精度。未增加 V1 功能范围。
>
> v1.4 变更摘要：澄清 G-11 的 V1 缓存范围——搜索与 MAP-* 均按真实客户端 IP 限流，只有 MAP-* 按 4.4 使用 Cloudflare 1 小时响应缓存；搜索不缓存。未增加 V1 功能范围。

---

## 1. 产品概述

**一句话**：面向海外买家的中国供应链地图平台——通过交互地图展示中国产业带分布，按产品反查产业带与工厂，提供工厂信息与实地导航。

**目标用户**：海外 B 端买家/采购商（英语为主），对中国供应链不熟悉，需要「哪里生产什么、找谁、怎么去」的答案。

**V1 核心价值路径**：搜产品 → 定位产业带 → 浏览工厂 → 收藏 → 单个工厂导航。
（工厂对比、多工厂考察路线规划为 P1，见第 10 节。）

**V1 不做（Out of Scope）**：站内询盘/聊天、AI 采购助手、工厂对比、考察路线规划、第三方服务市场、支付/会员、展会模块、用户生成内容。

---

## 2. 全局约定（所有模块必须遵守）

| ID   | 约定                                                                                                                                                                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G-1  | 坐标系：数据库与公开 API 全部使用 WGS-84（GeoJSON `[lng, lat]`）。GCJ-02 转换仅发生在：（a）数据导入管道入库前；（b）生成导航 deep link 时（具体哪些导航目标用哪个坐标系以 F-6 的 M0 验证结果为准）                                                          |
| G-2  | i18n：所有面向用户的字符串走 i18n key（Web: next-intl；RN: i18next）。V1 仅英语 `en`，代码结构必须支持追加语言。数据库可翻译字段用 JSONB：`{"en": "...", "zh": "..."}`                                                                                       |
| G-3  | ID：内部业务实体主键统一使用 21 位 nanoid。例外仅两处：users.id = Clerk user id；webhook_events.id = Clerk 事件 id（svix id，见 3.7）。禁止自增 int 暴露到 API                                                                                               |
| G-4  | API envelope（见 4.1）：成功 `{ "data": {...}, "error": null, "meta": {...} }`；失败 `{ "data": null, "error": { "code", "message", "details" }, "meta": null }`。HTTP 状态码语义正确                                                                        |
| G-5  | 分页（见 4.2）：列表接口 cursor 分页；cursor 为不透明 Base64URL。排序按实体：公开 clusters/factories 列表 `published_at DESC, id DESC`；favorites `created_at DESC, id DESC`；Admin 列表 `updated_at DESC, id DESC`。categories、search、MAP-* 不使用 cursor |
| G-6  | 校验：所有 API 输入用 Zod schema 校验，schema 放 monorepo `packages/schemas`，前后端共享                                                                                                                                                                     |
| G-7  | 鉴权：公开读接口无需登录；用户写接口需 Clerk JWT；Admin 接口（ADM-*）需 Clerk JWT 且用户具有 `admin` role（Clerk publicMetadata）                                                                                                                            |
| G-8  | 时间：数据库存 UTC `timestamptz`，前端本地化展示                                                                                                                                                                                                             |
| G-9  | Schema 归属：**Drizzle/NestJS 是核心业务表唯一 Schema Owner**（regions、categories、clusters、factories、users、favorites、webhook_events）。Payload 只拥有并迁移自己的表（articles、media、cms_users）。Payload 的 migration 禁止触碰核心业务表             |
| G-10 | 图片：R2 存储，数据库只存 `objectKey`（如 `factories/abc123/1.jpg`），完整 URL 由 API 层拼 CDN 域名生成。每个环境将公开媒体与导入报告/备份等私有操作对象放入不同 bucket；只有媒体 bucket 绑定 CDN 自定义域名。上传一律走预签名 URL（ADM-6） |
| G-11 | 限流（P0）：匿名可访问的搜索与地图接口分别按真实客户端 IP 限制为 60 req/min/IP；只有 MAP-* 按 4.4 使用 Cloudflare 1 小时响应缓存，搜索不缓存。写接口按用户限流。返回 429 + `RATE_LIMITED` 错误码                                                            |

---

## 3. 数据模型（PostgreSQL + PostGIS，Drizzle 定义）

> 表名蛇形复数。geometry 列 SRID=4326。空间查询用原生 SQL（`sql` 模板）。
> 时间字段（timestamptz）：regions/categories/clusters/factories 含 `created_at`、`updated_at`；favorites 仅 `created_at`；users 单独定义；关联表（cluster_categories 等）不强制时间字段。

### 3.1 regions（行政区划）

| 字段      | 类型                                   | 说明                   |
| --------- | -------------------------------------- | ---------------------- |
| id        | text PK                                | nanoid                 |
| level     | enum: province / city / county         |                        |
| parent_id | text FK → regions.id, nullable         |                        |
| name      | jsonb                                  | `{en, zh}`             |
| centroid  | geometry(Point, 4326)                  |                        |
| boundary  | geometry(MultiPolygon, 4326), nullable | 省级必须有，市县可后补 |

### 3.2 categories（产品类目，两级）

| 字段                            | 类型               | 说明                                                                                      |
| ------------------------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| id                              | text PK            |                                                                                           |
| parent_id                       | text FK nullable   | 一级类目 parent 为 null                                                                   |
| name                            | jsonb              | `{en, zh}`                                                                                |
| slug                            | text unique        | 英文 kebab-case                                                                           |
| icon                            | text nullable      | 图标名                                                                                    |
| color                           | text nullable      | 一级类目必填（hex 色值，地图点着色 F-1.1）；二级类目为 null，继承父级颜色                 |
| aliases                         | jsonb default '{}' | 多语言产品别名：`{"en": ["led light", "led strip"], "zh": ["LED灯", "灯带"]}`，供搜索命中 |
| sort_order                      | int default 0      | 展示排序                                                                                  |
| search_text_en / search_text_zh | text               | 由 name+aliases 生成，见 3.8                                                              |

### 3.3 clusters（产业带 — 核心实体）

| 字段                            | 类型                                               | 说明                                                                                                                                     |
| ------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| id                              | text PK                                            |                                                                                                                                          |
| slug                            | text unique                                        | 如 `yiwu-small-commodities`                                                                                                              |
| name                            | jsonb                                              | `{en, zh}`                                                                                                                               |
| region_id                       | text FK → regions                                  | 所在市                                                                                                                                   |
| primary_category_id             | text FK → categories                               | 一级类目，决定地图点颜色与主分类展示                                                                                                     |
| centroid                        | geometry(Point, 4326)                              | 地图标注点                                                                                                                               |
| boundary                        | geometry(MultiPolygon, 4326) nullable              | 产业带范围色块                                                                                                                           |
| summary                         | jsonb                                              | 简介 `{en, zh}`                                                                                                                          |
| description                     | jsonb nullable                                     | 长文 `{en, zh}`，Markdown                                                                                                                |
| main_products                   | jsonb                                              | `[{en, zh}]` 数组，展示用                                                                                                                |
| cover_image                     | text nullable                                      | R2 objectKey（G-10），卡片/详情/OG 图用                                                                                                  |
| stats                           | jsonb nullable                                     | Zod schema 固定：`{annualOutputUsd?: number, exportShare?: number, note?: {en, zh}}`（note 遵守 G-2）。**factoryCount 不入库，实时计算** |
| status                          | enum: draft / published                            | 仅 published 出现在公开 API                                                                                                              |
| published_at                    | timestamptz nullable                               | 首次发布时间，排序键                                                                                                                     |
| search_text_en / search_text_zh | text                                               | 见 3.8                                                                                                                                   |
| 关联                            | cluster_categories(cluster_id, category_id) 多对多 | primary_category_id 必须也在其中                                                                                                         |

### 3.4 factories（工厂）

| 字段                            | 类型                         | 说明                                                 |
| ------------------------------- | ---------------------------- | ---------------------------------------------------- |
| id                              | text PK                      |                                                      |
| slug                            | text unique                  |                                                      |
| name                            | jsonb                        | `{en, zh}`                                           |
| cluster_id                      | text FK → clusters, nullable |                                                      |
| region_id                       | text FK → regions            |                                                      |
| address                         | jsonb                        | `{en, zh}` 文本地址                                  |
| location                        | geometry(Point, 4326)        | 已转 WGS-84（G-1）                                   |
| location_gcj02                  | jsonb nullable               | `{lng, lat}` 原始高德坐标，导航用                    |
| main_products                   | jsonb                        | `[{en, zh}]`                                         |
| certifications                  | text[] default '{}'          | 如 `["ISO9001","BSCI","CE"]`                         |
| moq                             | text nullable                | 自由文本                                             |
| established_year                | int nullable                 |                                                      |
| employee_range                  | text nullable                | 如 `"100-500"`                                       |
| contact                         | jsonb nullable               | `{website, email, phone, wechat}`                    |
| images                          | jsonb default '[]'           | `[{objectKey, alt: {en, zh}}]`（G-10，alt 遵守 G-2） |
| source_name                     | text nullable                | 数据来源名（可信度追溯）                             |
| source_url                      | text nullable                | 来源链接                                             |
| verified                        | boolean default false        |                                                      |
| verified_at / last_verified_at  | timestamptz nullable         | 首次/最近人工校验时间                                |
| verified_by                     | text nullable                | 校验人（admin user id）                              |
| status                          | enum: draft / published      |                                                      |
| published_at                    | timestamptz nullable         |                                                      |
| search_text_en / search_text_zh | text                         | 见 3.8                                               |
| 关联                            | factory_categories 多对多    |                                                      |

### 3.5 users（Clerk 同步副本）

| 字段                    | 类型                 | 说明                        |
| ----------------------- | -------------------- | --------------------------- |
| id                      | text PK              | = Clerk user id（G-3 例外） |
| email                   | text                 |                             |
| name                    | text nullable        |                             |
| locale                  | text default 'en'    |                             |
| deleted_at              | timestamptz nullable | 软删标记，见 F-8.4          |
| created_at / updated_at | timestamptz          |                             |

### 3.6 favorites（收藏）

| 字段        | 类型                                    | 说明 |
| ----------- | --------------------------------------- | ---- |
| id          | text PK                                 |      |
| user_id     | text FK → users                         |      |
| target_type | enum: factory / cluster                 |      |
| target_id   | text                                    |      |
| created_at  | timestamptz                             |      |
| 约束        | unique(user_id, target_type, target_id) |      |

### 3.7 webhook_events（Clerk 事件幂等）

| 字段         | 类型        | 说明                                       |
| ------------ | ----------- | ------------------------------------------ |
| id           | text PK     | = Clerk event id（svix id）                |
| type         | text        | user.created / user.updated / user.deleted |
| processed_at | timestamptz |                                            |

### 3.8 搜索列生成规则

`search_text_en` / `search_text_zh` 为内部冗余列，在**写入、更新、导入**三条路径统一生成（同一工具函数，放 `packages/schemas` 或 api 内共享 lib）：

- categories：name + aliases（`search_text_en` 只读取 `aliases.en`，`search_text_zh` 只读取 `aliases.zh`）
- clusters：name + main_products + summary + 所属类目 name/aliases
- factories：name + main_products + 所属类目 name/aliases
- **联动更新**：类目的 name/aliases 修改后，必须重新生成其关联产业带与工厂的搜索列（Admin 更新路径触发 BullMQ 任务 `regenerate:search-text`）

### 3.9 索引要求

- clusters.centroid、factories.location、regions.boundary：GIST
- factories：`(status, cluster_id)` 复合
- clusters/factories：`(status, published_at DESC, id DESC)` 复合（cursor 排序）
- 搜索：`to_tsvector('english', search_text_en)` GIN；`search_text_en gin_trgm_ops` GIN；`search_text_zh gin_trgm_ops` GIN

---

## 4. API 规格（NestJS，`/api/v1`）

### 4.1 Envelope（G-4）

成功：

```json
{ "data": {}, "error": null, "meta": {} }
```

失败：

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  },
  "meta": null
}
```

错误码枚举（V1）：`VALIDATION_ERROR`、`NOT_FOUND`、`UNAUTHORIZED`、`FORBIDDEN`、`RATE_LIMITED`、`INTERNAL`。

### 4.2 Cursor 规范（G-5）

- 不透明 Base64URL 字符串，内容为 `{v: 1, sort: [published_at, id]}` 序列化，客户端不得解析
- 参数 `?cursor=&limit=`（默认 20，最大 100），响应 `meta.nextCursor`（无更多数据时为 null）
- 排序按实体（G-5）：公开 clusters/factories 列表 `published_at DESC, id DESC`；favorites `created_at DESC, id DESC`；Admin 列表 `updated_at DESC, id DESC`；相同筛选条件下翻页不得重复或遗漏（e2e 必测）

### 4.3 公开 API

| #    | 方法与路径                                                                         | 说明                                                                                                                                                                  | 关键参数                                  |
| ---- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| A-1  | GET `/clusters`                                                                    | 产业带列表（列表页/无限滚动用）                                                                                                                                       | `category`、`region`、cursor 分页         |
| A-2  | GET `/clusters/:slug`                                                              | 产业带详情：boundary GeoJSON、类目、stats、实时 factoryCount、cover 图 URL                                                                                            |                                           |
| A-3  | GET `/clusters/:slug/factories`                                                    | 该产业带工厂列表                                                                                                                                                      | cursor 分页                               |
| A-4  | GET `/factories`                                                                   | 工厂列表（列表用）                                                                                                                                                    | `category`、`cluster`、`verified`、cursor |
| A-5  | GET `/factories/:slug`                                                             | 工厂详情，内嵌 `relatedFactories`（同产业带 published，最多 10）与导航所需坐标数据（F-6）                                                                             |                                           |
| A-6  | GET `/search?q=`                                                                   | 统一搜索：categories / clusters / factories 三组，各最多 5 条。实现见 F-3                                                                                             | `q` 必填，2-100 字符                      |
| A-7  | GET `/categories`                                                                  | 类目树（两级嵌套，含 color、sort_order）                                                                                                                              |                                           |
| A-8  | GET `/favorites` ｜ POST `/favorites` ｜ DELETE `/favorites/:targetType/:targetId` | 需登录。GET 支持 cursor/limit（`created_at DESC, id DESC`）。POST body `{targetType, targetId}`，重复收藏返回既有记录（200）；DELETE 目标不存在也返回成功——两者均幂等 |                                           |
| A-9  | PATCH `/me`                                                                        | 更新 locale/name，需登录                                                                                                                                              |                                           |
| A-10 | DELETE `/me`                                                                       | 发起账户删除（调 Clerk API 删除，后续流程走 webhook，见 F-8.4）                                                                                                       |                                           |
| A-11 | POST `/webhooks/clerk`                                                             | 处理 user.created / user.updated / **user.deleted**。Raw body 验签（svix）；先查 webhook_events 幂等，处理后写入                                                      |                                           |

### 4.4 地图专用 API（MAP-*）

> 与列表 API 分离：无 cursor，强缓存（Cloudflare CDN 置于 Railway API 前 + Cache-Control 1h，publish/unpublish 时按 URL 清除；见技术栈文档）。
> MAP-* 同样遵守 G-4 envelope：`data` 为 GeoJSON FeatureCollection，`meta` 携带 `truncated` 等信息，**不返回裸 FeatureCollection**。
> 地图属性保持轻量：点击 Feature 后前端以 slug 调 A-2/A-5 补全卡片（先 skeleton 再完整信息），封面/主产品不进 MAP-* 属性。

| #     | 方法与路径                                              | 说明                                                                                                                                                        |
| ----- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MAP-1 | GET `/map/clusters/points`                              | 全量 published 产业带 centroid 点 FeatureCollection，属性仅 `{id, slug, name_en, primaryCategoryId, color, factoryCount}`。`category` 可选过滤              |
| MAP-2 | GET `/map/clusters/boundaries?bbox=&category=&zoom=`    | bbox 内产业带 boundary，按 zoom 用 `ST_SimplifyPreserveTopology` 分级简化：zoom `<10` 容差 `0.01°`，zoom `10–11` 容差 `0.002°`，zoom `≥12` 原始精度           |
| MAP-3 | GET `/map/factories?bbox=&category=&cluster=&verified=` | bbox 内工厂点 FeatureCollection，属性固定为 `{id, slug, name_en, verified, clusterId}`。**上限 5000 点**，超限返回 `meta.truncated: true`，前端提示继续放大 |

验收：MAP-1 gzip 后 < 500KB；MAP-3 在 5000 点时 p95 < 500ms；truncated 场景有 UI 提示。

### 4.5 Admin API（ADM-*，G-7 admin role）

| #     | 方法与路径                                                | 说明                                                                         |
| ----- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| ADM-1 | GET/POST/PATCH `/admin/clusters`、`/admin/clusters/:id`   | 产业带 CRUD（含 draft）；列表支持 cursor/limit（`updated_at DESC, id DESC`） |
| ADM-2 | POST `/admin/clusters/:id/publish` ｜ `/unpublish`        | 状态流转，publish 时写 published_at（仅首次）                                |
| ADM-3 | GET/POST/PATCH `/admin/factories`、`/admin/factories/:id` | 工厂 CRUD；列表支持 cursor/limit（`updated_at DESC, id DESC`）               |
| ADM-4 | POST `/admin/factories/:id/publish` ｜ `/unpublish`       |                                                                              |
| ADM-5 | POST `/admin/factories/:id/verify`                        | 写 verified/verified_at/last_verified_at/verified_by                         |
| ADM-6 | POST `/admin/uploads/presign`                             | R2 预签名上传 URL，返回 objectKey                                            |

### 4.6 Wire contract（M1-T2 冻结）

`packages/schemas` 是以下 wire shape 的唯一来源；业务 JSON 默认 camelCase，GeoJSON 使用标准 `type` / `coordinates` / `geometry` / `properties`，MAP-* 的 `name_en` 保持本节既有命名。

**通用输入与输出：**

- 内部业务 ID 必须是 21 位 nanoid；slug 为英文 kebab-case；API 时间为 UTC ISO 8601（`Z`）。
- 公开 `category` / `cluster` 筛选使用 slug，`region` 使用 ID；Admin 关联字段与收藏目标使用 ID。
- `bbox` 固定为 `west,south,east,north`，且 west < east、south < north；zoom 为 0–24 整数；布尔 query 只接受 `true` / `false`。
- Point 与 MultiPolygon 统一用 WGS-84 GeoJSON，坐标顺序 `[lng, lat]`；MultiPolygon ring 必须闭合。A-5 只公开 M0-T9 已确认可导航的 WGS-84 location，不公开 `location_gcj02`。
- 公开可翻译字段以英语标量返回；A-5 `address` 是唯一例外，固定返回 `{en, zh}` 以满足 F-4.1。Admin 输入/详情继续使用 `{en, zh}`。
- 公开图片返回 API 拼接的 HTTP(S) CDN URL，不返回 objectKey；Admin 图片返回 objectKey + 预览 URL。
- 普通成功响应 `meta={}`；cursor 列表为 `{nextCursor}`；MAP-3 为 `{truncated}`。创建、更新、publish/unpublish、verify 返回更新后的资源；幂等删除和账户删除返回明确 desired-state 回执。

**公开 DTO：**

| DTO | 固定字段 |
| --- | --- |
| `CategorySummary` | `id,parentId,slug,name,icon,color,sortOrder`；A-7 根节点另含 `children` |
| `RegionSummary` | `id,level,name` |
| `ClusterSummary` | `id,slug,name,region,primaryCategory,centroid,summary,mainProducts,coverImageUrl,factoryCount,publishedAt` |
| `ClusterDetail` | ClusterSummary + `categories,boundary,description,stats`；`factoryCount` 仍为顶层实时值 |
| `FactorySummary` | `id,slug,name,cluster,region,location,mainProducts,verified,imageUrl,publishedAt` |
| `FactoryDetail` | FactorySummary + `categories,address,certifications,moq,establishedYear,employeeRange,contact,images,sourceName,sourceUrl,verifiedAt,lastVerifiedAt,relatedFactories`；related 最多 10 |

A-6 返回 `categories` / `clusters` / `factories` 三组、每组最多 5 项的轻量判别结果。A-8 收藏项内嵌对应 ClusterSummary/FactorySummary；目标不可公开时 `target=null`，不得借收藏接口泄露 draft。POST 收藏返回新建或既有记录；DELETE 返回 `{targetType,targetId,absent:true}`。A-9 返回更新后的 `{id,email,name,locale}`；A-10 返回 `{deletionRequested:true}`。

**地图：**

- MAP-1 Point 和 MAP-2 MultiPolygon properties 均固定为 `{id,slug,name_en,primaryCategoryId,color,factoryCount}`。
- MAP-3 Point properties 固定为 `{id,slug,name_en,verified,clusterId}`，FeatureCollection 最多 5000 项。

**Admin 写入：**

- Cluster POST 必填 `slug,name,regionId,primaryCategoryId,categoryIds,centroid,summary,mainProducts`；可选/可空 `boundary,description,coverImageObjectKey,stats`。`categoryIds` 必须含 primaryCategoryId。
- Factory POST 必填 `slug,name,regionId,categoryIds,address,location,mainProducts`；其余业务字段可选。PATCH 为相同字段的非空 partial。
- 通用 PATCH 禁止客户端写 `status,publishedAt,verified,verifiedAt,lastVerifiedAt,verifiedBy`；这些只由 ADM-2/4/5 修改。
- ADM-6 body 固定为 `{kind,entityId,fileName,contentType,contentLength}`；kind 为 `cluster-cover` / `factory-image`，类型仅 JPEG/PNG/WebP，声明大小为 1 byte–10MB。响应为 `{objectKey,uploadUrl,method:"PUT",headers:{"Content-Type"},expiresAt}`；URL 到期前按 bearer token 处理，上传后仍执行 G-10 的 HEAD 与引用复验。

**Clerk webhook：**A-11 对 raw body 完成 Svix 验签后，用 `type` 判别 `user.created` / `user.updated` / `user.deleted`，只校验同步 users 所需的 id、姓名和主邮箱字段；允许 Clerk 附加字段。Svix headers 单独校验，响应 `{processed,duplicate}`。

**验收（API 通用）**：所有接口 e2e 测试（testcontainers Postgres+PostGIS）；无效参数 400 + Zod details；draft 数据不出现在任何公开接口；写操作后相关缓存失效。

---

## 5. 功能需求（按模块）

### F-1 交互地图（P0）— Web 与 App

主界面。MapLibre 渲染 MapTiler 底图，数据来自 MAP-* 接口。

- F-1.1 初始视野：中国全境（约 bbox `[73, 18, 135, 54]`），加载 MAP-1 产业带点，按 `color`（一级类目色，3.2）着色
- F-1.2 缩放 ≥ 8：加载当前视口 MAP-2 boundary，渲染半透明色块（fill 图层，同类目色）
- F-1.3 缩放 ≥ 10：加载 MAP-3 工厂点，MapLibre cluster 聚合；点击聚合点放大；`meta.truncated` 时显示 "Zoom in to see all factories" 提示条
- F-1.4 点击产业带点/色块 → 底部卡片（App）/侧栏（Web ≥1024px）：先用 MAP-1 属性即时渲染（名称、factoryCount）+ skeleton，随即以 slug 调 A-2 补全主产品、cover 缩略图 → 点击进详情页
- F-1.5 点击工厂点 → 同机制（MAP-3 属性即时渲染 + A-5 补全）→ 工厂详情
- F-1.6 顶部悬浮搜索框（F-3）+ 一级类目筛选 chips（单选，联动 MAP-* 的 category 参数）
- F-1.7 移动/筛选后刷新数据：防抖 500ms，携带 abort 取消；`map_moved` 埋点节流（地图停止后记录，每 10 秒最多一次）

验收：中国全图 → 义乌产业带 → 工厂点 → 工厂详情全程无白屏无崩溃；断网显示重试而非空白；truncated 提示可见。

### F-2 产业带详情页（P0）

路由：Web `/clusters/[slug]`，App stack screen。数据 A-2。

- F-2.1 区块：名称+城市 → 小地图（boundary 高亮）→ 主产品标签 → 统计卡（实时 factoryCount + stats）→ 长文（Markdown）→ 工厂列表（A-3 无限滚动）
- F-2.2 SEO：SSR/ISR，generateMetadata 出 title/description/OG（用 cover_image）
- F-2.3 收藏按钮：未登录 → Clerk 登录 → 回跳

验收：Lighthouse SEO ≥ 90；回跳正确；滚动加载无重复（cursor 规范 4.2）。

### F-3 搜索 / 产品反查（P0）

核心差异化：产品名 → 产业带。基于 3.8 搜索列。

- F-3.1 输入 ≥ 2 字符，300ms 防抖调 A-6，下拉三组：类目 / 产业带 / 工厂
- F-3.2 实现策略：英文 query 走 `to_tsvector(search_text_en)` FTS + `search_text_en` trgm 兜底；中文 query 走 `search_text_zh` trgm；**2 字符中文用 ILIKE 前缀/包含兜底**（trgm 对 2 字符不可靠）
- F-3.3 类目 aliases 必须参与命中（搜 "sofa" 命中 furniture 类目 → 家具产业带）
- F-3.4 点击结果：类目 → 地图筛选态；产业带/工厂 → flyTo + 卡片
- F-3.5 无结果：引导文案 + 热门类目入口
- F-3.6 埋点 `search_performed`（query 截断 100 字符、去除邮箱/电话模式后记录，结果数）

验收：搜 "led"、"socks"、"sofa"（走 alias）、"家具" 均 500ms 内返回相关结果；query 超长被拒（400）。

### F-4 工厂详情页（P0）

路由：Web `/factories/[slug]`。数据 A-5。

- F-4.1 区块：名称（verified 徽章）→ 图片轮播 → 信息表（主产品/认证/MOQ/年份/规模）→ 位置小地图 → 双语地址（可一键复制）→ 联系方式 → 导航按钮组（F-6）→ relatedFactories 横滑
- F-4.2 数据可信度展示：source_name + last_verified_at（"Verified 2026-05" 样式）；verified=false 显示 "Unverified" 灰标
- F-4.3 埋点 `factory_contact_clicked`
- F-4.4 空字段区块隐藏而非留白

### F-5 收藏（P0）

- F-5.1 收藏列表页：登录可见，「工厂/产业带」两 tab，可取消
- F-5.2 未登录访问 Saved：展示登录引导空状态（不是报错）
- F-5.3 走 A-8，App 与 Web 一致（React Query 失效策略）；幂等语义见 A-8

### F-6 导航 Deep Link（P0）+ M0 技术验证门

不自建导航。**坐标系结论以 M0 真机验证为准，验证前不得写死任何"某导航用某坐标系"的假设**（Google Maps URL 官方支持已装 App 打开、未装回落浏览器，无需自行检测；Apple 坐标模式由 M0 真机测试确定）。

- F-6.1 M0 验证门（阻塞 F-6 开发）：选北京/上海/义乌/深圳/东莞各一个已确认坐标点；iPhone 真机测 Apple/Google/高德/百度，Android 真机测 Google/高德/百度；确定每个目标的 URL 模板与坐标模式
- F-6.2 结论固化到 `packages/geo/navigation`：纯函数 `buildNavUrl(target, wgs84, gcj02?)`，含 WGS-84↔GCJ-02↔BD-09 转换；保存验证夹具做单测
- F-6.3 按钮组：Google Maps、Apple Maps（仅 iOS）、高德、百度；未装 App 回落 Web URL；埋点 `navigation_clicked`
- F-6.4 发布前人工验收：真机落点误差 < 50m

### F-7 内容/CMS 与运营后台（P0）

**架构（G-9）**：Payload 只管理 articles / media / cms_users；产业带与工厂由 `/ops` 运营后台通过 Admin API（ADM-*）管理；Drizzle 是核心业务表唯一 Schema Owner。

- F-7.1 Payload `articles`：title/slug/cover/body(richtext)/locale/关联 cluster id（存 id 引用，非 FK），路由 `/guides/[slug]`，SSR + SEO 同 F-2.2；文章内产业带引用渲染为卡片链接
- F-7.2 `/ops`（Next.js 路由组，admin role 可见）：clusters/factories 的列表、编辑表单（含地图选点组件写 centroid/location）、publish/unpublish、verify 操作、图片上传（ADM-6 预签名）。够用即可，不追求完善
- F-7.3 发布动作触发 MAP-* 缓存失效

验收：运营在 `/ops` 完成 1 个产业带 + 3 家工厂录入并发布，在 Payload 完成 1 篇文章发布，全程无开发者介入。

### F-8 认证与账户（P0）

- F-8.1 Clerk：邮箱 + Google OAuth；App 端 `@clerk/clerk-expo`
- F-8.2 Webhook（A-11）：raw body svix 验签；webhook_events 表幂等（重试安全）
- F-8.3 账户页：邮箱、语言偏好（PATCH /me）、登出、删除账户（DELETE /me）
- F-8.4 删除流程：DELETE /me → 调 Clerk 删除用户 → user.deleted webhook → users.deleted_at 写入（软删）+ favorites **硬删除**；已删除用户的 JWT 再访问 → 401 并前端登出

### F-9 数据导入管道（P0，内部工具）

BullMQ 任务。文件经 R2 中转（Worker 与 CLI 不共享文件系统）：

```
CLI 上传 CSV/JSON → R2
→ 入队 { objectKey, sourceCoordinateSystem: 'wgs84' | 'gcj02' }
→ Worker 从 R2 下载 → Zod 逐行校验 → 坐标转换（factories 输入为 GCJ-02 时保留原坐标至 location_gcj02；clusters 仅转 WGS-84，不保留 GCJ-02）
→ 按 slug upsert → 生成 search_text（3.8）→ 报告（成功/失败行+原因）写回 R2
```

- F-9.1 `import:clusters` / `import:factories`：如上，可重跑幂等
- F-9.2 `geocode:factories`：无坐标工厂调高德地理编码 → 转换 → 写库 → verified=false 待人工校验
- F-9.3 `backup:daily`：每日 pg_dump（镜像版本与生产 PG 主版本一致并锁定）→ 加密（age/GPG）→ R2，保留 30 天；**M5 内完成一次恢复演练**，恢复成功才算验收

验收：导入 100 行含 10 行脏数据 → 90 入库、10 进报告；重跑无重复数据。

### F-10 次级页面（P0，薄实现）

- F-10.1 App Explore tab：一级类目网格（icon+color）→ 点击进该类目产业带列表（A-1，cursor 加载）→ 空类目显示空状态
- F-10.2 Web `/guides`：published 文章按发布时间倒序列表
- F-10.3 `/about`：静态页（产品介绍 + 联系方式）
- F-10.4 所有列表页定义空状态与加载骨架屏

### F-11 隐私与合规（P0 底线项）

- F-11.1 `/privacy` 与 `/terms` 静态页，注册流程与 App 内可达
- F-11.2 地图 attribution：MapTiler + © OpenStreetMap contributors，不得隐藏
- F-11.3 PostHog：Web 端 Consent banner（拒绝则不加载）；埋点 query 脱敏见 F-3.6；`map_moved` 节流见 F-1.7
- F-11.4 App Store / Play 隐私声明：随 M4 出包时完成（不阻塞 M0-M3）
- F-11.5 API 限流见 G-11

---

## 6. 页面与路由清单

**Web**：`/`（地图）｜ `/clusters/[slug]` ｜ `/factories/[slug]` ｜ `/guides`、`/guides/[slug]` ｜ `/favorites` ｜ `/account` ｜ `/sign-in` ｜ `/about` ｜ `/privacy`、`/terms` ｜ `/ops/**`（admin）

**App（Expo Router）**：Tabs —— Map ｜ Explore ｜ Saved ｜ Account；详情页 stack push。

---

## 7. 非功能需求

| ID  | 要求                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-1 | 性能：地图主页 Web LCP < 2.5s（美国网络）；API p95 < 300ms（MAP-3 放宽至 500ms）                                                                                                  |
| N-2 | SEO：clusters/factories/guides SSR 或 ISR；sitemap.xml 自动生成；hreflang 预留                                                                                                    |
| N-3 | 安全：写接口鉴权（G-7）；webhook raw body 验签；上传走预签名；限流 G-11                                                                                                           |
| N-4 | 监控：Sentry 三端；PostHog 事件：`search_performed`、`factory_contact_clicked`、`navigation_clicked`、`map_moved`（节流）、`cluster_viewed`、`factory_viewed`                     |
| N-5 | 测试：packages/schemas 单测；API e2e（testcontainers）；cursor 翻页一致性测试；`packages/geo` 坐标转换与导航 URL 单测（用 F-6 夹具）；Playwright 冒烟：地图加载、搜索、详情、收藏 |
| N-6 | 无障碍：交互元素键盘可达，图片有 alt                                                                                                                                              |

---

## 8. 开发里程碑

| 阶段 | 内容                                                                                              | 完成标志                                             |
| ---- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| M0   | Monorepo + 三端脚手架 + CI + 部署通；**F-6.1 导航真机验证门**，结论固化 `packages/geo/navigation` | 三端 Hello World 部署成功；导航 URL 模板定稿并有单测 |
| M1   | 数据模型迁移 + 种子数据（≥10 产业带、≥50 工厂）+ 公开 API（A-1~A-7）+ MAP-*                       | API/MAP 全部可调，e2e 绿，cursor 一致性测试过        |
| M2   | F-1 地图 + F-3 搜索 + F-2/F-4 详情页（Web 优先）                                                  | 核心路径走通                                         |
| M3   | F-8 认证 + F-5 收藏 + A-8~A-11 + webhook 幂等                                                     | 跨端收藏一致；删除账户流程通                         |
| M4   | App 补齐 M2 功能 + F-6 导航（真机验收）+ F-10 Explore + F-11.4 商店隐私声明                       | TestFlight/内测包发出                                |
| M5   | F-7 `/ops` + Payload 文章 + F-9 导入管道 + **备份恢复演练** + N-2 SEO 收尾 + F-11 其余项          | 运营独立完成录入发布；恢复演练成功                   |

---

## 9. 冻结状态

| 部分                                  | 状态                                             |
| ------------------------------------- | ------------------------------------------------ |
| 产品定位与 V1 范围                    | 冻结                                             |
| 数据模型 / 公开与地图 API / Admin API | 冻结                                             |
| CMS/运营架构（G-9 分工）              | 冻结                                             |
| 导航                                  | 规格冻结，坐标系结论待 M0 验证门产出（不改范围） |
| 安全与合规                            | 冻结                                             |

---

## 10. 路线图（P1/P2，本期不开发；新需求一律进此节）

**P1**：工厂对比（2-4 家表格对比）、考察路线规划（多工厂路径排序 + 行程清单）、站内询盘（RFQ + Resend 邮件通知）、AI 采购助手（AI SDK + Tool Calling 调 A-6/A-2）、多语言第二批（es/ar/ru）。

**P2**：第三方服务市场（验厂/货代/翻译）、展会日历与展馆地图、工厂入驻自助后台、会员订阅（Stripe）、海关数据整合、pgvector RAG 知识库。
