# M2-T9 Streets v4 2D 底图迁移

## 决策与范围

- 运行时使用仓库内自行维护的 MapLibre style JSON，不请求 `/maps/{id}/style.json`。
- 数据源固定为 MapTiler Planet v4；底图保留 Streets v4 的完整道路、交通、通用 POI、公交/机场细节、空中缆车、树木、门牌号、交通控制、街道家具、单行箭头及步行/自行车微标签，并使用 ChinaSupply 配色重绘。
- 地名为英语优先、当地名称 fallback。建筑仅在 zoom ≥15 显示淡化 2D footprint；初始 pitch 为 `0`，不存在 `fill-extrusion` 或 3D 相机改动。
- 不修改 MAP-1/2/3、API schema、坐标系、Cloudflare 缓存或 Mobile 功能。

## MapTiler Cloud 与许可证门禁

2026-07-25 在当前 Free 账户创建并保存了 `ChinaSupply Streets v4 Evaluation`。MapTiler 公开指南写明 Free 可创建最多五个 custom styles，并描述了 Download Style 流程；但账户实时控制台把 “Download style” 明确标为 Flex 付费功能。因无法取得同包 `LICENSE.txt` 并确认公开仓库再分发权限，本任务没有复制或派生官方 Streets v4 图层定义，而是依据公开 Planet v4 schema 自行编写等价样式。

Free 仅用于官方允许的开发/staging 测试评估。M5-T9 在 commercial production 前必须升级 Flex、确认商业授权、建立账单上限/告警、创建三平台受限 production keys 并完成真实资源 smoke。

## 回归护栏

- `packages/config/test/fixtures/planet-v4-schema-manifest.json` 记录 Planet v4 TileJSON URL、获取日期与全部 `vector_layers`。
- 单测逐一验证 style 的 `source-layer` 属于 manifest，并锁定 `road`、`road_label`、`country_border`、`sub_border`、`city_label`、`water`、`building` 等关键层。
- 原有托管 style 禁令保持原样；同时拒绝 legacy v3 schema 组合、真实 key、非 MapTiler 远程资源、未知 source-layer、`fill-extrusion` 与非零 pitch。
- MapLibre style validator 必须为零错误；首个 symbol layer 必须等于共享 label anchor。
- Playwright fixture 提供完整 Planet v4 TileJSON manifest、固定 PBF/glyph/sprite 响应，并继续阻断意外外网请求。

## 请求与传输基线

迁移前基线于 2026-07-25 EDT 使用 1280×720 headless Chromium 访问真实 staging 首页取得；统计读取每个 MapTiler response body，因未部署 v4 分支，当前为 v3 基线。

| 阶段      | MapTiler 请求数 |      响应体总量 | 细分                                                                               |
| --------- | --------------: | --------------: | ---------------------------------------------------------------------------------- |
| 迁移前 v3 |              12 | 5,039,391 bytes | TileJSON 1/16,616 B；vector PBF 6/4,621,497 B；glyph 4/384,622 B；other 1/16,656 B |
| 迁移后 v4 | 待 staging 部署 | 待 staging 部署 | 由 `maptiler-performance.json` Playwright attachment 记录                          |

## Staging 验收（合并部署后执行）

- [ ] Planet v4 TileJSON、PBF、glyph、三组实际引用 sprite 均返回 HTTP 200。
- [ ] Playwright attachments 包含中国全境、Dongguan 产业带场景和 zoom 14 工厂详情场景。
- [ ] 人工复核道路/地名/POI 可见、底图不白、产业带边界与工厂点不被底图遮挡、地图保持俯视。
- [ ] 记录迁移后请求数/传输量并与上表 v3 基线比较。
- [ ] 美国网络 Lighthouse 地图首页 LCP `<2.5s`。

上述 staging 与 Lighthouse 项未完成前，`ChinaSupply.AI开发计划.md` 的 M2-T9 保持未勾选。
