# ChinaSupply.AI 开发计划

> 版本：**v1.6** ｜ Status: **Frozen / Approved for Execution** ｜ Next Action: **M5-T2** ｜ 日期：2026-07-30
> 依据：《ChinaSupply.AI技术栈-最终冻结版.md》+《ChinaSupply.AI产品PRD.md v1.5 Frozen》
> 开发方式：Codex（AI 编码代理）执行，人工负责验收、真机测试与数据录入。
> 引用规则：G-* / F-* / A-* / MAP-* / ADM-* / N-* 指向 PRD 条目，实现细节以 PRD 为准。
> v1.1 变更：新增 API Client 生成链路（Orval）；数据导入提前至 M1、最小 /ops 提前至 M2；Redis/Worker 与环境策略进入 M0；移动兼容 Spike 扩充；CI 触发分级；超大任务包拆小；补 Maestro/k6 测试层；工期修正为 12-14 周。终审修正：M0-T0 外部前置清单；Clerk 基础鉴权入 M0；App 账户页补全（M4-T3a）；privacy/terms 前移 M3；新增 Production Cutover 与商店发布（M5-T9~T11）；删除超出 PRD 的导入 UI/批量图片/告警（移 P1）；Admin 无硬删除 + 上传校验链；数据核验 SOP。
> v1.2 变更：经 Owner 批准，在 M4-T1 前新增 M4-T0 地图体验诊断与方向稿门禁；先在全国/城市/街道三个缩放层级明确底图、业务图层与浮层交互问题，待 Owner 选定方向后再实现。未修改 PRD V1 功能范围。
> v1.3 变更：经 Owner 批准，将 M4-T2b/T2c 的验收口径收敛为双端 canonical staging 主路径 smoke + 固定 fixture/自动化分支覆盖；真实图片受 ADM-6 时序约束，联系方式与 21+ 同产业带真实数据属于 M5 数据增强后的回归，不再阻塞 M4。现状核查确认 Admin 业务 controller 仅有 GET/PATCH/verify/publish/unpublish，没有 Create/Upload 写入端点；M1 import 可新增 `draft + unverified`，但不能替代 `/ops` 审核留痕。Unverified 继续由 fixture 验收，不为测试长期发布未核验工厂。未修改 PRD V1 功能范围或 API wire contract。
> v1.4 变更：经 Owner 批准，M4-T7 以代码、原生隐私清单、权限加固、App 法律入口和离线商店声明包为完成定义；Apple Developer/Play Console 账号、正式 Bundle ID/package、Clerk/Apple 控制台配置、商店表单录入、真实 Apple 成功登录和内测包移入 M4-T8，Production Submit 前由 M5-T10 复核。依据 Apple Guideline 4.8，iOS 保留 Google 时同步提供原生 Sign in with Apple；能力未启用时 iOS 同时隐藏两种社交登录，Production 配置强制启用。M0-T0、M4-T8 与 M4 出口继续阻塞，M4-T3a 不回退。
> v1.5 变更：经 Owner 批准，暂不启用 Apple Developer/Google Play Console，将剩余外部账号、正式标识符保留、Apple/Clerk 控制台配置前置到 M5-T9，将商店表单、真实 Apple 成功登录、TestFlight/Play 内测与 Production Submit 统一由 M5-T10 完成。M4-T8 改为并勾选“商店门禁迁移”，只表示计划重排完成，不表示任何商店侧验收通过；M4 出口改为 App 功能、Maestro、双端核心路径与导航真机验收通过，Next Action 推进到 M5-T1。Production 标识候选由 Owner 改为 `ai.chinasupply.mobile`，scheme 保留 `chinasupply`，实际可用性仍须 M5-T9 双平台确认。
> v1.6 变更：经 Owner 批准，展示、营销、占位和编辑配图默认由 Codex 直接生成，无需 Owner 先上传素材或逐张确认版权；生成图必须避免未授权品牌/人物身份，使用准确 alt，并明确标注为 AI-generated illustration，不能作为真实厂区、制造能力、产品、资质、身份或 SOP 事实证据。只有任务明确要求纪实真实性或图片本身承担事实证明时，才需要可追溯真实素材。M5-T2 的 R2 浏览器链允许使用 Owner 批准的 AI 生成展示图，事实核验仍完全依据独立 SOP 与官方来源；未修改 PRD 功能范围、ADM-6 wire contract 或 production 数据门禁。

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

