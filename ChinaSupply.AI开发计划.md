# ChinaSupply.AI 开发计划

> 版本：**v1.1** ｜ Status: **Frozen / Approved for Execution** ｜ Next Action: **M0-T0 → M0-T1** ｜ 日期：2026-07-22
> 依据：《ChinaSupply.AI技术栈-最终冻结版.md》+《ChinaSupply.AI产品PRD.md v1.1 Frozen》
> 开发方式：Codex（AI 编码代理）执行，人工负责验收、真机测试与数据录入。
> 引用规则：G-* / F-* / A-* / MAP-* / ADM-* / N-* 指向 PRD 条目，实现细节以 PRD 为准。
> v1.1 变更：新增 API Client 生成链路（Orval）；数据导入提前至 M1、最小 /ops 提前至 M2；Redis/Worker 与环境策略进入 M0；移动兼容 Spike 扩充；CI 触发分级；超大任务包拆小；补 Maestro/k6 测试层；工期修正为 12-14 周。终审修正：M0-T0 外部前置清单；Clerk 基础鉴权入 M0；App 账户页补全（M4-T3a）；privacy/terms 前移 M3；新增 Production Cutover 与商店发布（M5-T9~T11）；删除超出 PRD 的导入 UI/批量图片/告警（移 P1）；Admin 无硬删除 + 上传校验链；数据核验 SOP。

---

## 0. 给 Codex 派活的方式

1. **按任务包派活**，一次一个（T 编号），不要整份 PRD 塞给它。
2. 每次派活附带：任务包描述 + PRD 第 2 节全局约定 + 涉及的 PRD 章节 + 相关 schema/生成文件。
3. 任务包粒度标准：**0.5-2 个工程日、单一验收目标、尽量不同时改 Web/API/Mobile、PR 可独立回滚**。
4. 完成标准：代码 + 测试 + `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build` 全绿 + 对应勾选项可勾。`pnpm build` 构建 Web/Payload/API/Worker，**不含原生 iOS/Android 编译**；移动端任务另跑 `pnpm mobile:check`（expo-doctor + TypeScript + Expo config 校验 + expo export bundle 检查），原生编译只由 EAS Preview/Production 承担。
5. 发现 PRD 歧义 → 停下改 PRD → 再继续。禁止 Codex 自行补需求。

**单仓目录（M0-T1 建立）**：

```
chinasupply/
├── apps/
│   ├── web/        # Next.js + Payload（create-payload-app 起）
│   ├── mobile/     # Expo RN（Obytes Starter 起）
│   └── api/        # NestJS + Fastify；两个入口：main.ts（HTTP）/ worker.ts（BullMQ）
├── packages/
│   ├── schemas/    # Zod schema（输入校验唯一来源）
│   ├── api-client/ # Orval 从 OpenAPI 生成（禁止手改）
│   ├── geo/        # 坐标转换 + navigation URL 构建
│   ├── i18n/       # 文案资源
│   ├── analytics/  # PostHog 统一封装：未同意时完全 no-op
│   └── config/     # eslint/tsconfig/tailwind preset
└── turbo.json
```

**环境策略（M0 冻结）**：

| 环境       | 数据库                            | Clerk               | R2                                                                 | 域名      |
| ---------- | --------------------------------- | ------------------- | ------------------------------------------------------------------ | --------- |
| Local      | Docker PostGIS + Redis（compose） | Dev                 | 媒体/私有操作 bucket，均使用 `dev` prefix                           | localhost |
| Staging    | Railway staging DB                | Dev instance        | `chinasupply-staging-media`（公开）+ `chinasupply-staging`（私有），均使用 `staging` prefix | staging.* |
| Production | 独立生产 DB                       | Production instance | 两只独立 production bucket，空 prefix（M5-T9 创建）                 | 正式域名  |

约定：`.env.example` 齐全 + Zod 环境变量启动校验；Drizzle migration 作为部署前独立 release command，失败则不启动新版本；Payload 与 Drizzle migration 分开执行；production 禁止自动 seed；种子/测试数据只进 staging；production 数据默认 draft，人工验证后 publish。

**CI 触发分级（M0-T6 落地）**：

