# ChinaSupply.AI 技术栈（最终冻结版）

> 冻结日期：2026-07-25
> 原则：本表为 V1 开发范围，冻结后不再讨论选型；「后期规划」中的项目在触发条件满足前不投入。

## 一、核心技术栈

| 层级            | 最终选型                                                     | 用途                                                                                   |
| --------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Web             | Next.js + React + TypeScript                                 | 官网、地图、产业带、工厂详情、SEO                                                      |
| 移动端          | React Native + Expo Development Build（Obytes Starter 骨架） | iOS 和 Android，自带 Expo Router、React Query、Zustand、i18next、测试与 CI 配置        |
| 样式            | Web：Tailwind CSS；RN：NativeWind                            | 三端统一 Tailwind 写法                                                                 |
| Web 地图渲染    | MapLibre GL JS                                               | 产业带、工厂、热力图、聚合点                                                           |
| 移动地图渲染    | MapLibre React Native v11                                    | iOS/Android 地图                                                                       |
| 商业底图        | MapTiler Cloud（Local/Staging 为 Free 测试评估；Production 必须 Flex） | Planet v4 全球矢量底图与 CDN；Free 禁止承载商业 production                              |
| 后端            | NestJS + Fastify                                             | 统一业务 API                                                                           |
| ORM             | Drizzle ORM                                                  | 数据库访问和迁移（空间查询走 sql 模板原生 SQL）                                        |
| 数据库          | PostgreSQL + PostGIS                                         | 业务及地理数据                                                                         |
| 内容管理        | Payload CMS（与主库共用 Postgres）                           | 产业文章、城市介绍、SEO 内容                                                           |
| 缓存与任务      | Redis + BullMQ                                               | 数据导入、地理编码、AI 任务、缓存、备份                                                |
| 搜索            | PostgreSQL FTS + pg_trgm                                     | 首版产业带和工厂搜索                                                                   |
| 文件存储        | Cloudflare R2                                                | 每环境公开媒体 bucket（自定义 CDN 域名）与私有操作 bucket（导入、报告、备份）严格分离 |
| 身份认证        | Clerk                                                        | Web 和 App 统一登录                                                                    |
| 国际化 i18n     | Web：next-intl；RN：i18next                                  | 多语言（首发英语，预留西/阿/俄）                                                       |
| 交易邮件        | Resend                                                       | 询盘通知、工厂回复提醒等业务邮件                                                       |
| AI              | Vercel AI SDK Core + GPT/Claude                              | AI 采购助手（Tool Calling）                                                            |
| 中国地理编码    | 腾讯/高德 API + 人工校验                                     | 工厂地址转坐标，入库前 GCJ-02 → WGS-84                                                 |
| 导航            | Apple/Google/高德/百度 Deep Link                             | 实地考察导航，不自建导航                                                               |
| 地图数据格式    | GeoJSON 起步，MVT（ST_AsMVT）扩展                            | 产业带多边形、工厂点位下发                                                             |
| Web 部署        | Vercel                                                       | Web 与 Payload 后台                                                                    |
| API/Worker 部署 | Railway 美区                                                 | 后端和任务服务                                                                         |
| API 边缘缓存    | Cloudflare CDN（API 域名代理，置于 Railway 前）              | MAP-* 等公开读接口缓存 1h；publish/unpublish 时按 URL 主动清除（Cloudflare Purge API） |
| 数据库备份      | BullMQ 定时 pg_dump → R2（每日）                             | 核心数据保底                                                                           |
| CI/CD           | GitHub Actions + EAS Build                                   | 自动测试和三端发布                                                                     |
| 监控            | Sentry + PostHog                                             | 错误、性能和产品数据                                                                   |

## 二、脚手架与起步方式

