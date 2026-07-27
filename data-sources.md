# M1-T8 数据来源台账

本台账对应 `data/staging/real-seed/`。访问日期均为 2026-07-24，分类均为
`real-unverified`；记录只能进入 staging，且在按
《[数据核验 SOP](docs/operations/data-verification-sop.md)》人工复核前保持
`draft + unverified`。

## 使用与许可边界

- 产业带事实引用地方政府或主管部门公开页面，只使用产业类别和地域事实，不复制描述
  或图片。
- 工厂事实引用企业官网的 About、Factory、Products 或 Contact 页面，只记录企业
  名称、制造/产品事实、公开地址和官网；邮箱、电话、微信及图片暂不采集。
- 坐标为 WGS-84 `[lng, lat]`。2026-07-24 使用专用 User-Agent、1 req/s 查询
  [Nominatim](https://nominatim.openstreetmap.org/)，结果固化后测试和导入不访问
  外网；OpenStreetMap 数据遵循
  [ODbL attribution](https://www.openstreetmap.org/copyright/attribution-guide/)。

## 坐标查询台账

| 适用记录                                   | Nominatim query                       | OSM 对象         | WGS-84                     |
| ------------------------------------------ | ------------------------------------- | ---------------- | -------------------------- |
| `shenzhen-consumer-electronics` 及其工厂   | `Shenzhen, Guangdong, China`          | relation/3464353 | `[114.0545429,22.5445741]` |
| `dongguan-electronic-information` 及其工厂 | `Dongguan, Guangdong, China`          | relation/3464319 | `[113.7452332,23.0183568]` |
| `guzhen-decorative-lighting` 及其工厂      | `Guzhen, Zhongshan, Guangdong, China` | relation/5668294 | `[113.1825517,22.6192890]` |
| `shunde-home-furniture` 及其工厂           | `Shunde, Foshan, Guangdong, China`    | relation/3464718 | `[113.2894243,22.8054891]` |
| `chenghai-creative-toys` 及其工厂          | `Chenghai, Shantou, Guangdong, China` | relation/3283305 | `[116.7515585,23.4694075]` |
| `yiwu-small-commodities` 及其工厂          | `Yiwu, Zhejiang, China`               | relation/4483297 | `[120.0703805,29.3093002]` |
| `yongkang-hardware-tools` 及其工厂         | `Yongkang, Zhejiang, China`           | relation/3411719 | `[120.0427838,28.8918967]` |
| `nantong-home-textiles` 及其工厂           | `Nantong, Jiangsu, China`             | relation/4430899 | `[120.8904588,31.9827896]` |
| `jinjiang-sports-footwear` 及其工厂        | `Jinjiang, Fujian, China`             | relation/4430445 | `[118.5477505,24.7844350]` |
| `dehua-art-daily-ceramics` 及其工厂        | `Dehua, Fujian, China`                | relation/2666980 | `[118.2362336,25.4945484]` |

工厂逐条查询格式为 `{中文企业名} {中文地址}`，50 条结果均未返回可确认的厂区 OSM
对象（对象标识为 `null`）。canonical 中的地址附近候选点不能用于设置 verified；
复核人必须落到可证明的制造场所，并把新查询、对象 ID 或其他公开坐标依据补回台账。

## 产业带来源

| slug                              | 来源 URL                                                                                  | 字段用途                               |
| --------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------- |
| `shenzhen-consumer-electronics`   | https://www.sz.gov.cn/szzt2010/wgkzl/jcgk/jcygk/zdzcjc/content/post_9861778.html          | 深圳市政府产业规划；产业类别和地域     |
| `dongguan-electronic-information` | https://im.dg.gov.cn/gkmlpt/content/3/3874/post_3874985.html                              | 东莞市工信部门行动计划；产业类别和地域 |
| `guzhen-decorative-lighting`      | https://www.zs.gov.cn/gzz/gzgk/gzjj/content/post_2417055.html                             | 古镇镇政府概况；灯饰集群和地域         |
| `shunde-home-furniture`           | https://sdjyt.shunde.gov.cn/m/static.php?act=zjfc                                         | 顺德政府产业介绍；家具集群和地域       |
| `chenghai-creative-toys`          | https://www.shantou.gov.cn/stsgxj/gkmlpt/content/2/2357/post_2357762.html                 | 汕头市工信局公开信息；玩具产业和地域   |
| `yiwu-small-commodities`          | https://www.yw.gov.cn/art/2021/2/19/art_1229629671_3966461.html                           | 义乌市政府公开信息；小商品产业和地域   |
| `yongkang-hardware-tools`         | https://www.yk.gov.cn/art/2025/6/20/art_1229698287_59048194.html                          | 永康市政府公开信息；五金产业和地域     |
| `nantong-home-textiles`           | https://www.nantong.gov.cn/ntsrmzf/ntxw/content/0cc4a48e-02a7-4d83-a2c5-8ff423ba4a38.html | 南通市政府公开信息；家纺产业和地域     |
| `jinjiang-sports-footwear`        | https://www.quanzhou.gov.cn/zfb/xxgk/zfxxgkzl/qzdt/qzyw/202109/t20210924_2623843.htm      | 泉州市政府公开信息；晋江鞋业和地域     |
| `dehua-art-daily-ceramics`        | https://www.quanzhou.gov.cn/zfb/xxgk/zfxxgkzl/qzdt/qzyw/202109/t20210924_2623843.htm      | 泉州市政府公开信息；德化陶瓷和地域     |

## 工厂来源

以下页面用于企业身份、主营产品、制造依据及公开地址初筛；全部仍需 SOP 复核。

| slug                            | 来源 URL                                                  |
| ------------------------------- | --------------------------------------------------------- |
| `shenzhen-dji-innovation`       | https://www.dji.com/company                               |
| `shenzhen-skyworth-digital`     | https://en.skyworthdigital.com/                           |
| `shenzhen-konka-group`          | https://www.konka.com/                                    |
| `shenzhen-transsion-holdings`   | https://www.transsion.com/                                |
| `shenzhen-huntkey-electric`     | https://en.huntkey.com/                                   |
| `dongguan-oppo-mobile`          | https://www.oppo.com/en/about/                            |
| `dongguan-vivo-mobile`          | https://www.vivo.com/en/about-vivo                        |
| `dongguan-amperex-technology`   | https://www.atlbattery.com/en/about                       |
| `dongguan-delta-electronics`    | https://www.deltaww.com/en-US/about/aboutDelta            |
| `dongguan-luxshare-precision`   | https://www.luxshare-ict.com/                             |
| `guzhen-kinglong-lighting`      | https://www.kinglong-lighting.net/about-us/               |
| `guzhen-hulang-lighting`        | https://www.hulanglighting.com/                           |
| `guzhen-wosen-lighting`         | https://www.wosenled.com/                                 |
| `guzhen-zichuan-lighting`       | https://zichuanlighting.com/                              |
| `guzhen-voice-of-lighting`      | https://www.vollighting.cn/                               |
| `shunde-shudidi-furniture`      | https://www.shudidi.com/                                  |
| `shunde-shunuomei-furniture`    | https://www.snm-furniture.com/aboutus.html                |
| `shunde-govan-furniture`        | https://www.govanliving.com/aboutus                       |
| `shunde-youjian-furniture`      | https://www.youjianoffice.com/about-us/                   |
| `shunde-baotian-furniture`      | https://www.baotian.com/                                  |
| `chenghai-rastar-toys`          | https://rastar.com/html/gw-wap-en/About_Us/gongsijieshao/ |
| `chenghai-jiexing-toys`         | https://www.jxtoys.com/ZJ/                                |
| `chenghai-lingdong-creative`    | https://www.chinaldcx.com/en/                             |
| `chenghai-shifeng-culture`      | https://www.shifengtoy.com/                               |
| `chenghai-caipo-technology`     | https://www.caipotoys.com/                                |
| `yiwu-yayu-textile`             | https://ywyayu.com/                                       |
| `yiwu-first-eyew-jewelry`       | https://www.firsteyew.com/                                |
| `yiwu-spark-beauty`             | https://www.yiwusparkbeauty.com/                          |
| `yiwu-yolan-packaging`          | https://www.yolanpackagings.com/about.html                |
| `yiwu-nianyou-stationery`       | https://www.nian-you.com/                                 |
| `yongkang-haers-drinkware`      | https://www.haers.com/our-story/                          |
| `yongkang-nengzhi-scales`       | https://www.chinazhengya.com/about/                       |
| `yongkang-making-tools`         | https://www.kindustry.cn/About-us.html                    |
| `yongkang-yishun-tools`         | https://www.boshuntools.com/                              |
| `yongkang-delun-abrasives`      | https://www.delunabrasives.com/                           |
| `nantong-xinyi-home-textile`    | https://en.xinyihometextile.com/                          |
| `nantong-violet-home-textile`   | https://www.violet.com.cn/gsjs?_l=en                      |
| `nantong-luolai-lifestyle`      | https://www.luolai.com/pages/about-us                     |
| `nantong-jinkanghong-textile`   | https://en.kifro.com/                                     |
| `nantong-nanshing-home-textile` | https://www.nanshing.com.cn/                              |
| `jinjiang-anta-sports`          | https://www.anta.cn/cms/contact                           |
| `jinjiang-xtep-china`           | https://www.xtep.com/                                     |
| `jinjiang-361-degrees`          | https://www.361sport.com/                                 |
| `jinjiang-jinzun-shoes`         | https://www.jinzunshoes.com/                              |
| `jinjiang-aodengke-shoes`       | https://www.aodengke.com/                                 |
| `dehua-shunmei-group`           | https://shunmeigroup.com/about.html                       |
| `dehua-xingye-ceramics`         | https://www.dehua-ceramics.com/                           |
| `dehua-jiashun-ceramics`        | https://jiashunkitchenware.com/about/                     |
| `dehua-longhe-ceramics`         | https://www.dehualonghe.com/                              |
| `dehua-luchi-ceramics`          | https://www.luchiceramic.com/                             |

## 合成测试数据

| 记录                     | 分类             | 来源、用途和许可                                                         | 更新时间   |
| ------------------------ | ---------------- | ------------------------------------------------------------------------ | ---------- |
| `synthetic-m1t8-5000-*`  | `synthetic-test` | M1-T8 v1 固定 PRNG；项目自有测试数据，仅供负载测试，禁止 production 导出 | 2026-07-24 |
| `synthetic-m1t8-20000-*` | `synthetic-test` | M1-T8 v1 固定 PRNG；项目自有测试数据，仅供负载测试，禁止 production 导出 | 2026-07-24 |

## M2 staging 门禁证据复查（2026-07-25）

本节仅记录 M2 staging 门禁的初步证据复查，不代表独立复核人通过，也没有触发
verified 或 publish。完整结论和阻塞记录见
[`2026-07-25-m2-smoke.md`](docs/operations/reviews/staging/2026-07-25-m2-smoke.md)。

### 边界候选

以下 Nominatim lookup 在 2026-07-25 返回 Polygon；原始数据遵循 ODbL，仍须由独立
复核人目视确认范围与冻结产业带定义一致后，才能通过 `/ops` 写入 draft。

| cluster slug                 | OSM 对象         | Nominatim bbox（WGS-84）                          |
| ---------------------------- | ---------------- | ------------------------------------------------- |
| `guzhen-decorative-lighting` | relation/5668294 | `[113.1515284,22.5660046,113.2192035,22.6850080]` |
| `dehua-art-daily-ceramics`   | relation/2666980 | `[117.9319265,25.3992865,118.5481267,25.9433018]` |
| `yongkang-hardware-tools`    | relation/3411719 | `[119.8895135,28.7608296,120.3461145,29.1069771]` |

### 工厂证据差异

| factory slug               | 新证据                                                                                                         | 与 canonical 坐标的关系                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `guzhen-kinglong-lighting` | 官网 Contact 将 headquarters/factory 标为 `No.1 Jinzhao Street, West District, Zhongshan`，古镇地址是 showroom | 与现有古镇产业带归属及 `[113.1805,22.6136]` 冲突；当前切片拒绝 |
| `dehua-xingye-ceramics`    | 官网 Contact 的 Google Maps embed 指向约 `[118.2292131,25.5007182]`，同时给出浔中路 5 号                       | 与 `[118.2511,25.4862]` 明显不同；待厂区目视确认               |
| `dehua-jiashun-ceramics`   | 官网 About 直接显示 `25.4857°N, 118.2423°E`，并记录生产线与窑炉                                                | 与 `[118.2297,25.4994]` 明显不同；待厂区目视确认               |
| `yongkang-nengzhi-scales`  | 官网 Contact 嵌入的 Google My Maps placemark 为 `[120.147652,28.967443]`，对应世方西路 213 号                  | 与 `[120.1602,28.9478]` 明显不同；待厂区目视确认               |

其余复查工厂虽有制造主体或更精确地址证据，但尚无可追溯的厂区点。不得把地址
字符串自动地理编码结果当作厂区级核验结论。

## M2 staging 源数据修复（2026-07-25）

本节对应独立批准的 source remediation 任务。修复范围仅为从未发布、从未核验的
canonical draft；staging 中的相同内容变更只允许通过 `/ops`，不使用 seed/import
写入。以下为证据候选，仍须由独立 Admin 在 `/ops` 逐项完成最终目视复核。

### 产业带 boundary

| slug                              | OSM/Nominatim 依据                                                                                  | canonical 处理                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `dongguan-electronic-information` | relation/3464319，ODbL，查询时间 2026-07-25；bbox `[113.5158919,22.6564988,114.2554700,23.1449285]` | `polygon_threshold=0.0001`；Polygon 包装为 WGS-84 MultiPolygon |
| `nantong-home-textiles`           | relation/4430899，ODbL，查询时间 2026-07-25；bbox `[120.1972423,31.6340915,122.3844852,32.8583333]` | `polygon_threshold=0.0001`；Polygon 包装为 WGS-84 MultiPolygon |

### Dongguan 工厂坐标

高德对象的原始坐标为 GCJ-02，使用仓库既有
`packages/geo` `gcj02ToWgs84` 转换后写入 canonical；ATL 坐标来自官方厂区验收
报告，直接按 WGS-84 记录。

| slug                          | 地图/坐标依据                                                                             | canonical WGS-84                 |
| ----------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------- |
| `dongguan-oppo-mobile`        | AMap POI `B0FFJ6YNLB`，`OPPO广东移动通信有限公司(1号门)`；GCJ-02 `[113.782309,22.767950]` | `[113.7771621452,22.7707857278]` |
| `dongguan-vivo-mobile`        | AMap POI `B0FFKVXC2S`，`vivo工业园-A区`；GCJ-02 `[113.759222,22.754449]`                  | `[113.7540478336,22.7572758486]` |
| `dongguan-amperex-technology` | ATL 官方厂区验收报告 `113°47′26.77″E, 23°05′57.82″N`                                      | `[113.7907694444,23.0993944444]` |
| `dongguan-delta-electronics`  | AMap POI `B0FFGXX0YF`，`台达电子(东莞)有限公司`；GCJ-02 `[113.822122,23.107868]`          | `[113.8170423597,23.1106253923]` |
| `dongguan-luxshare-precision` | AMap POI `B0FFKEB9HI`，地址匹配；GCJ-02 `[114.194816,22.841245]`                          | `[114.1898699549,22.8439770706]` |

制造主体、地址和产品的补充官方来源：

- OPPO：https://www.oppo.com/cn/about/ 和 https://business.oppo.com/
- vivo：https://www.vivo.com/en/activity/about-us/ 和
  https://wwwresstatic.vivo.com.cn/vivoportal/files/resource/files/1725879702055/vivo%E4%BD%8E%E7%A2%B3%E8%A1%8C%E5%8A%A8%E7%99%BD%E7%9A%AE%E4%B9%A6.pdf
- ATL：https://www.atlbattery.com/zh/about.html、
  https://www.atlbattery.com/zh/contactus.html 和
  https://www.atlbattery.com/static/upload/file/20180727/1532685526772910.pdf
- Delta：https://www.deltaww.com/zh-TW/company/global-operations 和
  https://filecenter.deltaww.com/about/download/esg/ISO%2050001%20Delta%20Electronics.pdf
- Luxshare：https://www.luxshare-ict.com/about/contact.html 和
  https://www.luxshare-ict.com/Public/Uploads/uploadfile/files/20240617/lixunjingmiISO22301CN.pdf

### Nantong 原位替换与坐标

| 旧 canonical slug          | 新 canonical slug               | 替换理由                                                                                                    |
| -------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `nantong-goldsun-textile`  | `nantong-xinyi-home-textile`    | Goldsun 地图对象对应名称存在集团/布业实体歧义；Xinyi 官网同时证明 30 亩生产园区、300+ 员工和精确厂址        |
| `nantong-sunshine-textile` | `nantong-jinkanghong-textile`   | Sunshine 精确官网地址没有名称匹配的公司/厂区 POI；Jinkanghong 官网工厂地域与名称匹配 POI 一致               |
| `nantong-bestwin-textile`  | `nantong-nanshing-home-textile` | Bestwin 精确官网地址没有名称匹配的公司/厂区 POI；Nanshing 官网证明 30,000㎡ 厂房且名称匹配 POI 给出精确地址 |

| slug                            | 制造/地址来源                                                                                                | Google Maps place 原始坐标（中国大陆，按 GCJ-02 候选处理）                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `nantong-violet-home-textile`   | https://www.violet.com.cn/gsjs?_l=en；官网记录生产中心和产品，工业园地址由名称匹配地图对象交叉核对           | place `0x35b184edd3e99cb9:0xd70fe822e47dd124`，`Violet Home Textile Tech. Co.,Ltd.`，`[121.01587,31.9649]`                |
| `nantong-luolai-lifestyle`      | https://static.cninfo.com.cn/finalpage/2024-08-20/1220911649.PDF；营业执照范围含生产销售，地址星湖大道1699号 | place `0x35b1818b2cb1e3cb:0xf3314c5d0d4268e8`，`Luolai Home Textile Co., Ltd. (Northeast Gate)`，`[120.918809,31.934472]` |
| `nantong-xinyi-home-textile`    | https://en.xinyihometextile.com/；官网记录 30 亩现代产业园、生产设备、300+ 员工和紫星村2号                   | place `0x35b19c12fd77062b:0xcbf18daf26c440`，`Nantong Xinyi Home Textile Co.,Ltd.`，`[120.9732048,32.0685104]`            |
| `nantong-jinkanghong-textile`   | https://en.kifro.com/；官网记录西亭镇自有工厂、数码印花全产业链和设计制造                                    | place `0x35b1990e9958c757:0xdaeecb40c89e0411`，`Nantong Jinkanghong Textile Co.,Ltd.`，`[121.02599,32.09873]`             |
| `nantong-nanshing-home-textile` | https://www.nanshing.com.cn/；官网记录南通高新区 30,000㎡ 厂房、500+ 设备和研发设计生产                      | place `0x35b19a4a51824a85:0x3b199181a380a608`，`Jiangsu Nanxing Home Textile Limited Company`，`[121.0369299,32.0469352]` |

### Nantong 坐标复查与 staging 处置（2026-07-27）

使用 Google Earth 高分辨率卫星影像逐点比较当前入库值和 `packages/geo`
`gcj02ToWgs84` 参考候选，并以 Microsoft Planetary Computer 中 WGS-84
地理配准的 Sentinel-2 L2A 影像
`S2B_MSIL2A_20260407T023549_R089_T51SUR_20260407T044802` 交叉核对。只有 pin
明确压在厂房建筑轮廓上的候选才允许作为新 canonical 值；道路、大门、停车场、农田
或水域均不通过。

| slug                            | 旧值 → 新值/处置                                    | 修正原因与卫星影像结果                                                                                    |
| ------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `nantong-luolai-lifestyle`      | `[120.918809,31.934472]` → 保持原值，unverified     | 当前点在跨水道路；转换候选 `[120.9145918,31.9366294]` 在星湖大道车道，均未压在南侧连续厂房屋面上          |
| `nantong-xinyi-home-textile`    | `[120.9732048,32.0685104]` → 保持原值，unverified   | 当前点在南通兴东机场停车区；转换候选 `[120.9688606,32.0706056]` 在机场大道道路/绿化带，均非厂房轮廓       |
| `nantong-violet-home-textile`   | `[121.01587,31.9649]` → 保持原值，unverified        | 当前点在农田/苗圃；转换候选 `[121.0113817,31.9668470]` 在两组工业建筑之间的道路，均未压在厂房屋面上       |
| `nantong-jinkanghong-textile`   | `[121.02599,32.09873]` → `[121.0214538,32.1006772]` | Google Maps place 的 GCJ-02 值曾未转换；新值由 `gcj02ToWgs84` 生成，卫星 pin 压在连续蓝色厂房屋面西北边缘 |
| `nantong-nanshing-home-textile` | `[121.0369299,32.0469352]` → 保持原值，unverified   | 当前点在通吕运河水面；转换候选 `[121.0323614,32.0488415]` 在江海大道车道/中央分隔带，均非厂房轮廓         |

staging 内容只通过带 Clerk Admin 鉴权的 `/ops` 修改：五家均已 unpublish 并恢复
`unverified`，仅 Jinkanghong 写入新坐标；未运行 ADM-5，未重新 publish。完整逐条影像
依据、状态与 MAP 缓存 purge 结果见
[`2026-07-27-nantong-coordinate-remediation.md`](docs/operations/reviews/staging/2026-07-27-nantong-coordinate-remediation.md)。