| 场景                                              | 检查                                          |
| ------------------------------------------------- | --------------------------------------------- |
| Pull Request                                      | lint、typecheck、unit、Web/API build、API e2e |
| Mobile PR                                         | expo-doctor、配置校验、单测（不跑 EAS）       |
| main 合并                                         | 上述全部 + staging 自动部署（Vercel/Railway） |
| `rc-*` tag / workflow_dispatch（profile=preview） | EAS Preview Build                             |
| `v*` tag + 人工批准                               | EAS Production Build + Submit                 |
| 上线前                                            | Playwright（staging）+ Maestro + 真机人工验收 |

---

## M0 工程基座与技术验证（预计 1.5-2 周）

> 目标：三端骨架 + Worker + 环境策略就绪；移动兼容与导航坐标两大风险出清。M0 不写业务功能。

- [ ] **M0-T0 外部账号与标识符（人工前置，最容易拖延，立即启动）**：GitHub 仓库；Vercel / Railway / Cloudflare / MapTiler；Clerk / Sentry / PostHog；**Apple Developer + Google Play Console（审核周期长，不得等到 M4）**；iOS Bundle ID / Android Package Name；域名与 DNS 控制权；Google OAuth 凭据与 Redirect URL；App 名称、图标占位、隐私联系邮箱；账单与 API 配额启用。**法律文案（privacy/terms）为人工交付物，最晚 M3 开工前提供可上线版本。**
- [x] **M0-T1 Monorepo**：create-turbo + pnpm workspace + packages/config；目录如上。
- [x] **M0-T2 环境与配置**：三环境定义落地；.env.example + Zod env 校验；Docker Compose（PostGIS + Redis）；migration release command 流程写入 CI。
- [x] **M0-T3 Web 骨架**：create-payload-app 迁入 apps/web；删演示内容；next-intl（en）；接入 Clerk Web Provider/Middleware——仅 staging admin 登录 + role 校验，为 M2 的 Admin API 与 /ops 提供鉴权基础（面向用户的 OAuth/回跳/账户页留 M3）；部署 Vercel（staging 域名）。
- [x] **M0-T4 API + Worker 骨架**：nest new + Fastify；`main.ts`/`worker.ts` 双入口；Railway 两个 Service（api/worker）+ Redis provision；BullMQ 消费 `system:ping` 测试任务成功；`/health/live`（无外部依赖）与 `/health/ready`（检查 PG+Redis）；G-4 envelope 拦截器 + 全局 Zod pipe + 错误码枚举。
- [x] **M0-T5 移动兼容 Spike（本项目最重要的技术验证）**：Obytes Starter 迁入；验收清单——版本矩阵（Expo/RN/Obytes/MapLibre RN）写入 ADR；New Architecture 确认启用；expo-doctor 通过；iOS+Android dev build 通过；至少一个 Preview 配置可构建；从 mobile 成功导入 packages/schemas、geo、i18n（Metro + pnpm workspace + EAS monorepo workingDirectory 配置生效）；地图渲染点、Polygon、聚合点（不只是底图）；Clerk Expo 登录页接通。
- [x] **M0-T6 CI/CD**：按上表分级触发；EAS 仅 `rc-*` / `v*` tag 或 Preview 手动触发。`main` 的 staging 发布先调用 M0 已真实可执行的 Payload `cms` migration，成功后才放行 Vercel/Railway；M1-T1 创建 Drizzle schema 与 `db:migrate` 后，再将 Railway 发布门增加为 `core` migration 成功。
- [x] **M0-T7 Sentry 验证**：三端测试异常上报成功；release 版本正确；Web/Mobile source map 上传；环境区分 dev/staging/prod。
- [x] **M0-T8 packages/geo**：WGS-84↔GCJ-02↔BD-09 纯函数 + 公开已知坐标对单测（误差阈值断言）。
- [x] **M0-T9 导航验证门（F-6.1，人工+真机）**：5 城市定点；iPhone 测 Apple/Google/高德/百度、Android 测 Google/高德/百度；产出《导航验证结论》；固化 `packages/geo/navigation` 的 `buildNavUrl` + 夹具单测。**不完成则 M4 导航不得开工。**
- [x] **M0-T10 Cloudflare 与 MapTiler**：域名托管 + API 域名代理 Railway（配置可信代理与真实客户端 IP 透传）；R2 bucket + CORS + custom domain + 环境隔离（CORS 不承担类型/大小校验，上传校验链见 M5-T1）；Purge token 最小权限；MapTiler key 按 Web 域名 / iOS Bundle ID / Android Package 分别限制。

