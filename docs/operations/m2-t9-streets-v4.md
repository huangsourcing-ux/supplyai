# M2-T9 Streets v4 2D 底图迁移

## 决策与范围

- 运行时使用仓库内自行维护的 MapLibre style JSON，不请求 `/maps/{id}/style.json`。
- 数据源固定为 MapTiler Planet v4；底图使用官方 Streets v4 样式的去 key 快照，保留其完整道路、交通、POI、公交/机场细节、空中缆车、树木、门牌号、街道家具、单行箭头及步行/自行车微标签，不再使用手工仿制配色。
- 标签表达式、配色、线宽、过滤条件、图层顺序与默认相机完全沿用官方快照。官方 `Building` 在 zoom 12–15 的 2D 样式原样保留，并在 zoom ≥15 延续同款 2D footprint 代替唯一的 `Building 3D`；不存在 `fill-extrusion` 或 3D 相机改动。
- 不修改 MAP-1/2/3、API schema、坐标系、Cloudflare 缓存或 Mobile 功能。

## MapTiler Cloud 端点与许可证门禁

2026-07-25 对 MapTiler 网页编辑器 “Download style” 权益的解读不准确：该 UI 权益不等于读取内置 Streets 样式。MapTiler 公开 [Maps API](https://docs.maptiler.com/cloud/api/maps/) 明确文档化 `GET /maps/{mapId}/style.json`，以 `streets-v4` 为示例，并要求传入有效 API key；该端点不是 Flex-only 的 custom-style 下载功能。

2026-07-27 使用受 `staging.chinasupply.ai` 域名限制的 Web public key 实测 `GET https://api.maptiler.com/maps/streets-v4/style.json` 返回 HTTP 200；原始样式为 159 层。key 在内存中立即替换为 `__MAPTILER_KEY__`，没有写入终端输出或仓库。提交快照保留上游授权元数据，且仍只配合 MapTiler Cloud 资源使用；去除唯一 `Building 3D` 层后为 158 层。

Free 仅用于官方允许的开发/staging 测试评估。M5-T9 在 commercial production 前必须升级 Flex、确认商业授权、建立账单上限/告警、创建三平台受限 production keys 并完成真实资源 smoke。

## 回归护栏

- `packages/config/test/fixtures/planet-v4-schema-manifest.json` 记录 Planet v4 TileJSON URL、获取日期与全部 `vector_layers`。
- 单测逐一验证 style 的 `source-layer` 属于 manifest，并锁定 `road`、`road_label`、`country_border`、`sub_border`、`city_label`、`water`、`building` 等关键层。
- 运行时托管 style 请求禁令保持原样；仅在人工审查的快照刷新流程中读取官方端点。测试同时拒绝 legacy v3 schema 组合、真实 key、非 MapTiler 远程资源、未知 source-layer、`fill-extrusion` 与非零 pitch。
- MapLibre style validator 必须为零错误；首个 symbol layer 必须等于共享 label anchor。
- style metadata 记录上游端点、获取日期和去 key 上游 SHA-256；单测锁定 158 层、官方道路/交通/POI 层、完整官方标签表达式、z12–15 官方 2D 建筑和 z15+ 同款平面延续，并用去除允许差异后的语义摘要校验官方视觉一致性。
- Playwright fixture 提供完整 Planet v4 TileJSON manifest、固定 PBF/glyph/sprite 响应，并继续阻断意外外网请求。

## 请求与传输基线

迁移前基线于 2026-07-25 EDT 使用 1280×720 headless Chromium 访问真实 staging 首页取得；统计读取每个 MapTiler response body，因未部署 v4 分支，当前为 v3 基线。

| 阶段      | MapTiler 请求数 |      响应体总量 | 细分                                                                               |
| --------- | --------------: | --------------: | ---------------------------------------------------------------------------------- |
| 迁移前 v3 |              12 | 5,039,391 bytes | TileJSON 1/16,616 B；vector PBF 6/4,621,497 B；glyph 4/384,622 B；other 1/16,656 B |
| 迁移后 v4 | 待 staging 部署 | 待 staging 部署 | 由 `maptiler-performance.json` Playwright attachment 记录                          |

## Staging 延后人工复核

- [ ] Planet v4 TileJSON、PBF、glyph、三组实际引用 sprite 均返回 HTTP 200。
- [ ] Playwright attachments 包含中国全境、Dongguan 产业带场景和 zoom 14 工厂详情场景。
- [ ] 人工复核道路/地名/POI 可见、底图不白、产业带边界与工厂点不被底图遮挡、地图保持俯视。
- [ ] 记录迁移后请求数/传输量并与上表 v3 基线比较。
- [ ] 美国网络 Lighthouse 地图首页 LCP `<2.5s`。

2026-07-26，Owner 确认接受 PR #48 已合并的实现与全绿自动化验收，要求直接勾选 M2-T9，并由 Owner 稍后执行上述真实 staging 与 Lighthouse 复核。清单保持未勾选以如实表示它们尚未执行；M2-T9 任务勾选不得被引用为这些延后检查已通过的证据。

## 2026-07-27 官方快照修复验证

- 受限 staging Web key 与 staging Origin 下，官方 style、Planet v4 TileJSON/PBF、glyph PBF 及三组 sprite JSON/PNG 全部 HTTP 200。
- 使用仓库锁定的 MapLibre GL JS 6.0.0 实渲染 z15.2 东莞场景：158 个底图层全部加载，零 MapLibre error，22 个 MapTiler response 全部 200，pitch/bearing 为 `0/0`，不存在 `fill-extrusion`。
- 合成 boundary fill 成功插入首个官方 symbol layer `Ferry labels` 之前；boundary line 保持在标签之上。截图人工复核确认道路、交通、POI、当时正规化的英文/当地 fallback 标签和淡化 2D 建筑可见；该历史截图不作为 2026-07-27 后官方标签与 z12 建筑规则的验收证据。
- 以上是修复分支的同源资源/渲染 smoke，不伪装成 canonical staging 已部署验收。PR 合并与 staging release gate 后仍须对真实页面复核；美国网络 Lighthouse LCP `<2.5s` 仍未执行。

## 2026-07-27 官方视觉一致性修订

Owner 明确确认撤销“统一英文优先”和“建筑仅 zoom ≥15”两项正规化：标签完全恢复官方 Streets v4 表达式；官方 `Building` 的 zoom 12–15 参数原样恢复，并仅删除 `maxzoom: 15` 使同款平面 footprint 在 z15+ 接替 extrusion。除运行时密钥占位符、ChinaSupply 来源元数据以及这一 3D→2D 转换外，不允许其他底图视觉差异。
