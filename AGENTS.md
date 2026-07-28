# ChinaSupply.AI 代理协作规范

本文件适用于仓库根目录及其所有子目录。所有编码代理在分析、修改或验收项目前，必须先阅读本文件及任务涉及的已确认文档。

## 1. 已确认文档与优先级

项目当前有三份已冻结/批准执行的文档：

1. `ChinaSupply.AI产品PRD.md`：V1 需求的唯一事实源（v1.4 Frozen / Approved for Implementation）。产品范围、数据模型、API 契约、验收标准以它为准。
2. `ChinaSupply.AI技术栈-最终冻结版.md`：技术选型与关键架构约定的冻结来源。不得在任务中重新选型。
3. `ChinaSupply.AI开发计划.md`：批准执行的任务顺序、任务包拆分、环境和 CI 策略。它决定“何时做”，实现细节仍以 PRD 为准。

本文件是上述三份文档的派生摘要，不是独立事实源。本文件与源文档冲突时以源文档为准；任何修订已确认文档的任务，必须在同一任务内同步更新本文件的对应条目。

出现冲突或歧义时：

- 需求和实现细节遵循 PRD；技术选型遵循冻结技术栈；排期与拆分遵循开发计划。
- 范围以 PRD 为最高优先：技术栈文档中「用途」指向 P1/P2 功能的组件（Vercel AI SDK、AI Chatbot 模板、Resend 询盘邮件等），V1 一律不接入、不安装、不预埋代码。限流按 PRD G-11 属 P0（M1-T6 实现 Throttler + Redis store），不适用技术栈「后期规划」中的延后条款。
- 不自行猜测、扩展或静默折中。先明确指出对应的 G/F/A/MAP/ADM/N/T 编号和冲突，再由人工确认并先修订已确认文档，之后才改代码。
- 不以代码现状反向覆盖冻结文档，也不把 P1/P2 功能提前塞入 V1。

## 2. 产品范围

ChinaSupply.AI 面向海外 B 端买家，V1 核心路径是：搜索产品 → 定位中国产业带 → 浏览工厂 → 收藏 → 单个工厂导航。首发用户界面为英语，同时保留扩展语言的结构。

V1 明确不做：站内询盘/聊天、AI 采购助手、工厂对比、多工厂考察路线规划、第三方服务市场、支付/会员、展会模块、用户生成内容。P1/P2 只保留路线图，不得因“顺手”而实现。

当前计划起点是 `M4-T2b`；M0-M3 工程任务已收口，M4-T0 已产出 F-1/F-11.2/N-1/N-6 的地图体验诊断和两套方向稿，Owner 在同一 PR 明确选择 `Keep baseline`；M4-T1 已完成 App 共享底图、MAP-1/2/3 数据源、zoom 分层、防抖/abort、聚合放大、产业带/工厂卡片、truncated、错误重试、attribution 与共享 `map_moved` facade 接线，并使用真实受限 iOS/Android MapTiler key + canonical staging API 完成双端 Simulator/Emulator 交互 smoke；M4-T2a 已完成 F-3.1～F-3.6 App 搜索与 F-1.6 一级类目 chips，包括 300ms 搜索/500ms 类目筛选防抖、旧 MAP 请求取消、二级精确筛选态、结果定位和即时卡片，并完成双端真实 key + staging API smoke。详情 CTA 在 M4-T2b/T2c 原生路由落地前保持禁用；Mobile 真实 PostHog adapter + Consent 必须另行批准并先修订开发计划，不得夹带。Owner 另行要求把与官方 Streets v4 差异过大的手工底图更正为去密钥后的官方样式快照，该工作已按 M2-T9 独立修复交付。M0-T0 中 Apple Developer、Google Play Console 与商店标识保留等人工前置仍未完成，不得伪造或勾选；外部账号、物理真机测试、数据录入和人工验收仍属于人工前置或人工门禁。

## 3. 工作方式