| 层级           | 脚手架                               | 说明                                                                                                                                           |
| -------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo       | `create-turbo`（Turborepo）          | 三端同仓：`apps/web`、`apps/mobile`、`apps/api`，共享包放 `packages/`（类型、API client、i18n 文案、Zod schema）；目录结构参考 create-t3-turbo |
| Web + CMS      | `create-payload-app`（website 模板） | 官方模板，Next.js + Payload + Postgres + Tailwind 一步到位，地图页在此基础上添加                                                               |
| 移动端         | Obytes React Native Starter          | Expo + Expo Router + NativeWind + React Query + Zustand + i18next + 测试/CI；改造见「关键约定」第 6 条                                         |
| 后端           | `nest new` + NestJS CLI              | 不用第三方 boilerplate（多绑 TypeORM/Prisma + Express，与 Drizzle + Fastify 不匹配），官方 CLI 自建模块                                        |
| AI 采购助手 UI | Vercel AI Chatbot 模板（官方开源）   | Next.js + AI SDK 完整对话界面：流式输出、历史记录、Tool Calling 展示                                                                           |
| 业务邮件       | React Email 模板（Resend 官方）      | 询盘通知、回复提醒等邮件用 React 编写，与主栈同语言                                                                                            |
| 管理后台       | Payload 自带 admin                   | 工厂数据审核、内容管理直接用，不另找 admin 模板                                                                                                |

> 模板使用原则：拿来先删掉用不上的演示代码再开发，不在示例代码上叠业务。

## 三、关键约定（开发前必读）

1. **坐标系**：数据库统一存 WGS-84。来自高德/腾讯的数据入库前必须 GCJ-02 → WGS-84 转换；跳转国内导航 App 时再反向转换。禁止两套坐标混存。
2. **底图样式与套餐门禁**：自行维护一份基于 MapTiler Planet v4 schema 的 Streets v4 2D style JSON，仅引用 MapTiler 瓦片、glyph 与 sprite 资源，避免托管 style 漂移；保留完整道路、交通、POI 与街道细节，英文名优先并以当地名称 fallback，建筑只渲染 zoom ≥15 的淡化 2D footprint，禁止 `fill-extrusion`、非零初始 pitch 与 3D 相机交互变更。MapTiler 公开 Maps API 的内置 `GET /maps/streets-v4/style.json` 可用有效 key 读取，不等同于网页编辑器中可能受 Flex 限制的 custom-style 下载权益。允许在人工审查的刷新流程中用受限 key 一次性获取官方样式，但必须在写盘前去除 key、记录上游摘要并完成本条的 2D/语言正规化；运行时仍禁止请求托管 `style.json`。Local/Staging 仅在 MapTiler 官方允许的测试/评估范围内使用 Free；M5-T9 上线前必须升级 Flex、确认商业授权、账单上限及生产配额。MapTiler 后台分别创建 Web、iOS、Android key，Web 按域名限制，移动端按由 Bundle ID/Package 派生的大小写敏感 User-Agent 子串限制，禁止跨平台复用 key，staging key 不得复用于 production。
3. **用户数据自持**：接 Clerk webhook（user.created / user.updated）同步用户基础信息到自己的 Postgres 用户表，业务数据只关联自己的表。
4. **数据边界**：产业带、工厂等核心结构化地理数据放 NestJS + PostGIS 自有 schema；Payload 只管文章类内容，不存业务地理数据。
5. **Expo 版本**：锁定 Obytes Starter 的 Expo SDK 与 MapLibre RN 的版本组合，升级前先在 dev build 验证。
6. **Obytes Starter 改造**：删除内置 zustand 演示登录，换 `@clerk/clerk-expo`（token 存 MMKV）；加装 `@maplibre/maplibre-react-native` + config plugin 后 prebuild。

## 四、后期规划（触发条件满足前不投入）

| 项目           | 方案                                            | 触发条件                         |
| -------------- | ----------------------------------------------- | -------------------------------- |
| 大规模搜索     | Meilisearch（优先）/ OpenSearch                 | PG FTS 性能或相关性不满足        |
| 向量检索 / RAG | pgvector                                        | 报告、文章知识库上线时           |
| 底图自托管     | Protomaps PMTiles + R2/CDN                      | MapTiler 账单显著增长后          |
| 支付           | Stripe                                          | 会员/订阅变现启动时              |
| API 限流加固   | NestJS Throttler + Cloudflare                   | 出现滥用或爬虫压力时             |
| 部署迁移       | Hetzner + Dokploy（省钱）或 Fly.io（多区域提速) | Railway 账单难看或全球延迟成瓶颈 |

## 五、下一步（关键路径）

技术栈已冻结，瓶颈不在架构。按序推进：

1. 核心数据模型设计：产业带、工厂、产品类目、地理边界 schema
2. 第一批产业带数据的采集与清洗流程
3. MVP 范围：地图 + 产业带 + 产品反查搜索 + 工厂详情
