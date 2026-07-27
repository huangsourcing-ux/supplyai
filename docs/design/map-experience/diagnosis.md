# M4-T0 地图体验诊断

## 诊断结论

当前稀疏基线在三层级均可完成 F-1 主路径，attribution 也持续可见；主要问题是业务数据的辨识度与界面占用没有为 30 个产业带 / 200 家工厂的首发密度预留足够层级。全国层级点过轻，城市与街道层级 boundary 填充过强，移动卡片和 Consent 又显著压缩有效地图区域。

本诊断不改变功能合同。所有改进候选都留在现有 MAP-*、zoom 8/10 阈值、Streets v4 2D 和现有浮层模型内。

## 证据索引

| 编号 | 证据                                                                                                                                    | 主要观察                                                                                                                                                                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E-01 | [桌面现状标注](assets/annotations/desktop-current.png)、[移动全国原图](assets/baseline/mobile/nationwide.png)                           | 2 点稀疏基线下，产业带点面积小、无常驻名称/数量，搜索与 chips 的视觉权重更高。                                                                                                                                                                       |
| E-02 | [桌面密度联系表](assets/density/desktop-sparse-vs-dense.png)、[移动密度联系表](assets/density/mobile-sparse-vs-dense.png)               | 30 点集中在东部沿海，多点邻近或重叠；颜色能表达类目，但不能表达聚集数量。                                                                                                                                                                            |
| E-03 | [桌面城市原图](assets/baseline/desktop/city-z9.png)、[桌面密集城市原图](assets/dense/desktop/city-z9.png)                               | z9 半透明 boundary 在大面积覆盖时先于道路和地名成为主视觉；密集态多个 boundary 叠加后更明显。                                                                                                                                                        |
| E-04 | [桌面街道原图](assets/baseline/desktop/street-z13.png)、[移动密集街道原图](assets/dense/mobile/street-z13.png)                          | z13 填充覆盖道路、公交、POI 与当地名称；工厂点/聚合点同时进入，信息层级拥挤。                                                                                                                                                                        |
| E-05 | [移动现状标注](assets/annotations/mobile-current.png)                                                                                   | 390px 下 chips 横向裁切，搜索框、chips 与 zoom controls 占据同一顶部安全区。                                                                                                                                                                         |
| E-06 | [桌面街道原图](assets/baseline/desktop/street-z13.png)                                                                                  | Web 右侧卡片位置稳定，但无图片时仍保留大块空白 header，降低地图可视面积效率。                                                                                                                                                                        |
| E-07 | [移动城市原图](assets/baseline/mobile/city-z9.png)、[移动街道原图](assets/baseline/mobile/street-z13.png)                               | 移动底部卡片约占半屏，选择点附近的道路和 boundary 上下文被遮挡；无图片空白进一步放大占用。                                                                                                                                                           |
| E-08 | [桌面 Consent 原图](assets/baseline/desktop/street-z13-consent.png)、[移动 Consent 原图](assets/baseline/mobile/street-z13-consent.png) | 桌面 Consent 与右侧卡片可并存但压缩地图；移动 Consent 直接覆盖卡片主体。                                                                                                                                                                             |
| E-09 | [全部原始截图及 manifest](assets/capture-manifest.json)                                                                                 | MapTiler 与 © OpenStreetMap contributors attribution 在 14 张原图中均保留并可见，当前底部区域仍需作为不可遮挡安全区。                                                                                                                                |
| E-10 | 2026-07-27 canonical 键盘走查                                                                                                           | 实际 Tab 顺序为导航 → Map canvas → zoom/compass → search → chips → attribution；搜索暴露 combobox/listbox/option，卡片暴露 complementary/close/link，Consent 暴露 close/privacy/reject/allow。canvas 可聚焦，但地图要素本身没有独立可聚焦 DOM 节点。 |
| E-11 | [两套方向稿](README.md#审阅入口)                                                                                                        | 两套方向都可只用现有资源与 MapLibre 图层完成；美国网络 LCP 未在本任务实测，N-1 门禁继续未完成。                                                                                                                                                      |

## 按 PRD 条目诊断

| PRD    | 问题与影响                                                                                                                                                                                                | 证据       | 方向约束                                                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| F-1.1  | 初始全境的 10px 左右产业带点对地图背景过轻；2 点时尚可发现，30 点时东部沿海发生密集冲突且无法读出聚集数量。用户难以从“搜产品”快速建立产业带分布心智。                                                     | E-01、E-02 | 保留 MAP-1 与类目色。A 用白描边和有限的数量识别；B 用双层点强调。均不增加热力图或 DOM marker。                                               |
| F-1.2  | z9 boundary 的 fill 面积大、饱和度高，覆盖后道路与地名退到次层；30 个设计 boundary 同屏时叠色进一步抢占层级。                                                                                             | E-03       | 保留 zoom `≥8`。A 降低 fill、维持清晰边线；B 轮廓优先、仅保留低透明 fill。                                                                   |
| F-1.3  | z13 的 boundary、完整 POI/道路标签、工厂点与聚合点同时出现。现有橙色聚合点可读，但业务层与蓝色 fill、底图黑色道路牌和大量 POI 竞争。                                                                      | E-04       | 保留 zoom `≥10`、现有聚合点击放大和 truncated 提示。只调整 MapLibre paint/layer emphasis，不改 MAP-3 或聚合算法。                            |
| F-1.4  | 桌面侧卡可用，但无图片空白过大；移动产业带卡覆盖大面积 boundary 与地图上下文。                                                                                                                            | E-06、E-07 | 桌面继续右侧卡，移动继续底部卡。没有图片时不保留大块空占位；信息与 CTA 仍完整。                                                              |
| F-1.5  | 工厂卡与 F-1.4 相同，街道场景的遮挡成本更高；移动卡打开后选择点常被卡片本身遮住。                                                                                                                         | E-04、E-07 | 只压缩无图片态与信息间距，不删除 Verified、主产品、详情入口或补全状态。                                                                      |
| F-1.6  | 桌面居中搜索清晰；移动搜索、chips、zoom controls 同时占据顶部，chips 需要横向发现且末项裁切。                                                                                                             | E-05       | A 延续居中搜索/横向 chips；B 采用左上品牌控制组。两者都保留单选 chips 和 category 参数，不改搜索功能。                                       |
| F-1.7  | 当前视觉方向不需要改变 500ms 防抖、abort 或 `map_moved` 十秒节流；密集态只证明刷新后层级压力更高。                                                                                                        | E-02～E-04 | M4-T1 实现必须复用现有刷新与埋点约束；M4-T0 不做运行时变更。                                                                                 |
| F-11.2 | attribution 始终可见，但在移动卡片/Consent 打开时落入最拥挤的底部安全区；未来任何卡片压缩都不能以隐藏 attribution 换空间。                                                                                | E-07～E-09 | 两套方向都为 attribution 留出永久底边，不改变链接或归属文案。                                                                                |
| N-1    | 当前任务没有美国网络 LCP 测量，不能声明 `<2.5s` 已通过。A 主要改现有 paint 与 CSS；B 可能多一个 MapLibre circle/outline draw pass，但不新增外部资源、API 请求或 DOM marker。                              | E-11       | 方向冻结只评估相对渲染成本；真实 LCP 继续作为既有未完成人工/性能门禁。                                                                       |
| N-6    | 所有现有控件可键盘到达并有 `:focus-visible` 样式；视觉顺序与 DOM 顺序并不完全一致（zoom 在 search 前）。canvas 可聚焦，但点、boundary、聚合点无法逐个键盘聚焦，必须依赖可键盘操作的搜索列表作为替代入口。 | E-10       | 两套方向必须保留 combobox/listbox/option、chips、zoom、卡片、attribution、Consent 的语义和 focus ring；不得把业务点改成不可控的 DOM marker。 |

## 视口与浮层安全区

### Desktop 1440×900

- 顶部导航 64px 后，搜索框与 chips 居中，占据地图首屏最高注意力区。
- zoom controls 在右上方，不与搜索直接重叠；侧卡打开后位于右侧，仍能保留主要地图视野。
- Consent 位于左下，与右侧卡不直接重叠，但两块浮层同时出现时可用地图面积明显下降。
- attribution 位于右下。任何侧卡或未来样式调整都必须留出其可见、可点击区域。

### Mobile 390×844

- 顶部导航、搜索、chips 和 zoom controls 形成连续控制带；chips 的后续类别不在首屏可见范围。
- 产业带/工厂卡片打开后约占半屏，无图片空白使有效信息密度偏低。
- Consent 打开后覆盖卡片主体；用户仍可操作 Consent，但无法同时理解当前选择上下文。
- attribution 在底部仍可见，已接近卡片与 Consent 的冲突边界，不能继续向下压缩。

## 无障碍走查记录

2026-07-27 在 canonical staging 桌面视口进行了只读键盘与语义快照检查：

1. Tab 可依次到达主导航、Map canvas、zoom in、zoom out、compass、search、全部 category chips 和 attribution 链接。
2. search 为 `combobox`，展开后有命名为 “Search results” 的 `listbox`，产业带/工厂结果为 `option`。
3. 工厂卡为带名称的 `complementary`，包含 “Close details” 按钮与 “View factory details” 链接。
4. Analytics/Consent 面板包含关闭按钮、Privacy Policy 链接、Reject 和 Allow 按钮，并有独立 focus ring。
5. MapLibre canvas 为可聚焦 `region`，但 canvas 内的产业带点、boundary、工厂点和聚合点不是独立 DOM 元素，无法逐要素 Tab 聚焦。这是当前技术形态的真实限制，不在 M4-T0 中伪装为已解决。

## 不在本任务解决的事项

- 美国网络 Web LCP `<2.5s` 未实测，N-1 仍未通过本任务验收。
- 未做 Mobile 原生实现或真机验证；本任务只用 canonical Web 在两种固定视口做设计诊断。
- 未改变 style JSON、zoom 阈值、MAP-*、搜索、cards、Consent、attribution 或 analytics 行为。
- 右侧 Sentry feedback 浮签在部分截图中与地图浮层竞争，但属于监控集成的相邻问题，不扩展进 M4-T0 方向范围。