- 一次只执行一个开发计划中的 T 编号任务包。任务应保持 0.5–2 个工程日、单一验收目标、可独立回滚，并尽量不要同时修改 Web、API 和 Mobile。
- **交付必须走 Git 分支 + PR，禁止把成果裸留在工作树**：开工时从最新 `main` 创建 `codex/<t编号>-<简述>` 分支；任务完成（或需要人工审查/接续）时，必须先 `git add` + `git commit` 全部改动并推送 origin、创建 PR（可为 Draft），然后才提交完成报告。`main` 受分支保护，直推会被拒绝。未提交的工作树内容随时可能被分支切换或环境操作毁掉且无法从 Git 恢复——这是已发生过的真实事故，不是假设。审查意见的修订也在同一 PR 分支上迭代。
- 开始任务前，读取：任务包描述、PRD 第 2 节全局约定、任务涉及的 PRD 章节，以及相关 schema/生成文件。
- 先检查现有工作树并保留用户的无关改动。不要覆盖、回滚或删除不属于当前任务的内容。
- 只修改完成当前验收目标所需的文件。发现相邻问题可以报告，但未经批准不要扩大范围。
- 代码、测试、配置和文档必须在同一任务内保持一致。完成后给出实际运行的验证命令、结果和任何无法自动验证的人工项。
- 只有实际满足任务包验收和阶段出口条件，才可勾选开发计划中的复选框；部分完成不得标记完成。

## 4. 目标仓库结构

M0-T1 建立 pnpm + Turborepo 单仓：

```text
apps/
  web/          Next.js + React + TypeScript + Payload + Tailwind
  mobile/       React Native + Expo Development Build + Expo Router + NativeWind
  api/          NestJS + Fastify；main.ts 为 HTTP，worker.ts 为 BullMQ Worker
packages/
  schemas/      共享 Zod schema；API 输入/响应契约的唯一来源
  api-client/   从 OpenAPI 经 Orval 生成，禁止手工修改
  geo/          坐标转换与导航 URL 构建
  i18n/         跨端文案资源
  analytics/    PostHog 统一封装；未同意时完全 no-op
  config/       ESLint、TypeScript、Tailwind 等共享配置
```

模板落地后先删除无关演示代码，再实现业务；不要在演示逻辑上叠加产品代码。

## 5. 冻结技术栈

- Web：Next.js、React、TypeScript、Tailwind CSS、next-intl、MapLibre GL JS。
- Mobile：React Native、Obytes Starter、Expo Development Build、Expo Router、NativeWind、React Query、Zustand、i18next、MapLibre React Native v11。
- API/Worker：NestJS + Fastify、Drizzle ORM、Redis + BullMQ。
- 数据：PostgreSQL + PostGIS；首版搜索使用 PostgreSQL FTS + `pg_trgm`。
- CMS：Payload，仅管理内容；与主业务共用 PostgreSQL，但迁移边界严格隔离。
- 基础设施：MapTiler Cloud（Local/Staging 可用 Free 做测试评估，Production 必须 Flex）、Cloudflare R2/CDN、Clerk、Resend、Sentry、PostHog；Web/Payload 部署到 Vercel，API/Worker 部署到 Railway 美区。
- CI/CD：GitHub Actions + EAS Build。

未经已确认文档修订，不得替换框架、ORM、数据库、认证、地图、CMS、存储、部署平台或引入“后期规划”组件。Expo/React Native/Obytes/MapLibre 的兼容组合必须在 M0-T5 验证后锁定；V1 期间只允许安全修复与阻塞性 bugfix，不做框架大版本升级。

## 6. 不可破坏的全局约定

### 6.1 地理与坐标