- [x] **M0-T0 非商店外部账号与标识前置**：GitHub、Vercel、Railway、Cloudflare、MapTiler、Clerk Development、Sentry、PostHog、域名/DNS、Google OAuth 基础、App 名称、图标占位、隐私联系邮箱、账单/API 配额及法律文案已完成至 M4 所需范围。**Apple Developer、Google Play Console、正式 iOS Bundle ID/Android package 保留和最终商店图标经 Owner 于 2026-07-29 批准迁移到 M5-T9/M5-T10；本项勾选不表示这些商店前置已完成。**
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
- [x] **M2-T9 Streets v4 2D 底图迁移**：自维护 style JSON 迁移到 MapTiler Planet v4；除把唯一的 `Building 3D` 替换为平面建筑外，标签表达式、道路、交通、POI、配色、线宽、过滤条件、图层顺序与默认相机保持取得的官方 Streets v4 快照原值。官方 `Building` 的 zoom 12–15 2D 样式原样保留，并在 zoom ≥15 延续同款 2D footprint；禁止 `fill-extrusion`、3D 建筑和非零初始 pitch。以提交的 Planet v4 schema manifest 与官方快照语义摘要保持 tileset/source-layer 和视觉一致性护栏，继续禁止运行时 `/maps/{id}/style.json`；产业带 fill 插入首个底图 symbol layer 之前，其余业务图层保持在底图标签之上。Local/Staging 的 Free 仅限测试评估，production Flex 门禁留 M5-T9。**2026-07-26 由 Owner 确认接受已合并实现与全部自动化验收，并将未执行的真实 staging 视觉/资源与 Lighthouse 检查延后人工复核；2026-07-27 Owner 进一步确认以官方视觉一致性取代原“英文优先、建筑仅 zoom ≥15”正规化规则。勾选不表示延后项已通过。**

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
- [x] **M3-T8 e2e**：webhook 重放幂等、删除账户全流程、收藏幂等、favorites cursor 排序。

**M3 出口**：收藏→取消→删除账户全通；webhook 重放无脏数据；未同意时零埋点请求。

---

## M4 App 对等功能与内测（预计 2-2.5 周 + M4-T0 0.5-1 工程日）

- [x] **M4-T0 地图体验诊断与方向稿（M4-T1 前置门禁）**：对应 F-1.1~F-1.7、F-11.2 与 N-1/N-6，本任务只做诊断和方向冻结，不修改 Web/Mobile 业务代码、共享 style JSON、API 或线上数据。固定产出放入 `docs/design/map-experience/`：（1）canonical staging Web 在 1440×900 与 390×844 视口的现状截图；（2）全国/城市/街道三个缩放层级的逐项标注，覆盖底图道路/标签/POI 密度、产业带点/边界/工厂点/聚合层级、搜索/chips/卡片/attribution/Consent 浮层关系；（3）同时对照 staging 真实稀疏数据与仅用于设计评估的 30 产业带/200 工厂本地 fixture 密集态，fixture 不写入 staging/production；（4）至少 2 套可对比方向稿，分别说明视觉层级、品牌感、跨端适配和取舍。所有方向必须留在已冻结 F-1 和共享 Streets v4 2D style 约束内；若需改 zoom 阈值、新增热力图/定位/列表抽屉等需求，必须单独指出 PRD 冲突并停止实现。**验收：诊断、方向稿、比较表与 Owner 选择（或明确保留现基线）均记录在同一 PR；未形成选择记录时不勾选 M4-T0，不开工 M4-T1。**
- [x] **M4-T1 App 地图页**：复用 packages/api-client；MapLibre RN 实现 F-1（底部卡片形态）；attribution 同 M2-T1a。
  - [x] **M4-T1a App 地图数据源与图层**：共享 Streets v4 2D style；MAP-1/2/3 生成客户端数据源；zoom 8/10 分层；500ms 防抖、abort、错误重试与 attribution。
  - [x] **M4-T1b App 聚合、卡片与交互**：工厂聚合与放大、MAP-1/MAP-3 选择、底部卡片补全、truncated 提示、`map_moved` 节流及交互验收。**已使用 preview 环境的真实 iOS/Android 受限 MapTiler key 与 canonical staging API，在 iPhone 17 Pro Simulator（iOS 26.5）和 `diaoyouji_api_36` Android Emulator（API 36）完成底图/attribution、聚合放大、产业带/工厂卡片、关闭、失败/Retry 与无崩溃 smoke。详情 CTA 在 M4-T2b/T2c 原生路由落地前保持可见禁用态；Mobile 真实 PostHog adapter + Consent 不得夹带，须另行批准并先修订本计划。**
