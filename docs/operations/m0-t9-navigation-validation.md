# 《导航验证结论》

> 任务：M0-T9 导航验证门（PRD G-1、F-6.1、F-6.2、N-5）  
> 状态：**人工真机验证通过；正式模板已批准**
> 建立日期：2026-07-23

## 1. 当前结论

产品负责人于 2026-07-23 确认五城、双平台安装态和回落结果可接受，并批准以下最终行为：

- 所有按钮打开“终点已填充的路线规划页”，由用户选择起点、交通方式并决定何时开始导航；不得强制直接进入实时导航。
- Apple、Google、高德和百度的主链接与 Web fallback 均使用 WGS-84。北京的 GCJ-02/BD-09 对照也能正确落点，但不采用额外转换步骤。
- Apple 和 Google 的 HTTPS Map URL 同时承担 App 调起与浏览器回落。
- 高德使用 iOS/Android 路线规划 URI；Web 使用 `uri.amap.com/navigation` 且 `callnative=0`。
- 百度 App 使用 `baidumap://map/direction`；Web `direction` 在移动端丢失参数，故采用已验证的官方 `marker` 页面，由用户点击“到这去/导航”继续规划。
- 当前发布前 `<50m` 结论由产品负责人人工确认；F-6.4 仍要求 M4-T5 使用 Release 包重新执行。

`packages/geo/navigation` 据此固化 `buildNavUrl(target, wgs84, gcj02?)`。Web/Mobile 只能消费返回结果，不得自行拼接供应商 URL。

## 2. 官方候选规范

候选链接仅用于比较，不代表最终选择：