- 数据库和公开 API 统一使用 WGS-84；GeoJSON 坐标顺序固定为 `[lng, lat]`，geometry SRID 固定为 4326。
- 高德/腾讯来源坐标入库前从 GCJ-02 转为 WGS-84。禁止 WGS-84 与 GCJ-02 混存到同一业务坐标列。
- 空间查询通过 Drizzle `sql` 模板执行原生 PostGIS SQL。
- MAP-2 边界简化容差固定为：zoom `<10` 使用 `0.01°`，zoom `10–11` 使用 `0.002°`，zoom `≥12` 返回原始精度。
- 导航目标所需坐标系不得凭经验写死。F-6 的实现被 M0-T9 真机验证门阻塞；验证完成后只在 `packages/geo/navigation` 的纯函数和测试夹具中固化结论。
- 导航发布前必须由人工在真机验证落点误差小于 50m；代理不能用模拟器或单测替代该结论。
- Web 和 App 使用同一份自行维护、基于 Planet v4 schema 的 Streets v4 2D MapLibre style JSON，只引用 MapTiler 瓦片、glyph 与 sprite 资源；不要直接依赖可能漂移的托管样式。内置 Streets v4 的 `GET /maps/streets-v4/style.json` 是 MapTiler 公开文档化的 Maps API，不得再把网页编辑器的 Flex-only custom-style 下载权益误解为该读取端点的套餐门禁；允许用有效受限 key 一次性下载官方样式，但必须在写盘前去除 key、记录上游摘要并经人工审查后检入，运行时仍禁止请求托管 `style.json`。除把唯一的 `Building 3D` 替换为平面建筑外，底图标签表达式、配色、线宽、过滤条件、图层顺序与默认相机必须保持取得的官方快照原值；官方 `Building` 在 zoom 12–15 的 2D 样式原样保留，并在 zoom ≥15 延续同款 2D footprint。禁止 `fill-extrusion` 与非零初始 pitch；密钥占位符、来源元数据和 3D→2D 转换是仅有的允许差异。产业带 fill 放在首个底图 symbol layer 之前，边界线、产业带点、工厂点和聚合点放在底图标签之上。MapTiler key 分别按 Web 域名、iOS Bundle ID 和 Android Package 限制。

### 6.2 数据与 Schema 所有权

- Drizzle/NestJS 是 `regions`、`categories`、`clusters`、`factories`、`users`、`favorites`、`webhook_events` 等核心业务表的唯一 Schema Owner。
- Payload 只拥有 `articles`、`media`、`cms_users` 等内容表。Payload migration 禁止创建、修改或删除核心业务表。
- Drizzle migration 与 Payload migration 必须分开生成、审查和执行。
- 表名使用 snake_case 复数；内部业务实体 ID 使用 21 位 nanoid。例外仅有两处：`users.id = Clerk user id`、`webhook_events.id = Clerk 事件 id（svix id）`。禁止把自增整数暴露到 API。
- 数据库时间使用 UTC `timestamptz`，展示时才本地化。
- 可翻译数据库字段使用 PRD 规定的 JSONB 结构。所有面向用户的静态字符串必须走 i18n key；不得把英文文案直接散落在组件中。
- `factoryCount` 实时计算，不写入 `clusters.stats`。
- `search_text_en`/`search_text_zh` 必须通过同一共享函数在写入、更新、导入三条路径生成；类目名称或 aliases 变化时触发 `regenerate:search-text` 更新关联实体。

### 6.3 API 契约

- 所有业务 API 位于 `/api/v1`，并使用统一 envelope：成功为 `{ data, error: null, meta }`，失败为 `{ data: null, error: { code, message, details }, meta: null }`。HTTP 状态码必须具有正确语义。
- V1 错误码限定为：`VALIDATION_ERROR`、`NOT_FOUND`、`UNAUTHORIZED`、`FORBIDDEN`、`RATE_LIMITED`、`INTERNAL`。
- 所有 API 输入使用 `packages/schemas` 中的 Zod schema 校验。Zod schema 与路由元数据派生 OpenAPI，再由 Orval 派生 API client、TanStack Query hooks 和 MSW mock。
- 禁止手改 `packages/api-client` 或其他生成产物。修改源 schema/路由元数据后重新生成，并确保 CI 的生成漂移检查通过。
- 列表使用不透明 Base64URL cursor，默认 limit 20、最大 100。公开 clusters/factories 按 `published_at DESC, id DESC`，favorites 按 `created_at DESC, id DESC`，Admin 按 `updated_at DESC, id DESC`。categories、search、MAP-* 不使用 cursor。
- MAP-* 也必须包在 envelope 内，不能返回裸 FeatureCollection；地图属性严格保持 PRD 规定的轻量字段。MAP-3 最多 5000 点，截断时返回 `meta.truncated: true`。
- MAP-* 公开读响应经 Cloudflare CDN 缓存 1 小时；publish/unpublish 后按相关 URL 主动 purge。
- 公开 API 绝不返回 draft 数据。收藏 POST/DELETE、Clerk webhook 和导入重跑必须遵守 PRD 中的幂等语义。
- M1-T2 wire contract：业务 JSON 默认 camelCase；公开 category/cluster 筛选用 slug、region 用 ID，Admin 关联与收藏目标用 ID；Point/MultiPolygon 使用 WGS-84 GeoJSON。公开可翻译字段返回英语标量，A-5 `address` 例外返回 `{en,zh}`；Admin 保留完整双语对象。公开媒体只返回 CDN URL，Admin 返回 objectKey + 预览 URL。
- 普通写操作返回更新后的资源，幂等删除返回 desired-state 回执。通用 Admin PATCH 不得写 status/published/verified 系列服务端字段；ADM-6 只接受 JPEG/PNG/WebP、声明不超过 10MB，并返回短时 PUT URL，上传后仍须 HEAD 复验。