**版本策略**：M0 完成兼容矩阵并锁版本；V1 期间只允许安全修复与阻塞性 bugfix，不做框架大版本升级。

**M0 出口**：三端 Hello World 在 staging 可访问；Worker 消费任务成功；真机地图渲染点/面/聚合；导航结论 + 夹具存在；Sentry 三端可上报；CI 分级生效。

---

## M1 数据层、API 契约与基础导入（预计 2 周）

> 目标：模型落库、公开/地图 API 可调、API Client 生成链路打通、数据人员可以开始持续录入。

- [x] **M1-T1 Drizzle schema 与迁移**：PRD 第 3 节全部表 + 索引（3.9）+ PostGIS extension；search_text 生成函数共享 lib（3.8）；落地真实 `db:migrate` 后，把 M0-T6 的 Railway staging 发布门从仅 CMS 扩展为 `core` migration 成功后才发布 API/Worker。
- [x] **M1-T2 packages/schemas**：全部 API 请求/响应 Zod schema；envelope 与 cursor 编解码（4.1/4.2）。
- [x] **M1-T3 OpenAPI + API Client**：NestJS 输出 `/api/openapi.json`（Zod 为唯一来源，经 nestjs-zod/zod-openapi 桥接）；Orval 生成 packages/api-client（fetch client + TanStack Query hooks）；Web 与 App 各完成一次真实调用；CI 校验重新生成后 `git diff` 为空；同链路生成 MSW mock 供 M2 先行。
- [x] **M1-T4a 公开 API：categories + clusters**：A-7、A-1、A-2（实时 factoryCount）。
- [x] **M1-T4b 公开 API：factories**：A-3、A-4、A-5（relatedFactories 内嵌）。
- [x] **M1-T4c 公开 API：search**：A-6（FTS + trgm + alias + 2 字符中文 ILIKE，按 F-3.2/3.3）。
- [x] **M1-T5 地图 API**：MAP-1/2/3（envelope 包 FeatureCollection、zoom 分级简化：`<10` 为 `0.01°`、`10–11` 为 `0.002°`、`≥12` 原始精度；固定属性、5000 上限 + truncated）。
- [x] **M1-T6 缓存与限流**：MAP-* Cache-Control + Cloudflare 缓存规则；G-11 限流（throttler + **Redis store**，多实例安全；真实 IP 取自 M0-T10 的代理配置）；Purge 接口预留。
- [x] **M1-T7 基础导入管道（从 M5 提前）**：`import:clusters` / `import:factories`——CSV/JSON、R2 中转、Zod 逐行校验、坐标按实体转换（F-9 流程）、按 slug upsert、失败报告、可重跑幂等。**M1 结束后数据人员按固定格式持续录入 staging。**
- [x] **M1-T8 种子与合成数据**：真实种子（≥10 产业带、≥50 工厂，**只进 staging**）；另生成 5,000/20,000 合成工厂点供负载测试；建立 `data-sources.md`（来源、许可、坐标系、更新时间）；测试联系方式不得进 production；产出《数据核验 SOP》——verified 至少代表：坐标落点正确、中英文地址可用、来源 URL 有效、主营产品合理、系工厂主体而非纯贸易商、联系方式经基本核对、last_verified_at 已记录（防止 verify 沦为形式化勾选）。
- [x] **M1-T9 e2e 与负载**：testcontainers（Postgres+PostGIS **+ Redis**，限流/BullMQ/缓存测试依赖）e2e——draft 不可见、公开列表 cursor 一致性（收藏排序留 M3、Admin 排序留 M5）、bbox、搜索命中、429；k6/autocannon——MAP-1 gzip 体积、MAP-3 p50/p95（5000 点）、搜索 p95，结果对照 N-1。

**M1 出口**：全部端点 envelope 正确；api-client 生成链路 CI 校验通过；e2e + 负载基线达标；数据人员开始用导入管道录入。

---

## M2 Web 核心体验 + 最小运营能力（预计 2-2.5 周）

> 目标：Web 核心路径走通；运营可查看/修正/校验数据。UI 可先用 MSW mock 与 M1 并行。