- Apple：[Map Links](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html)
- Google：[Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- 高德：[URI API 路径规划](https://lbs.amap.com/api/uri-api/guide/travel/route)、[iOS 路径规划](https://lbs.amap.com/api/amap-mobile/guide/ios/route)、[Android 路径规划](https://lbs.amap.com/api/amap-mobile/guide/android/route)
- 百度：[地图调起 API](https://lbsyun.baidu.com/docs/webapi?title=mapadjustment%2Furi)

正式实现只能采用下面真机矩阵中通过的路线规划模板和坐标模式。

### 2.1 真机观察

2026-07-23，iPhone 16 / iOS 26.5：

- 北京百度地图旧版 `navi` 测试链接的 WGS-84、GCJ-02、BD-09 三个候选均可直接进入路线图，终点地址肉眼观察接近。
- 产品负责人随后确认 iOS 五城四目标均通过，正式实现采用 `direction` 路线规划模板而非旧 `navi`。

2026-07-23，Xiaomi Redmi K70 Pro ALSC / Android 16：

- 高德 `amapuri://route/plan/` 的 WGS-84（`dev=1`）候选在五城均直接进入驾车路线页，终点显示对应场馆名称。
- 百度 `baidumap://map/direction` 的 WGS-84（`coord_type=wgs84`）候选在五城均直接进入驾车路线页，终点显示对应场馆名称。
- 北京对照中，高德 GCJ-02、百度 GCJ-02 和百度 BD-09 也均显示“国家会议中心”，未观察到系统性偏移。由于 WGS-84 已覆盖五城且转换步骤更少，正式规则采用 WGS-84。
- 高德 Web fallback 在浏览器预填“国家会议中心”，可填写起点或授权当前位置后继续规划。
- 百度 `direction` Web 候选在移动端丢失路线参数，判定失败；改用官方 `marker` Web URI 后显示“国家会议中心”标点，并提供“到这去/导航”，判定为合格 fallback 候选。
- 连接的 Android 真机未安装 Google Maps，且首次网络返回 `ERR_CONNECTION_ABORTED`；产品负责人补充确认已在可用设备/网络完成 Google 安装态及 Web 回落复测并通过。
- 产品负责人确认五城导航落点和 `<50m` 目标可接受；M4-T5 仍需重新执行 F-6.4 发布验收。

## 3. 五城入口确认

人工确认点位于 `m0-t9-navigation-points.json`，并同步固化为 `NAVIGATION_VALIDATION_FIXTURES`。

| 城市 | 目标                 | 主入口说明             | WGS-84 `[lng, lat]`         | 确认人/日期                |
| ---- | -------------------- | ---------------------- | --------------------------- | -------------------------- |
| 北京 | 国家会议中心         | 人工确认的驾车导航落点 | `[116.3838387, 39.9984707]` | Product owner / 2026-07-23 |
| 上海 | 国家会展中心（上海） | 人工确认的驾车导航落点 | `[121.2971952, 31.1920509]` | Product owner / 2026-07-23 |
| 义乌 | 义乌国际商贸城一区   | 人工确认的驾车导航落点 | `[120.0981625, 29.3306899]` | Product owner / 2026-07-23 |
| 深圳 | 深圳会展中心         | 人工确认的驾车导航落点 | `[114.0547472, 22.5335041]` | Product owner / 2026-07-23 |
| 东莞 | 广东现代国际展览中心 | 人工确认的驾车导航落点 | `[113.6522266, 22.9030947]` | Product owner / 2026-07-23 |

## 4. 生成候选测试页

确认五个入口后运行：

```bash
pnpm --filter @chinasupply/geo navigation:validation -- \
  --output /tmp/m0-t9-navigation-validation.html
```

仅查看候选中心点预览：

```bash
pnpm --filter @chinasupply/geo navigation:validation -- \
  --allow-unconfirmed \
  --output /tmp/m0-t9-navigation-validation-preview.html
```

测试页会为每个城市生成 16 种候选组合：

- iOS：Apple WGS-84/GCJ-02；Google WGS-84/GCJ-02；高德 WGS-84/GCJ-02；百度 WGS-84/GCJ-02/BD-09。
- Android：Google WGS-84/GCJ-02；高德 WGS-84/GCJ-02；百度 WGS-84/GCJ-02/BD-09。

它不会选择或导出任何正式导航规则。

## 5. 设备与 App 版本

| 平台    | 真机型号                  | OS 版本    | Apple Maps             | Google Maps                | 高德地图                   | 百度地图                   | 测试人/日期                |
| ------- | ------------------------- | ---------- | ---------------------- | -------------------------- | -------------------------- | -------------------------- | -------------------------- |
| iOS     | iPhone 16                 | iOS 26.5   | 系统 App，版本号未读取 | 人工确认通过，版本号未提供 | 人工确认通过，版本号未提供 | 人工确认通过，版本号未提供 | Product owner / 2026-07-23 |
| Android | Xiaomi Redmi K70 Pro ALSC | Android 16 | 不适用                 | 外部设备复测，版本号未提供 | 16.19.0.2012               | 21.14.0                    | Product owner / 2026-07-23 |

## 6. 安装态矩阵（35 项）

每项必须记录：选中的候选坐标模式、是否打开正确 App、是否进入终点已填充的路线规划页、落点误差、证据和结论。进入路线规划即为预期行为，不要求自动开始实时导航。

| ID            | 城市 | 平台    | 目标   | 候选模式                    | App 调起 | 导航结果 | 误差（m） | 证据                     | 结论                        |
| ------------- | ---- | ------- | ------ | --------------------------- | -------- | -------- | --------- | ------------------------ | --------------------------- |
| IOS-BJ-APPLE  | 北京 | iOS     | Apple  | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-BJ-GOOGLE | 北京 | iOS     | Google | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-BJ-AMAP   | 北京 | iOS     | 高德   | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-BJ-BAIDU  | 北京 | iOS     | 百度   | WGS/GCJ/BD 均可调起         | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；最终模式/误差待补 |
| AND-BJ-GOOGLE | 北京 | Android | Google | 待测                        | 待测     | 待测     | 待测      | 待补                     | 待定                        |
| AND-BJ-AMAP   | 北京 | Android | 高德   | WGS-84 / `dev=1`            | 是       | 驾车路线 | 未量化    | ADB 调起与真机截图       | 模板/场馆通过；入口误差待测 |
| AND-BJ-BAIDU  | 北京 | Android | 百度   | WGS-84 / `coord_type=wgs84` | 是       | 驾车路线 | 未量化    | ADB 调起与真机截图       | 模板/场馆通过；入口误差待测 |
| IOS-SH-APPLE  | 上海 | iOS     | Apple  | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-SH-GOOGLE | 上海 | iOS     | Google | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-SH-AMAP   | 上海 | iOS     | 高德   | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-SH-BAIDU  | 上海 | iOS     | 百度   | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| AND-SH-GOOGLE | 上海 | Android | Google | 待测                        | 待测     | 待测     | 待测      | 待补                     | 待定                        |
| AND-SH-AMAP   | 上海 | Android | 高德   | WGS-84 / `dev=1`            | 是       | 驾车路线 | 未量化    | ADB 调起与真机截图       | 模板/场馆通过；入口误差待测 |
| AND-SH-BAIDU  | 上海 | Android | 百度   | WGS-84 / `coord_type=wgs84` | 是       | 驾车路线 | 未量化    | ADB 调起与真机截图       | 模板/场馆通过；入口误差待测 |
| IOS-YW-APPLE  | 义乌 | iOS     | Apple  | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-YW-GOOGLE | 义乌 | iOS     | Google | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-YW-AMAP   | 义乌 | iOS     | 高德   | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-YW-BAIDU  | 义乌 | iOS     | 百度   | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| AND-YW-GOOGLE | 义乌 | Android | Google | 待测                        | 待测     | 待测     | 待测      | 待补                     | 待定                        |
| AND-YW-AMAP   | 义乌 | Android | 高德   | WGS-84 / `dev=1`            | 是       | 驾车路线 | 未量化    | ADB 调起与真机截图       | 模板/场馆通过；入口误差待测 |
| AND-YW-BAIDU  | 义乌 | Android | 百度   | WGS-84 / `coord_type=wgs84` | 是       | 驾车路线 | 未量化    | ADB 调起与真机截图       | 模板/场馆通过；入口误差待测 |
| IOS-SZ-APPLE  | 深圳 | iOS     | Apple  | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-SZ-GOOGLE | 深圳 | iOS     | Google | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-SZ-AMAP   | 深圳 | iOS     | 高德   | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-SZ-BAIDU  | 深圳 | iOS     | 百度   | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| AND-SZ-GOOGLE | 深圳 | Android | Google | 待测                        | 待测     | 待测     | 待测      | 待补                     | 待定                        |
| AND-SZ-AMAP   | 深圳 | Android | 高德   | WGS-84 / `dev=1`            | 是       | 驾车路线 | 未量化    | ADB 调起与真机截图       | 模板/场馆通过；入口误差待测 |
| AND-SZ-BAIDU  | 深圳 | Android | 百度   | WGS-84 / `coord_type=wgs84` | 是       | 驾车路线 | 未量化    | ADB 调起与真机截图       | 模板/场馆通过；入口误差待测 |
| IOS-DG-APPLE  | 东莞 | iOS     | Apple  | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-DG-GOOGLE | 东莞 | iOS     | Google | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-DG-AMAP   | 东莞 | iOS     | 高德   | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| IOS-DG-BAIDU  | 东莞 | iOS     | 百度   | 模式未记录                  | 是       | 路线规划 | 未量化    | 用户人工确认，2026-07-23 | 人工通过；模式/误差待补     |
| AND-DG-GOOGLE | 东莞 | Android | Google | 待测                        | 待测     | 待测     | 待测      | 待补                     | 待定                        |
| AND-DG-AMAP   | 东莞 | Android | 高德   | WGS-84 / `dev=1`            | 是       | 驾车路线 | 未量化    | ADB 调起与真机截图       | 模板/场馆通过；入口误差待测 |
| AND-DG-BAIDU  | 东莞 | Android | 百度   | WGS-84 / `coord_type=wgs84` | 是       | 驾车路线 | 未量化    | ADB 调起与真机截图       | 模板/场馆通过；入口误差待测 |

### 6.1 最终人工确认

上表保留逐次测试时的原始记录。产品负责人随后对未量化/待复测项完成统一复核，以下最终确认覆盖 35 个安装态 ID：

| 城市 | iOS（Apple/Google/高德/百度） | Android（Google/高德/百度） | 正式坐标模式 | 结果   |
| ---- | ----------------------------- | --------------------------- | ------------ | ------ |
| 北京 | 4/4 通过                      | 3/3 通过                    | WGS-84       | `<50m` |
| 上海 | 4/4 通过                      | 3/3 通过                    | WGS-84       | `<50m` |
| 义乌 | 4/4 通过                      | 3/3 通过                    | WGS-84       | `<50m` |
| 深圳 | 4/4 通过                      | 3/3 通过                    | WGS-84       | `<50m` |
| 东莞 | 4/4 通过                      | 3/3 通过                    | WGS-84       | `<50m` |

所有 35 项均进入终点已填充的路线规划或等效“到这去”页面，不自动开始实时导航。

## 7. 未安装回落矩阵（6 项）

选择一座已完成安装态验证的城市，在移除或禁用目标 App 后测试。

| ID            | 平台    | 目标   | 测试城市 | 打开 Web | 目的地正确 | 可继续路线规划 | 证据                  | 结论              |
| ------------- | ------- | ------ | -------- | -------- | ---------- | -------------- | --------------------- | ----------------- |
| FB-IOS-GOOGLE | iOS     | Google | 北京     | 是       | 是         | 是             | 产品负责人人工确认    | 通过              |
| FB-IOS-AMAP   | iOS     | 高德   | 北京     | 是       | 是         | 是             | 产品负责人人工确认    | 通过              |
| FB-IOS-BAIDU  | iOS     | 百度   | 北京     | 是       | 是         | 是（“到这去”） | 产品负责人人工确认    | `marker` 通过     |
| FB-AND-GOOGLE | Android | Google | 北京     | 是       | 是         | 是             | 可用网络/设备人工复测 | 通过              |
| FB-AND-AMAP   | Android | 高德   | 北京     | 是       | 是         | 是             | ADB 调起与真机截图    | 通过              |
| FB-AND-BAIDU  | Android | 百度   | 北京     | 是       | 是         | 是（“到这去”） | ADB 调起与真机截图    | `marker` 候选通过 |

## 8. 已批准的最终映射

以下映射由产品负责人于 2026-07-23 批准：

| 平台    | 目标   | 主链接模板                    | 主链接坐标模式 | Web 回落模板                      | 回落坐标模式 | 五城最大误差 | 批准人/日期                |
| ------- | ------ | ----------------------------- | -------------- | --------------------------------- | ------------ | ------------ | -------------------------- |
| iOS     | Apple  | `https://maps.apple.com/`     | WGS-84         | 同主链接                          | WGS-84       | `<50m`       | Product owner / 2026-07-23 |
| iOS     | Google | `https://www.google.com/maps` | WGS-84         | 同主链接                          | WGS-84       | `<50m`       | Product owner / 2026-07-23 |
| iOS     | 高德   | `iosamap://path`              | WGS-84         | `https://uri.amap.com/navigation` | WGS-84       | `<50m`       | Product owner / 2026-07-23 |
| iOS     | 百度   | `baidumap://map/direction`    | WGS-84         | `http://api.map.baidu.com/marker` | WGS-84       | `<50m`       | Product owner / 2026-07-23 |
| Android | Google | `https://www.google.com/maps` | WGS-84         | 同主链接                          | WGS-84       | `<50m`       | Product owner / 2026-07-23 |
| Android | 高德   | `amapuri://route/plan/`       | WGS-84         | `https://uri.amap.com/navigation` | WGS-84       | `<50m`       | Product owner / 2026-07-23 |
| Android | 百度   | `baidumap://map/direction`    | WGS-84         | `http://api.map.baidu.com/marker` | WGS-84       | `<50m`       | Product owner / 2026-07-23 |

若多个候选均通过，按以下顺序选择：

1. 五城最大落点误差更小；
2. 官方文档明确支持；
3. 主链接和 Web 回落使用同一坐标模式；
4. 转换步骤更少。

任何后续模板或坐标模式变更都必须重新执行真机验证，不得凭经验修改。

## 9. 门禁完成条件

- [x] 五个主入口 WGS-84 坐标经人工确认
- [x] iOS/Android 真机与地图 App 版本/可得版本信息已记录
- [x] 35 个安装态用例全部完成
- [x] 6 个未安装回落用例全部完成
- [x] 最终映射经人工批准
- [x] `packages/geo/navigation` 按批准映射实现
- [x] 五城夹具单测和全仓检查通过
- [x] M0-T9 在开发计划中勾选
- [x] `开发日志.md` 追加真实完成记录

F-6.4 的发布前 `< 50m` 真机验收仍必须在 M4-T5 重做，本任务结果不能替代发布验收。
