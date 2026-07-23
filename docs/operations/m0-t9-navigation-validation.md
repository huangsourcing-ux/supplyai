# 《导航验证结论》

> 任务：M0-T9 导航验证门（PRD G-1、F-6.1、F-6.2、N-5）  
> 状态：**待人工真机验证；不得据此实现正式导航模板**  
> 建立日期：2026-07-23

## 1. 当前结论

尚无可批准的导航坐标或 URL 结论。

2026-07-23 的开发环境检查未发现可控 iPhone 或 Android 真机：

- `xcrun devicectl list devices`：`No devices found`
- `adb devices -l`：无 Android 设备
- 可用 iOS Simulator 不得替代 F-6.1 真机门禁

因此：

- `packages/geo/navigation` 和公开 `buildNavUrl` 暂不实现；
- `ChinaSupply.AI开发计划.md` 中 M0-T9 保持未勾选；
- M4 导航继续受阻塞；
- 本文件当前只是测试工作表，不是已验证结论。

## 2. 官方候选规范

候选链接仅用于比较，不代表最终选择：

- Apple：[Map Links](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html)
- Google：[Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- 高德：[URI API 路径规划](https://lbs.amap.com/api/uri-api/guide/travel/route)、[iOS 路径规划](https://lbs.amap.com/api/amap-mobile/guide/ios/route)、[Android 路径规划](https://lbs.amap.com/api/amap-mobile/guide/android/route)
- 百度：[地图调起 API](https://lbsyun.baidu.com/docs/webapi?title=mapadjustment%2Furi)

正式实现只能采用下面真机矩阵中通过的模板和坐标模式。

## 3. 五城入口确认

候选中心点位于 `m0-t9-navigation-points.json`。测试者必须先把它们替换为可驾车到达的主入口 WGS-84 坐标，并填写 `confirmed`、`confirmedBy`、`confirmedAt`。

| 城市 | 目标                 | 主入口说明 | WGS-84 `[lng, lat]` | 确认人/日期 |
| ---- | -------------------- | ---------- | ------------------- | ----------- |
| 北京 | 国家会议中心         | 待确认     | 待确认              | 待确认      |
| 上海 | 国家会展中心（上海） | 待确认     | 待确认              | 待确认      |
| 义乌 | 义乌国际商贸城一区   | 待确认     | 待确认              | 待确认      |
| 深圳 | 深圳会展中心         | 待确认     | 待确认              | 待确认      |
| 东莞 | 广东现代国际展览中心 | 待确认     | 待确认              | 待确认      |

未完成本表前，测试页只能使用 `--allow-unconfirmed` 生成带醒目警告的预览，预览结果不能关闭门禁。

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

| 平台    | 真机型号 | OS 版本 | Apple Maps | Google Maps | 高德地图 | 百度地图 | 测试人/日期 |
| ------- | -------- | ------- | ---------- | ----------- | -------- | -------- | ----------- |
| iOS     | 待填写   | 待填写  | 待填写     | 待填写      | 待填写   | 待填写   | 待填写      |
| Android | 待填写   | 待填写  | 不适用     | 待填写      | 待填写   | 待填写   | 待填写      |

## 6. 安装态矩阵（35 项）

每项必须记录：选中的候选坐标模式、是否打开正确 App、是否进入导航/路线预览、落点误差、证据和结论。

| ID            | 城市 | 平台    | 目标   | 候选模式 | App 调起 | 导航结果 | 误差（m） | 证据 | 结论 |
| ------------- | ---- | ------- | ------ | -------- | -------- | -------- | --------- | ---- | ---- |
| IOS-BJ-APPLE  | 北京 | iOS     | Apple  | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-BJ-GOOGLE | 北京 | iOS     | Google | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-BJ-AMAP   | 北京 | iOS     | 高德   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-BJ-BAIDU  | 北京 | iOS     | 百度   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-BJ-GOOGLE | 北京 | Android | Google | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-BJ-AMAP   | 北京 | Android | 高德   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-BJ-BAIDU  | 北京 | Android | 百度   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-SH-APPLE  | 上海 | iOS     | Apple  | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-SH-GOOGLE | 上海 | iOS     | Google | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-SH-AMAP   | 上海 | iOS     | 高德   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-SH-BAIDU  | 上海 | iOS     | 百度   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-SH-GOOGLE | 上海 | Android | Google | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-SH-AMAP   | 上海 | Android | 高德   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-SH-BAIDU  | 上海 | Android | 百度   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-YW-APPLE  | 义乌 | iOS     | Apple  | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-YW-GOOGLE | 义乌 | iOS     | Google | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-YW-AMAP   | 义乌 | iOS     | 高德   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-YW-BAIDU  | 义乌 | iOS     | 百度   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-YW-GOOGLE | 义乌 | Android | Google | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-YW-AMAP   | 义乌 | Android | 高德   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-YW-BAIDU  | 义乌 | Android | 百度   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-SZ-APPLE  | 深圳 | iOS     | Apple  | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-SZ-GOOGLE | 深圳 | iOS     | Google | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-SZ-AMAP   | 深圳 | iOS     | 高德   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-SZ-BAIDU  | 深圳 | iOS     | 百度   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-SZ-GOOGLE | 深圳 | Android | Google | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-SZ-AMAP   | 深圳 | Android | 高德   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-SZ-BAIDU  | 深圳 | Android | 百度   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-DG-APPLE  | 东莞 | iOS     | Apple  | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-DG-GOOGLE | 东莞 | iOS     | Google | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-DG-AMAP   | 东莞 | iOS     | 高德   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| IOS-DG-BAIDU  | 东莞 | iOS     | 百度   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-DG-GOOGLE | 东莞 | Android | Google | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-DG-AMAP   | 东莞 | Android | 高德   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |
| AND-DG-BAIDU  | 东莞 | Android | 百度   | 待测     | 待测     | 待测     | 待测      | 待补 | 待定 |

## 7. 未安装回落矩阵（6 项）

选择一座已完成安装态验证的城市，在移除或禁用目标 App 后测试。

| ID            | 平台    | 目标   | 测试城市 | 打开 Web | 目的地正确 | 可继续路线规划 | 证据 | 结论 |
| ------------- | ------- | ------ | -------- | -------- | ---------- | -------------- | ---- | ---- |
| FB-IOS-GOOGLE | iOS     | Google | 待选     | 待测     | 待测       | 待测           | 待补 | 待定 |
| FB-IOS-AMAP   | iOS     | 高德   | 待选     | 待测     | 待测       | 待测           | 待补 | 待定 |
| FB-IOS-BAIDU  | iOS     | 百度   | 待选     | 待测     | 待测       | 待测           | 待补 | 待定 |
| FB-AND-GOOGLE | Android | Google | 待选     | 待测     | 待测       | 待测           | 待补 | 待定 |
| FB-AND-AMAP   | Android | 高德   | 待选     | 待测     | 待测       | 待测           | 待补 | 待定 |
| FB-AND-BAIDU  | Android | 百度   | 待选     | 待测     | 待测       | 待测           | 待补 | 待定 |

## 8. 待批准的最终映射

只有同一模板/坐标模式在五城全部通过、无系统性偏移且 Web 回落通过后，才可填入本表。

| 平台    | 目标   | 主链接模板 | 主链接坐标模式 | Web 回落模板 | 回落坐标模式 | 五城最大误差 | 批准人/日期 |
| ------- | ------ | ---------- | -------------- | ------------ | ------------ | ------------ | ----------- |
| iOS     | Apple  | 待定       | 待定           | 待定         | 待定         | 待定         | 待定        |
| iOS     | Google | 待定       | 待定           | 待定         | 待定         | 待定         | 待定        |
| iOS     | 高德   | 待定       | 待定           | 待定         | 待定         | 待定         | 待定        |
| iOS     | 百度   | 待定       | 待定           | 待定         | 待定         | 待定         | 待定        |
| Android | Google | 待定       | 待定           | 待定         | 待定         | 待定         | 待定        |
| Android | 高德   | 待定       | 待定           | 待定         | 待定         | 待定         | 待定        |
| Android | 百度   | 待定       | 待定           | 待定         | 待定         | 待定         | 待定        |

若多个候选均通过，按以下顺序选择：

1. 五城最大落点误差更小；
2. 官方文档明确支持；
3. 主链接和 Web 回落使用同一坐标模式；
4. 转换步骤更少。

任一目标无合格候选时，保持 M0-T9 阻塞并记录原因，不自行新增或猜测模板。

## 9. 门禁完成条件

- [ ] 五个主入口 WGS-84 坐标经人工确认
- [ ] iOS/Android 真机与地图 App 版本已记录
- [ ] 35 个安装态用例全部完成
- [ ] 6 个未安装回落用例全部完成
- [ ] 最终映射经人工批准
- [ ] `packages/geo/navigation` 按批准映射实现
- [ ] 五城夹具单测和全仓检查通过
- [ ] M0-T9 在开发计划中勾选
- [ ] `开发日志.md` 追加真实完成记录

F-6.4 的发布前 `< 50m` 真机验收仍必须在 M4-T5 重做，本任务结果不能替代发布验收。