### 6.4 鉴权、安全与隐私

- 公开读接口无需登录；用户写接口验证 Clerk JWT；ADM-* 和 `/ops/**` 还必须验证 Clerk `publicMetadata` 中的 `admin` role。
- Clerk webhook 必须使用 raw body 做 Svix 验签，并通过 `webhook_events` 去重。用户删除后软删 users、硬删 favorites，已删除用户再次访问返回 401。
- 匿名搜索和地图接口分别按真实客户端 IP 限制为 60 req/min/IP；只有 MAP-* 使用 Cloudflare 1 小时响应缓存，搜索不缓存。写接口按用户限流。多实例限流使用 Redis store，429 返回 `RATE_LIMITED`。
- R2 数据库字段只存 `objectKey`，完整 CDN URL 由 API 拼接。每个环境使用公开媒体 bucket 和私有操作 bucket（导入、报告、备份）；只有媒体 bucket 可绑定 CDN 自定义域名。上传使用服务端生成路径的短时预签名 URL，仅允许 JPEG/PNG/WebP 且声明不超过 10MB；上传后 HEAD 复验类型/大小，实体引用时再验证对象存在且属于当前环境。
- 不得硬删除产业带或工厂；使用 draft/published 状态，避免收藏、文章引用和溯源失效。
- PostHog 必须经过 `packages/analytics`。Web 用户未同意时不加载且完全 no-op；搜索埋点先去除邮箱/电话模式并把 query 截断至 100 字符；`map_moved` 每 10 秒最多记录一次。
- 地图必须始终显示 MapTiler 和 © OpenStreetMap contributors attribution。

## 7. 环境、迁移与数据隔离

- Local：Docker PostGIS + Redis、Clerk Dev、R2 媒体/私有操作 bucket 的 dev prefix、localhost。
- Staging：Railway staging DB、Clerk Dev instance、`chinasupply-staging-media` 公开媒体 bucket + `chinasupply-staging` 私有操作 bucket，均使用 staging prefix、`staging.*`。
- Production：独立生产 DB、Clerk Production instance、两只独立 production bucket（空 prefix）、正式域名。
- MapTiler Free 只允许用于 Local/Staging 测试评估；M5-T9 commercial production 上线前必须升级 Flex、确认商业授权与账单上限、创建 Web/iOS/Android 三只受限 production key，并完成 Planet v4 TileJSON/PBF/glyph/sprite smoke。禁止把 Free 或 staging key 带入 production。
- 所有应用提供完整 `.env.example`，启动时用 Zod 校验环境变量；密钥不得提交到仓库、日志、fixture 或客户端 bundle。
- Drizzle migration 作为部署前独立 release command，不得在应用启动时隐式执行；失败时不得启动新版本。生产环境不得自动 seed 或写入测试/合成数据。
- M0-T6 在 M1-T1 尚未建立真实 Drizzle `db:migrate` 前，只能执行已存在的 Payload `cms` migration，并以其成功门控当前 staging 发布；M1-T1 必须补接 `core` migration，之后 Railway API/Worker 只有 core migration 成功才可发布。禁止用 no-op 伪造 core migration。
- 种子和合成数据只能进入 staging。production 数据默认 draft，只迁移 `verified` 且 `curated` 的 canonical 数据，并按开发计划 M5-T8a 使用 manifest、校验和和人工抽查后发布。
- M2-T6/T7 已前置到 M2-T2 之前作为 staging 真实数据门禁：只能通过带 Clerk admin 鉴权的 Admin API 与 `/ops` 执行 verify、publish/unpublish；工厂 publish 前必须 verified，状态流转后同步 purge MAP 缓存。禁止用 SQL、seed、import 或临时脚本绕过审核留痕。
- M2 staging 固定候选穷举后若仍不足 2+10，只有经单独批准的源数据修复任务，才可对 `draft + unverified` 且从未发布/核验的 canonical 记录做同产业带原位修复或替换。staging 内容修改仍只走 `/ops`，仓库同步 real-seed、来源台账和旧值→新值证据；不得跨产业带调配、降低厂区坐标标准、操作状态字段或提前 M5 Create。
- 导入必须经 R2 中转、Zod 逐行校验、坐标转换、按 slug upsert、搜索列生成，并把逐行失败报告写回 R2。不要依赖 CLI 与 Worker 的共享文件系统。
- 每日备份使用与生产 PostgreSQL 主版本一致且锁定的 `pg_dump`，加密后写入 R2，保留 30 天；只有人工记录的恢复演练成功才算验收。