- [x] **M4-T2a App 搜索**：完成 F-3.1～F-3.6 RN 实现，并补齐 F-1.6 一级类目 chips；100 字符输入上限、trim + 2 字符门槛、300ms 搜索防抖、三组结果/空态热门类目/错误重试、500ms 类目 MAP 筛选防抖与旧请求取消、二级精确筛选态、产业带 zoom 9/工厂 zoom 13 定位及即时卡片均已落地。**已使用 preview 环境真实平台受限 MapTiler key 与 canonical staging API，在 iPhone 17 Pro Simulator（iOS 26.5）和 `diaoyouji_api_36` Android Emulator（API 36）完成 `led`、`socks`、`sofa`、`家具`、无结果、失败/Retry、一级/二级类目筛选、产业带/工厂定位与卡片、attribution 及无原生崩溃 smoke；A-6 四组 warm 请求均 `<500ms`，101 字符直接请求返回 400。Mobile analytics 继续经共享 facade 且网络 no-op；未接入 PostHog adapter/Consent、详情路由、Maestro 依赖、生产密钥或部署。**
- [x] **M4-T2b App 产业带详情**：F-2 RN 实现。**`/clusters/[slug]`、A-2/A-3、静态 boundary/centroid 小地图、安全 Markdown、工厂 cursor 列表、完整失败/重试态、禁用收藏占位和 `cluster_viewed` facade 已实现；preview 平台受限 key + canonical staging API 的 iPhone 17 Pro / iOS 26.5 Simulator 与 `diaoyouji_api_36` / API 36 Emulator 已通过地图卡片进入、直接深链、boundary/attribution、5 家工厂滚动、返回地图及无崩溃主路径。Markdown、stats、cursor 合并/去重与分页失败由固定 fixture/自动化覆盖。canonical staging 当前没有 description/stats 且单带最多 5 家工厂；真实 Markdown 与 21+ 数据回归按 v1.3 移至 M5 且不阻塞本项，不为触发 cursor 人为扭曲审核数据。未修改 staging 数据。**
- [x] **M4-T2c App 工厂详情**：F-4 RN 实现。**已实现 Expo Router `/factories/[slug]`、A-5 完整状态、图片轮播/可选信息、共享 Streets v4 点位小地图、双语地址复制、安全联系方式、relatedFactories 路由与完整 Retry；地图工厂卡片和产业带工厂列表 CTA 均已启用。preview 平台受限 key + canonical staging API 的 iPhone 17 Pro / iOS 26.5 Simulator 与 `diaoyouji_api_36` / API 36 Emulator 已通过直接深链、A-5、地图/attribution、Website、related 跳转、返回与无崩溃主路径；Android 另通过地址复制反馈及断网失败→恢复后 Retry。图片零/单/多、Unverified、可选信息、Email/Phone/WeChat 与失败态由固定 fixture/自动化覆盖；真实图片必须等待 M5-T1 ADM-6，审核联系方式与双端拨号器复验移至 M5-T2。不会为验收长期发布 unverified 工厂；F-6 真实导航仍留给 M4-T5。未修改 staging 数据。**
- [x] **M4-T3a App 认证与账户页**：Clerk Expo；Account tab 覆盖 F-8.3 全部——邮箱展示、locale（PATCH /me）、登出、删除账户（DELETE /me）；删除/登出后清理本地 token 与缓存。**实现已落地 F-8.1/F-8.3/F-8.4 与 A-9/A-10：Map/Account Tabs 保持地图匿名可用，邮箱验证码注册/登录与 email-code MFA/client trust、Google browser SSO、英语 locale、账户删除二次确认、401 统一 session cleanup 和受保护请求 Bearer 注入均有单测；普通用户 API guard 在完整验证 Clerk JWT 后兼容原生 session token 缺少 `azp`，浏览器 token 仍须精确匹配 Web origin，Admin guard 不放宽。iPhone 17 Pro / iOS 26.5 Simulator 与 `diaoyouji_api_36` / API 36 Emulator 已用独立一次性 Clerk 测试邮箱和官方测试码完成注册→locale 保存→登出→既有用户登录→App DELETE；两端均确认 Clerk 用户不存在、core user tombstone、favorites 为 0 且删除 webhook 成功。Google 原生浏览器打开/取消无错误与成功/取消/失败单测已通过；当前没有可用的非管理员 Google 测试身份完成真实成功 session，该场景不记为已通过。Owner 于 2026-07-28 明确批准以现有双端证据收口，并要求补齐 `createClerkTokenVerifier` 默认/显式 `web-only` 必须向 Clerk SDK 传 `authorizedParties`、`web-or-native` 必须不传，以及 Admin guard 必须省略 policy 的回归断言；上述测试已通过，因此勾选本项并把 Next Action 推进到 M4-T3b。**
- [x] **M4-T3b App 收藏**：Saved tab、收藏/取消、未登录空状态。**完成 F-5.1～F-5.3、F-2.3，并复用 A-8 生成客户端：Tabs 顺序为 Map → Saved → Account；独立 `/sign-in` 仅允许 `/saved`、产业带详情和工厂详情回跳，登录/注册成功自动返回来源。收藏缓存以 `["favorites", clerkUserId]` 隔离，按 20 条不透明 cursor 分页去重，GET/POST/DELETE 均注入 Clerk Bearer；POST 幂等 upsert，DELETE 乐观移除、失败回滚、成功重验，401 走统一 session cleanup，Saved 重新聚焦时主动重验以同步另一设备变更。Factories 默认 tab 与 Industrial clusters tab 覆盖图片/占位、地区、产品、工厂认证、`target=null` 安全卡片、分页继续入口、首屏/续页失败与 Retry；详情页只负责收藏，取消统一在 Saved。iPhone 17 Pro / iOS 26.5 Simulator 与 `diaoyouji_api_36` / API 36 Emulator 使用真实受限 MapTiler key + canonical staging API 完成匿名 Saved→邮箱登录自动回跳、两类详情收藏、双端同账户同步、列表详情、两类取消、断点失败→Retry、重新聚焦跨端同步为空及 401 cleanup；临时收藏和测试账户均已清理，未修改 canonical 内容或 production。自动化覆盖 cursor 去重/边界、不可公开目标、非法回跳、幂等创建、乐观删除/回滚、用户缓存隔离、Bearer 与 401。Next Action 推进到 M4-T4。**
- [x] **M4-T4 Explore tab**：F-10.1。**Tabs 固定为 Map → Explore → Saved → Account；`/explore` 复用 A-7 按服务端顺序展示九个一级类目的双列 color/icon 网格，`/explore/[slug]` 仅接受一级类目并复用 A-1 以 `category=<exact slug>&limit=20` 做不透明 cursor 分页、跨页 ID 去重、自动续页与 Retry，产业带卡进入既有详情且返回恢复列表。加载、空态、非法/二级 slug、首屏/续页失败、图片/占位与 icon 回落均有自动化覆盖。iPhone 17 Pro / iOS 26.5 Simulator 与 `diaoyouji_api_36` / API 36 Emulator 使用真实平台受限 key + canonical staging API 通过九类网格、Electronics/Home Textiles 非空列表、产业带详情往返、Lighting 真实空态及无 App 崩溃 smoke；Android 另通过飞行模式断网失败→恢复网络→Retry。canonical staging 无第二页，cursor 续页仅用固定 fixture 验收，未修改线上数据。Next Action 推进到 M4-T5。**
- [x] **M4-T5 导航 Deep Link**：F-6.3 按 M0-T9 模板 + Web URL 回落 + 埋点；**人工真机验收落点 < 50m（F-6.4）**。**已启用 iOS Google/Apple/高德/百度与 Android Google/高德/百度按钮，直接复用 WGS-84 `buildNavUrl`，高德/百度 App URI 被拒后回落 Web，双重失败显示可恢复错误；每次点击只调用一次不含坐标的共享 `navigation_clicked` facade，Mobile 无 Consent/adapter 时仍为网络 no-op。平台集合、URL/回落/失败/埋点均有固定自动化覆盖。Owner 于 2026-07-29 明确确认已完成 F-6.4 的 13 项 Release 真机矩阵、所有路线规划终点误差均 `<50m`，并批准勾选本项；设备/系统、构建产物与地图 App 版本等逐项原始记录未随本次确认提交仓库，文档仅记录 Owner 验收结论而不补造字段。Next Action 推进到 M4-T6。**
- [x] **M4-T6 Maestro 测试**：启动→地图加载；搜索→产业带→工厂；登录/未登录 Saved；收藏与取消；登出流程 + 一次性 staging 用户的删除账户流程；导航按钮存在且 URL 正确（真机落点仍人工验收）。**新增本地外部 Maestro CLI 主流程与认证、搜索、清理子流程，`app-map-ready` 仅在底图和当前 MAP 数据均完成时暴露；动态 Clerk 测试邮箱、官方测试码、登录回跳、两类收藏/取消、平台按钮集合、登出/重登/二次确认删除均纳入 canonical staging 路径，失败后的 `onFlowComplete` 负责删除已创建用户。iPhone 17 Pro / iOS 26.5 Simulator 与 `diaoyouji_api_36` / Android API 36 Emulator 在同一工作树完整跑绿；只读聚合核验确认全部 M4-T6 Clerk 用户已删除、core 均为 tombstone、favorites 为 0 且删除 webhook receipt 成功。canonical OPPO 名称、WGS-84 坐标及双平台完整 URL 继续由固定单测断言，未用外部地图 App 地址栏替代原始 URL。未修改 API/schema、canonical 内容、EAS、CI 或 production；Next Action 推进到 M4-T7。**
- [x] **M4-T7 商店合规（离线包）**：完成 F-8.1/F-11.1/F-11.4 的代码和离线声明包。iOS 接入 Clerk 原生 Sign in with Apple 并与 Google 同显同隐；`EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED` 在 Production 必须为 `true`。Local/Staging 与 Production 分别打开 canonical privacy/terms，登录前后 Account 均可达且失败可重试。Expo 配置固化 Apple entitlement、无追踪 App Privacy manifest 与依赖聚合出的 required-reason API 原因；Android 关闭备份并移除未使用的存储、悬浮窗和震动权限。`docs/operations/m4-t7-store-compliance.md` 给出 Apple/Google 可离线录入声明、删除路径和外部门禁。自动化覆盖 Apple 成功/取消/失败/回跳、平台显隐、法律 URL/浏览器失败、Production 环境拒绝关闭 Apple，以及原生配置。**本项勾选只代表离线交付完成；未使用 Apple Developer/Play Console，未保留正式标识符，未录入商店控制台，未完成真实 Apple 成功登录，也未发布内测包。Next Action 推进到 M4-T8。**
- [x] **M4-T8 商店门禁迁移（Owner 批准）**：Owner 于 2026-07-29 决定暂不启用 Apple Developer/Google Play Console，并批准把账号、正式标识符保留、Apple capability、Clerk Production/Native Application 配置移到 M5-T9，把商店隐私/Data Safety/账户删除表单、真实 Apple 成功登录、TestFlight/Play 内测和 Production Submit 移到 M5-T10。Production iOS Bundle ID/Android package 候选改为 `ai.chinasupply.mobile`，scheme 保留 `chinasupply`；候选尚未保留，若 M5-T9 任一平台不可用必须停下修订文档，不得自行改名。**本项勾选只表示批准文档与安全配置完成迁移；未访问商店控制台、未接受协议或付款、未完成 Apple 实登、未创建 tag、未触发 EAS、未发布内测包。**