- [x] **M2-T1a 地图底座**：MapLibre + 自维护 style JSON；MAP-1 点渲染（color 着色）；地图 attribution（MapTiler + © OpenStreetMap contributors，F-11.2）自首次渲染即显示。
- [x] **M2-T1b 地图分层加载**：zoom 阈值加载 MAP-2 boundary / MAP-3 工厂点 + 聚合；防抖 + abort（F-1.7）；truncated 提示条。
- [x] **M2-T1c 卡片交互**：F-1.4/1.5——MAP 属性即时渲染 + skeleton + A-2/A-5 补全。
- [x] **M2-T6 最小 Admin API（前置数据门禁）**：ADM-1/3 的 GET+PATCH、ADM-5 verify、ADM-2/4 publish/unpublish；API 自身验证 Clerk JWT + admin role，工厂 publish 前必须 verified。publish/unpublish 幂等保留首次 `published_at`，提交状态后同步 purge `/api/v1/map/`，失败可重复操作收敛；完整 Create 与 ADM-6 上传链留 M5。
- [x] **M2-T7 最小 /ops（前置数据门禁）**：列表 + 编辑表单 + verify + publish/unpublish（admin role）；地图选点、图片上传、新建与完整运营能力留 M5。**目标：数据人员能通过合规界面查看、修正、校验和发布录入数据。**
- [x] **M2 staging 真实数据门禁（人工）**：独立复核人按 M1-T8 SOP 完成 2 个带真实 boundary 的产业带 + 每带 5 家工厂核验；先发布 1+3 冒烟，再发布至 2+10。工厂必须记录 verifiedBy/verifiedAt/lastVerifiedAt，产业带复核清单保存到 `docs/operations/reviews/staging/`；失败记录不得为凑数降级通过。固定候选全部穷举后仍不足 2+10 时，只有经独立任务批准，才允许对尚未发布、从未核验的 canonical draft 在同一产业带内通过 `/ops` 原位修复或替换主体，并同步 real-seed 与旧值→新值证据；不得改变产业带归属、降低 SOP、绕过 `/ops` 写 staging 或提前 M5 Create。完成后验证 A-2/A-5/A-6、MAP-1/2/3、draft 隔离及 unpublish→publish 收敛。图片路径仍由 fixture 覆盖，不提前 ADM-6。
- [x] **M2-T2 搜索**：F-3 全部；埋点走 packages/analytics（未同意 no-op）。
- [x] **M2-T3 类目筛选**：F-1.6 chips 联动。
- [x] **M2-T4 产业带详情页**：F-2（SSR/ISR + metadata + OG）；收藏按钮 UI 占位。
- [x] **M2-T5 工厂详情页**：F-4；导航按钮组用 packages/geo/navigation；双语地址复制。
- [x] **M2-T8 Playwright**：CI 用 MSW mock MAP API + 固定 style/tile fixture（断言防抖、abort、truncated）；staging 跑真实 MapTiler 冒烟，避免外网抖动打红 PR。
- [x] **M2-T9 Streets v4 2D 底图迁移**：自维护 style JSON 迁移到 MapTiler Planet v4，保留 Streets v4 的完整道路、交通、POI 与街道细节，英文名优先并以当地名称 fallback；建筑仅为 zoom ≥15 的淡化 2D footprint，禁止 `fill-extrusion`、3D 建筑和非零初始 pitch。以提交的 Planet v4 schema manifest 保持 tileset/source-layer 一致性护栏，继续禁止运行时 `/maps/{id}/style.json`；产业带 fill 插入首个底图 symbol layer 之前，其余业务图层保持在底图标签之上。Local/Staging 的 Free 仅限测试评估，production Flex 门禁留 M5-T9。**2026-07-26 由 Owner 确认接受已合并实现与全部自动化验收，并将未执行的真实 staging 视觉/资源与 Lighthouse 检查延后人工复核；勾选不表示这些延后项已通过。**

**M2 出口**：PRD F-1 验收路径在 staging 走通；Lighthouse SEO ≥ 90；运营在 /ops 完成一次数据修正 + verify。

---

## M3 账户、收藏与隐私同意（预计 1-1.5 周）