## 8. 实现质量与验证

每个任务必须包含与风险相称的测试。默认完成门槛为：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
```

`pnpm build` 覆盖 Web/Payload/API/Worker，不代表原生 iOS/Android 构建。涉及 Mobile 时另运行：

```bash
pnpm mobile:check
```

它应覆盖 expo-doctor、TypeScript、Expo 配置校验和 export bundle 检查。原生编译只由 EAS Preview/Production 承担。

按任务类型追加验证：

- API：testcontainers PostgreSQL + PostGIS + Redis e2e；校验 envelope、Zod details、鉴权、draft 隔离、cursor 无重复/遗漏、幂等和 429。
- Geo：公开已知坐标对的转换误差断言；导航 URL 使用 M0-T9 人工确认的夹具。
- Web：Playwright；PR 中使用固定 MSW 与 style/tile fixture，staging 再做真实 MapTiler smoke test。
- Mobile：单测 + Maestro 核心路径；真机地图、导航和商店行为仍需人工验收。
- 性能：MAP-1 gzip 小于 500KB；MAP-3 5000 点 p95 小于 500ms；其他 API p95 小于 300ms；Web 地图主页美国网络 LCP 小于 2.5s。
- SEO/可访问性：clusters、factories、guides 使用 SSR/ISR；自动 sitemap、预留 hreflang；交互元素键盘可达，图片有 alt；目标页 Lighthouse SEO ≥ 90。

若仓库尚未完成 M0-T1、相关脚本或应用不存在，应如实说明“尚未建立”，不能伪造命令通过。

## 9. 阶段门禁与人工事项

- M0-T5 未产出并验证移动版本矩阵前，不宣称 Expo/MapLibre 兼容性完成。
- M0-T9 未完成五城市、双平台真机验证前，不实现或确认 F-6 导航坐标模板，M4 导航任务不得开工。
- 法律文案、外部服务账号、域名、商店账号、Bundle ID/Package Name 和生产凭据缺失时，记录为人工前置，不自行生成虚假值。
- 发布、production migration、production 数据迁移、EAS Submit、Cloudflare purge 等会影响外部或生产状态的操作，只有任务明确授权时才执行，并保留 smoke test 与回滚记录。
- Go/No-Go 必须逐条核对开发计划清单；首发门槛为至少 30 个产业带和 200 家工厂，全部经 `/ops` 人工 verify 后 publish。

## 10. 完成报告与开发日志

完成任务时，简洁报告：

1. 完成的 T 编号及对应 PRD 条目，以及**分支名与 PR 链接**（无 PR 的报告视为未交付）。
2. 修改的主要文件和外部行为变化。
3. 实际运行的检查与结果。
4. 尚需人工完成的真机、账号、数据或上线验证。
5. 未满足的验收项、阻塞或文档歧义；不要把它们隐藏为“后续优化”。

同时必须在仓库根目录 `开发日志.md` 末尾追加一条记录（文件不存在时先创建）。日志与代码在同一 PR/提交中一起交付，缺少日志条目的任务不算完成。只追加、不修改或删除历史条目。每条格式：

```markdown
## YYYY-MM-DD ｜ M?-T?（任务名）

- 内容：本次实现/修改了什么，对应的 PRD 条目（G/F/A/MAP/ADM/N 编号）
- 主要文件：新增或修改的关键文件与外部行为变化
- 验证：实际运行的命令与结果（未运行或失败的如实写明）
- 遗留/人工项：未满足的验收项、阻塞、待人工完成的事项（无则写「无」）
```

日期使用当天真实日期；不得为未执行的任务补写日志，也不得用日志掩盖未完成的验收项。