**M4 出口**：App P0 功能与 M4-T7 离线合规包完成；Maestro 套件绿；双端核心路径和导航真机实测通过。TestFlight/Play 内测包及全部商店侧门禁按 Owner 批准迁移到 M5-T9/M5-T10，不作为 M4 出口证据。

---

## M5 内容、数据增强与上线加固（预计 2 周）

- [x] **M5-T1 Admin API 补全**：在 M2-T6 已交付的 Read/Update/verify/publish/unpublish 基础上补 ADM-1/3 Create 与 ADM-6 上传链。**不提供产业带/工厂硬删除**（避免收藏悬空、文章引用失效、溯源丢失）。objectKey 由服务端生成（客户端不得指定路径）；仅 JPEG/PNG/WebP、声明 ≤10MB、限定路径 + 短有效期 presign；上传后服务端 HEAD 复验类型与大小；实体 PATCH 引用 objectKey 时验证对象存在且属于当前环境。验收须以获授权真实图片完成 presign→PUT→HEAD→PATCH→A-5 CDN URL 全链路，不得用 fixture 冒充上传链。**实现 PR #84 已从 main commit `f272747b848f7c4aeaed4558a69eb4b436158bff` 通过 CI、CMS/Core migration、Staging Release Gate 与 Railway 部署；Owner 于 2026-07-29 直接提供并授权真实 JPEG，canonical staging 已完成 ADM-6 presign → PUT → PATCH/HEAD → `/ops` 重新 verify → A-5/CDN，公开响应无 `objectKey` 字段，CDN Content-Type/字节数及下载 SHA-256 均与源图一致。证据见 `docs/operations/m5-t1-admin-uploads.md`；Next Action 推进到 M5-T2。**
- [ ] **M5-T2 /ops 增强**：在 M2-T7 最小后台上补新建表单 + 地图选点 + 图片上传。（导入任务状态 UI 超出 PRD F-9 范围，移入 P1；V1 由 CLI 输出 job ID，日志 + Sentry + R2 报告承担运维。）M5-T1 完成后，通过 `/ops` 对含 Owner 批准展示图及经 SOP 审核 Phone/Email/WeChat 的 staging 工厂完成预览、verify、publish，并复跑 M4-T2c 图片/联系方式分支；展示图可按 v1.6 使用明确标注、不承担事实证明的 AI 生成插图，Phone 另由人工在 iOS/Android 验证系统拨号器接收规范化号码。
- [ ] **M5-T3 搜索列联动**：类目的 name/aliases 修改后触发 BullMQ `regenerate:search-text` 更新关联产业带与工厂（PRD 3.8）；publish/unpublish 的 MAP purge 已由 M2-T6 前置交付。
- [ ] **M5-T4 Payload 文章**：F-7.1 + `/guides`（F-10.2）+ 文章内产业带卡片。
- [ ] **M5-T5 导入增强**：`geocode:factories`（高德 + 转换 + verified=false）。（批量图片与任务监控告警超出 PRD，移入 P1。）
- [ ] **M5-T6 备份**：F-9.3 每日加密 pg_dump → R2、30 天保留；**恢复演练一次并记录**。
- [ ] **M5-T7 静态页与 SEO**：创建 /about；在 production **复核**已上线的 /privacy、/terms（M3-T7）与地图 attribution（M2/M4 已实现，勿重写）；sitemap；空状态/骨架屏与 SEO 核查（F-10.4 / N-2）。
- [ ] **M5-T8 性能与加固**：k6 复测（真实数据量）对照 N-1；限流复核；生产环境变量与密钥审计。若经审核的 canonical staging 自然形成同一产业带 21+ 家 published 工厂，则追加 M4-T2b 第二页 cursor 双端回归；若没有，不得为测试伪造/错配真实数据，API cursor e2e 与 Mobile 固定 fixture 仍是强制门禁，该真实数据回归不阻塞本项或上线。
- [ ] **M5-T8a 生产内容迁移（上线数据来源，唯一实质缺口的补齐项）**：数据三分类贯穿全程——测试/合成、真实未验证、已验证可迁移（curated）。staging 中 synthetic/test 数据使用独立 namespace（slug 前缀或标记），永不导出；以干净 CSV/JSON 为 canonical dataset，只导出 **verified 且 curated** 的 clusters/factories；生成导出 manifest（记录数、slug、校验和、R2 objectKey）；被引用图片复制到 production bucket/prefix；导入 production 保持 draft，production admin 核对 manifest + 抽样后 publish；导入后校验记录数、对象存在性与校验和；Payload articles/media 单独制定导入或生产重录方案。
- [ ] **M5-T9 Production Cutover + 商店账号前置**：先完成 Apple Developer/Google Play Console 注册与人工协议/2FA，验证并保留 Owner 选定的 `ai.chinasupply.mobile` iOS Bundle ID/Android package；任一平台不可用时停止并先修订批准文档。启用 Apple Sign in capability，创建 Clerk Production 与 Native Application/Apple connection。随后将 MapTiler 升级为 Flex 并确认商业授权，创建按正式 Web 域名、iOS Bundle ID、Android package 分别限制的三只 production key，设置账单上限/告警并验证 Planet v4 TileJSON、PBF、glyph、sprite；Free 与 staging key 不得进入 commercial production。最后创建/核对生产 DB、Redis、R2、Cloudflare；生产 migration dry-run；上线前备份；部署 API/Worker/Web；production smoke test；验证 staging 数据未流入 production；记录回滚命令与上一版本。
- [ ] **M5-T10 App 内测与 Production Release**：先替换最终审核通过的商店图标，配置 App Store Connect App Privacy、Google Play Data Safety 与账户删除表单；用真实 Apple 身份在 iOS 真机完成成功登录及既有安全回跳。首次商店构建前将 EAS `appVersionSource` 切到 remote 并为 store build 启用 buildNumber/versionCode 自动递增；显式配置 Android `internal` track 与 TestFlight 内测组。由 tag + 人工批准触发 EAS Production Build/Submit，先发布 TestFlight/Play internal testing，核对安装二进制的数据收集、原生隐私清单、权限、法律入口、Clerk callback 与 M4-T7 离线声明一致；内测通过且二进制无变化后再提交 App Store / Google Play 审核并分阶段或手动发布。验证商店链接与 `chinasupply` URL Scheme；**V1 不做 Universal/App Links，移入 P1**。账号、标识符、控制台表单、真实 Apple 登录或双端内测任一缺失均不得勾选。
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
M4（App 对等 + Maestro + 导航 + 离线商店合规）
 ↓
M5（内容 + 增强 + 备份 + 加固 + 商店内测/发布）──► 上线
```

**工期**：功能完整 staging 验收 9-11 周；**12-14 周为商店内测、Release Candidate 完成并提交审核的目标**，公开上线另受 Apple/Google 账号开通与审核时间影响；若外部账号、法律文案或数据人力不能准时到位，预留 14-16 周。数据是独立关键路径：M1 后剩余约 8 周，需稳定完成每周约 20 家工厂 + 2-3 个产业带的录入核验（按每家 30-60 分钟计，约合每周 10-20 小时专职投入），执行 M1-T8 的《数据核验 SOP》。

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