- [x] **M3-T1 Clerk Web 接线**：邮箱 + Google OAuth；登录回跳（F-2.3）。**2026-07-26 已配置 staging Clerk Development instance 并完成邮箱新/旧用户、登录回跳、直接登录 fallback、现有 Google OAuth 与 `/ops` 三权限 smoke；Owner 明确接受交付并豁免第二个全新 Google 身份的注册 smoke。该勾选不表示被豁免场景已执行。**
- [x] **M3-T2 Webhook**：A-11——raw body svix 验签、webhook_events 幂等、created/updated/deleted；F-8.4 软删 + 收藏硬删 + 已删用户 401。**2026-07-26 PR #52 合并后，Railway API 已配置轮换后的 Webhook secret（Worker 无此变量），Clerk Development endpoint 仅订阅三类用户事件；一次性用户 created → updated → deleted 与密钥轮换后的第二次 created → deleted 均投递成功，数据库确认字段同步、locale 保留、tombstone、favorites 清理和 receipt 落库。**
- [x] **M3-T3 用户回填**：一次性 `clerk:sync-users` 命令，回填 M0-M2 期间产生的测试用户（或明确清空重建）。**2026-07-26 在 PR #54 的 CI Gate 通过后，从精确提交 `541ee9a` 对 staging 执行 insert-only 回填：首次 fetched=4/inserted=4/existing=0，复跑 fetched=4/inserted=0/existing=4；聚合核对确认 4 个 Clerk 用户均为 active、邮箱/姓名一致、审核管理员已回填，原有 2 个 tombstone 保持不变。**
- [x] **M3-T4 收藏与账户 API 接线**：A-8（含 cursor）/A-9/A-10。
- [x] **M3-T5 收藏页与账户页**：F-5.1/5.2、F-8.3；React Query 失效策略。
- [x] **M3-T6 Web Consent**：PostHog Consent banner（F-11.3）；packages/analytics 接线，拒绝则全量 no-op；staging 即生效。**2026-07-26 在精确提交 `4e15af6` 的成功 CI 与 canonical Vercel staging 部署上完成真实验收：unknown/denied/revoked 均为零 PostHog 请求，grant 会话的五类单次事件与 2 次 `map_moved` 计数准确，搜索邮箱/电话已脱敏，10 秒节流和排除路由零首次加载均通过，且无自动事件。**
- [x] **M3-T7 /privacy 与 /terms 上线**：使用 M0-T0 交付的法律文案（F-11.1），正式 URL 固定，供 M4 App 直接打开（/about 仍留 M5）。**2026-07-26 Owner 明确批准提交 `41d2033` 的精确英文正文；PR #58 合并为 `09f8325` 后，main CI、CMS/Core migration、Staging Release Gate 与 Vercel canonical staging 部署全部成功，`/privacy`、`/terms`、注册链接和 Consent Privacy 入口真实 smoke 通过。production、`/about` 与 sitemap 仍分别留给 M5-T9/M5-T7。**
- [ ] **M3-T8 e2e**：webhook 重放幂等、删除账户全流程、收藏幂等、favorites cursor 排序。

**M3 出口**：收藏→取消→删除账户全通；webhook 重放无脏数据；未同意时零埋点请求。

---

## M4 App 对等功能与内测（预计 2-2.5 周）

- [ ] **M4-T1 App 地图页**：复用 packages/api-client；MapLibre RN 实现 F-1（底部卡片形态）；attribution 同 M2-T1a。
- [ ] **M4-T2a App 搜索**：F-3 RN 实现。
- [ ] **M4-T2b App 产业带详情**：F-2 RN 实现。
- [ ] **M4-T2c App 工厂详情**：F-4 RN 实现。
- [ ] **M4-T3a App 认证与账户页**：Clerk Expo；Account tab 覆盖 F-8.3 全部——邮箱展示、locale（PATCH /me）、登出、删除账户（DELETE /me）；删除/登出后清理本地 token 与缓存。
- [ ] **M4-T3b App 收藏**：Saved tab、收藏/取消、未登录空状态。
- [ ] **M4-T4 Explore tab**：F-10.1。
- [ ] **M4-T5 导航 Deep Link**：F-6.3 按 M0-T9 模板 + Web URL 回落 + 埋点；**人工真机验收落点 < 50m（F-6.4）**。
- [ ] **M4-T6 Maestro 测试**：启动→地图加载；搜索→产业带→工厂；登录/未登录 Saved；收藏与取消；登出流程 + 一次性 staging 用户的删除账户流程；导航按钮存在且 URL 正确（真机落点仍人工验收）。
- [ ] **M4-T7 商店合规**：App Store/Play 隐私声明（F-11.4）；App 内直接打开 M3-T7 已上线的 privacy/terms 正式 URL。
- [ ] **M4-T8 内测发布**：tag 触发 EAS → TestFlight + Play 内测轨道。

