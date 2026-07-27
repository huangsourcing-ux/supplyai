# M4-T0 方向比较

## 方向 A — Marketplace Clarity

![Direction A — Marketplace Clarity](assets/directions/direction-a-marketplace-clarity.png)

方向 A 延续当前白色/青绿色 marketplace 基线，把变化集中在业务点、boundary 和卡片密度上。

- 全国：产业带点增加稳定白描边与更强对比；密集冲突处允许以 MapLibre symbol/circle 表达有限数量识别，不引入 DOM marker。
- 城市：boundary 降低填充不透明度，保留清晰边线，让道路、交通和地名回到首要参照层。
- 街道：工厂点/聚合点保持现有模型；选中点使用轻量外圈，boundary 不再把整片道路染成主色。
- Desktop：保留居中搜索、横向 chips 和右侧卡片。
- Mobile：保留顶部搜索/横向 chips 和底部卡片，但压缩无图片态；没有 cover 时不保留大块空白。
- 品牌感：轻、清晰、接近现基线，内容发现优先。

## 方向 B — Industrial Atlas

![Direction B — Industrial Atlas](assets/directions/direction-b-industrial-atlas.png)

方向 B 采用更强的深绿 atlas 框架，把控制组与业务数据从详细底图中明确分层。

- 全国：业务点使用双层视觉（核心类目色 + 品牌外环/halo），在沿海密集区域保持识别。
- 城市：boundary 轮廓优先，仅保留低透明 fill；底图道路与标签作为 atlas 参照层持续完整。
- 街道：双层工厂/聚合点与深绿控制框架形成一致的数据层，不改变 MapLibre cluster 行为。
- Desktop：搜索与 chips 左上对齐成控制组，侧卡增加品牌标题区。
- Mobile：深绿控制组仍位于顶部，卡片压缩为信息优先布局；不引入抽屉。
- 品牌感：更明确、更“工业地图”，与当前白色 marketplace 基线差异更大。

## 横向比较

| 维度                    | 保留现基线                     | Direction A                               | Direction B                                            |
| ----------------------- | ------------------------------ | ----------------------------------------- | ------------------------------------------------------ |
| 全国 30 点辨识          | 点轻、无数量层级，沿海冲突明显 | 白描边与有限数量识别，改善直接            | 双层 halo 最强，密集态识别最好                         |
| boundary / Streets 层级 | fill 主导，城市/街道道路被压低 | 更低 fill + 清晰边线                      | 轮廓优先 + 极低 fill                                   |
| 搜索与 chips            | 桌面居中；移动横向裁切         | 保留现模型，调整间距/安全区               | 左上品牌控制组，结构变化更大                           |
| Desktop 卡片            | 右侧；无图时仍有大空白         | 右侧紧凑无图态                            | 右侧品牌标题区，信息层级更强                           |
| Mobile 卡片             | 约半屏，遮挡选择上下文         | 更紧凑的底部卡片                          | 最紧凑的信息优先卡片                                   |
| Consent 关系            | 移动覆盖卡片主体               | 缩短卡片后减轻覆盖，但仍保持 Consent 优先 | 同样减轻覆盖；品牌控制区占顶部更多空间                 |
| Attribution             | 可见，底部空间紧张             | 保留永久底边                              | 保留永久底边                                           |
| N-6                     | 控件可达；地图要素不可逐项聚焦 | 保留现有语义和 focus ring                 | 保留现有语义和 focus ring                              |
| N-1 相对成本            | 既有基线                       | 低：主要调整现有 paint/CSS                | 低至中：可能增加一个 MapLibre circle/outline draw pass |
| 外部资源/API/DOM marker | 无新增                         | 无新增                                    | 无新增                                                 |
| 实现风险                | 无变化，但密集问题保留         | 低；视觉回归面较小                        | 中；跨端控制组、品牌框架和颜色回归面更大               |
| 品牌变化                | 无                             | 连续、克制                                | 明显、编辑化                                           |

## 密集态取舍

[桌面密集联系表](assets/density/desktop-sparse-vs-dense.png)和[移动密集联系表](assets/density/mobile-sparse-vs-dense.png)显示：

- 全国层级不宜用更大的实心点简单解决问题，否则东部沿海会形成更严重遮挡。A 用白描边和克制的数量识别；B 用 halo 分离底图，二者都避免热力图。
- 城市层级的主要矛盾不是 boundary 缺失，而是 fill 与道路/标签的权重。两套方向都降低 fill；B 更偏轮廓。
- 街道层级已有 MapLibre cluster 可表达工厂密度。方向稿只改善工厂点、聚合点与 boundary 的相互层级，不改算法或 MAP-3。
- 移动卡片必须更紧凑，但不能删除名称、数量/Verified、主产品、补全状态或详情 CTA。

## 冻结合同

无论 Owner 选择 A、B 或保留现基线，以下内容都不属于 M4-T1 的可自由改动项：

- zoom 8/10 阈值；
- MAP-1/MAP-2/MAP-3 输入、响应、缓存或刷新模型；
- Streets v4 2D、完整道路/交通/POI、官方标签表达式、零 pitch；
- 搜索、单选 chips、选择卡片、Consent、attribution 的存在与功能；
- 新增热力图、定位、列表抽屉、新 API、外部视觉资源或 DOM marker。

如果后续实施需要突破上述任一项，必须按冻结文档流程明确 PRD 冲突并停止实现，不能把它解释为本方向的隐含授权。

## Owner 选择规则

本比较不代替 Owner 决策。请在 Draft PR 中明确回复 `Direction A`、`Direction B` 或 `Keep baseline`。混合方案必须先补成可视化 `Direction C` 再重新选择。
