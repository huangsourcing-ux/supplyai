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

| slug                          | 来源 URL                                                  |
| ----------------------------- | --------------------------------------------------------- |
| `shenzhen-dji-innovation`     | https://www.dji.com/company                               |
| `shenzhen-skyworth-digital`   | https://en.skyworthdigital.com/                           |
| `shenzhen-konka-group`        | https://www.konka.com/                                    |
| `shenzhen-transsion-holdings` | https://www.transsion.com/                                |
| `shenzhen-huntkey-electric`   | https://en.huntkey.com/                                   |
| `dongguan-oppo-mobile`        | https://www.oppo.com/en/about/                            |
| `dongguan-vivo-mobile`        | https://www.vivo.com/en/about-vivo                        |
| `dongguan-amperex-technology` | https://www.atlbattery.com/en/about                       |
| `dongguan-delta-electronics`  | https://www.deltaww.com/en-US/about/aboutDelta            |
| `dongguan-luxshare-precision` | https://www.luxshare-ict.com/                             |
| `guzhen-kinglong-lighting`    | https://www.kinglong-lighting.net/about-us/               |
| `guzhen-hulang-lighting`      | https://www.hulanglighting.com/                           |
| `guzhen-wosen-lighting`       | https://www.wosenled.com/                                 |
| `guzhen-zichuan-lighting`     | https://zichuanlighting.com/                              |
| `guzhen-voice-of-lighting`    | https://www.vollighting.cn/                               |
| `shunde-shudidi-furniture`    | https://www.shudidi.com/                                  |
| `shunde-shunuomei-furniture`  | https://www.snm-furniture.com/aboutus.html                |
| `shunde-govan-furniture`      | https://www.govanliving.com/aboutus                       |
| `shunde-youjian-furniture`    | https://www.youjianoffice.com/about-us/                   |
| `shunde-baotian-furniture`    | https://www.baotian.com/                                  |
| `chenghai-rastar-toys`        | https://rastar.com/html/gw-wap-en/About_Us/gongsijieshao/ |
| `chenghai-jiexing-toys`       | https://www.jxtoys.com/ZJ/                                |
| `chenghai-lingdong-creative`  | https://www.chinaldcx.com/en/                             |
| `chenghai-shifeng-culture`    | https://www.shifengtoy.com/                               |
| `chenghai-caipo-technology`   | https://www.caipotoys.com/                                |
| `yiwu-yayu-textile`           | https://ywyayu.com/                                       |
| `yiwu-first-eyew-jewelry`     | https://www.firsteyew.com/                                |
| `yiwu-spark-beauty`           | https://www.yiwusparkbeauty.com/                          |
| `yiwu-yolan-packaging`        | https://www.yolanpackagings.com/about.html                |
| `yiwu-nianyou-stationery`     | https://www.nian-you.com/                                 |
| `yongkang-haers-drinkware`    | https://www.haers.com/our-story/                          |
| `yongkang-nengzhi-scales`     | https://www.chinazhengya.com/about/                       |
| `yongkang-making-tools`       | https://www.kindustry.cn/About-us.html                    |
| `yongkang-yishun-tools`       | https://www.boshuntools.com/                              |
| `yongkang-delun-abrasives`    | https://www.delunabrasives.com/                           |
| `nantong-goldsun-textile`     | https://www.goldsunhome.com/aboutus.html                  |
| `nantong-violet-home-textile` | https://www.violet.com.cn/gsjs?_l=en                      |
| `nantong-luolai-lifestyle`    | https://www.luolai.com/pages/about-us                     |
| `nantong-sunshine-textile`    | https://www.ntsunshinetextile.com/                        |
| `nantong-bestwin-textile`     | https://www.bestwintextile.com/                           |
| `jinjiang-anta-sports`        | https://www.anta.cn/cms/contact                           |
| `jinjiang-xtep-china`         | https://www.xtep.com/                                     |
| `jinjiang-361-degrees`        | https://www.361sport.com/                                 |
| `jinjiang-jinzun-shoes`       | https://www.jinzunshoes.com/                              |
| `jinjiang-aodengke-shoes`     | https://www.aodengke.com/                                 |
| `dehua-shunmei-group`         | https://shunmeigroup.com/about.html                       |
| `dehua-xingye-ceramics`       | https://www.dehua-ceramics.com/                           |
| `dehua-jiashun-ceramics`      | https://jiashunkitchenware.com/about/                     |
| `dehua-longhe-ceramics`       | https://www.dehualonghe.com/                              |
| `dehua-luchi-ceramics`        | https://www.luchiceramic.com/                             |

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