**M4 出口**：内测包发出；Maestro 套件绿；双端真机核心路径 + 导航实测通过。

---

## M5 内容、数据增强与上线加固（预计 2 周）

- [ ] **M5-T1 Admin API 补全**：在 M2-T6 已交付的 Read/Update/verify/publish/unpublish 基础上补 ADM-1/3 Create 与 ADM-6 上传链。**不提供产业带/工厂硬删除**（避免收藏悬空、文章引用失效、溯源丢失）。objectKey 由服务端生成（客户端不得指定路径）；仅 JPEG/PNG/WebP、声明 ≤10MB、限定路径 + 短有效期 presign；上传后服务端 HEAD 复验类型与大小；实体 PATCH 引用 objectKey 时验证对象存在且属于当前环境。
- [ ] **M5-T2 /ops 增强**：在 M2-T7 最小后台上补新建表单 + 地图选点 + 图片上传。（导入任务状态 UI 超出 PRD F-9 范围，移入 P1；V1 由 CLI 输出 job ID，日志 + Sentry + R2 报告承担运维。）
- [ ] **M5-T3 搜索列联动**：类目的 name/aliases 修改后触发 BullMQ `regenerate:search-text` 更新关联产业带与工厂（PRD 3.8）；publish/unpublish 的 MAP purge 已由 M2-T6 前置交付。
- [ ] **M5-T4 Payload 文章**：F-7.1 + `/guides`（F-10.2）+ 文章内产业带卡片。
- [ ] **M5-T5 导入增强**：`geocode:factories`（高德 + 转换 + verified=false）。（批量图片与任务监控告警超出 PRD，移入 P1。）
- [ ] **M5-T6 备份**：F-9.3 每日加密 pg_dump → R2、30 天保留；**恢复演练一次并记录**。
- [ ] **M5-T7 静态页与 SEO**：创建 /about；在 production **复核**已上线的 /privacy、/terms（M3-T7）与地图 attribution（M2/M4 已实现，勿重写）；sitemap；空状态/骨架屏与 SEO 核查（F-10.4 / N-2）。
- [ ] **M5-T8 性能与加固**：k6 复测（真实数据量）对照 N-1；限流复核；生产环境变量与密钥审计。
- [ ] **M5-T8a 生产内容迁移（上线数据来源，唯一实质缺口的补齐项）**：数据三分类贯穿全程——测试/合成、真实未验证、已验证可迁移（curated）。staging 中 synthetic/test 数据使用独立 namespace（slug 前缀或标记），永不导出；以干净 CSV/JSON 为 canonical dataset，只导出 **verified 且 curated** 的 clusters/factories；生成导出 manifest（记录数、slug、校验和、R2 objectKey）；被引用图片复制到 production bucket/prefix；导入 production 保持 draft，production admin 核对 manifest + 抽样后 publish；导入后校验记录数、对象存在性与校验和；Payload articles/media 单独制定导入或生产重录方案。
- [ ] **M5-T9 Production Cutover**：先将 MapTiler 升级为 Flex 并确认商业授权，创建按正式 Web 域名、iOS Bundle ID、Android Package 分别限制的三只 production key，设置账单上限/告警并验证 Planet v4 TileJSON、PBF、glyph、sprite；Free 与 staging key 不得进入 commercial production。随后创建/核对生产 DB、Redis、R2、Clerk Production、Cloudflare；生产 migration dry-run；上线前备份；部署 API/Worker/Web；production smoke test；验证 staging 数据未流入 production；记录回滚命令与上一版本。
- [ ] **M5-T10 App Production Release**：EAS Production Build + EAS Submit；App Store / Google Play 审核；分阶段发布或手动发布；验证商店链接、Clerk OAuth callback 与自定义 URL Scheme。（**V1 不做 Universal/App Links，移入 P1**，降低商店发布风险。）
- [ ] **M5-T11 Go/No-Go**：执行下节最终检查清单。

---

## 上线前检查清单（Go/No-Go）

- [ ] PRD 第 5 节所有 P0 验收条目逐条核对
- [ ] 首发数据达标：≥30 产业带、≥200 工厂，**全部经 /ops 人工 verify 后 publish**
- [ ] N-1 性能：LCP < 2.5s（美国网络实测）；MAP-3/搜索 p95 达标（真实数据量 k6 报告）
- [ ] 导航真机复测（Release 包，非 dev build）
- [ ] 备份恢复演练记录存在
- [ ] production 库无测试数据/测试联系方式；数据默认 draft 流程生效
- [ ] Sentry 无未处理 P0 错误；Consent 流程验证；PostHog 事件正常
- [ ] 域名、SSL、robots.txt、sitemap、OG 图在 production 验证

---

## 关键路径与并行

```
M0（兼容 Spike + Worker + 导航验证 + 环境）
 ↓
M1（模型 + 契约 + API Client + 基础导入）──► 数据录入自此持续并行（独立关键路径）
 ↓
M2（Web 核心 + 最小 /ops）   ← UI 可用 MSW mock 与 M1 并行开工
 ↓
M3（账户 + 收藏 + Consent）
 ↓
M4（App 对等 + Maestro + 导航 + 内测）
 ↓
M5（内容 + 增强 + 备份 + 加固）──► 上线
```

**工期**：功能完整内测 9-11 周；**12-14 周为 Release Candidate 完成并提交商店审核的目标**，公开上线另受 Apple/Google 审核时间影响；若外部账号、法律文案或数据人力不能准时到位，预留 14-16 周。数据是独立关键路径：M1 后剩余约 8 周，需稳定完成每周约 20 家工厂 + 2-3 个产业带的录入核验（按每家 30-60 分钟计，约合每周 10-20 小时专职投入），执行 M1-T8 的《数据核验 SOP》。

## 风险清单

| 风险                        | 缓解                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| 坐标偏移类 bug              | 转换全部收敛 packages/geo；夹具单测 + 真机验收双保险                                                 |
| Codex 跨任务包不一致        | 派活附带 PRD 第 2 节；envelope/cursor/搜索列只允许引用 packages/schemas 与 api-client 生成物         |
| 前后端合同漂移              | Zod schema + 路由元数据是契约源；OpenAPI、Orval client、MSW 均为派生产物，禁止手改；CI git diff 校验 |
| Expo/MapLibre 版本冲突      | M0-T5 兼容矩阵 ADR 锁版本；V1 期间仅安全修复                                                         |
| 工厂数据不足                | 导入管道 M1 就绪；录入每周并行；上线门槛写死                                                         |
| 限流在多实例/CDN 后失效     | throttler Redis store + Cloudflare 可信代理与真实 IP 配置（M0-T10/M1-T6）                            |
| Payload 与 Drizzle 迁移互踩 | G-9 隔离；CI 检查 Payload migration 不含核心表名；两套 migration 分开执行                            |
| staging 数据误入 production | 环境策略 M0 冻结；prod 禁自动 seed；默认 draft + 人工 publish；M5-T8a manifest 迁移流程              |

---

## 附录：派活前的子任务拆分（超 2 天的任务包）

以下任务派给 Codex 前先按此拆分，符合"0.5-2 工程日、单一验收目标"规则：

```
M0-T5a  Obytes 入 Monorepo + 版本矩阵 ADR
M0-T5b  MapLibre 双端构建与地图验证（点/面/聚合）
M0-T5c  Clerk Expo、共享包导入与 EAS Preview 配置

M1-T3a  Zod → OpenAPI（/api/openapi.json）
M1-T3b  Orval 生成 packages/api-client + 双端各一次真实调用
M1-T3c  MSW mock 同源生成 + CI drift 检查

M4-T1a  App 地图数据源与图层
M4-T1b  App 聚合、卡片与交互

M5-T1a  Admin Create + M2 已有 Read/Update/publish/unpublish 加固
M5-T1b  R2 上传校验链（presign → HEAD 复验 → PATCH 归属校验）

M5-T9a  生产资源核对 + migration dry-run
M5-T9b  数据/媒体迁移执行（按 M5-T8a）
M5-T9c  部署、Smoke Test 与回滚记录
```
