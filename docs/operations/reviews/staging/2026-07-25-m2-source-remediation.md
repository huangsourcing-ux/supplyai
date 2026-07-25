# M2 staging source remediation — 2026-07-25

This is a staging-only remediation evidence package. It authorizes correction of
canonical draft content but does not authorize ADM-5 verification, publication,
or production changes. Final visual review and reviewer attestation remain
pending.

## Review ownership and state

- Initial data author: M1-T8 import preparation (agent-assisted)
- Remediation researcher: Codex, using public official sources and traceable
  map objects
- Independent reviewer: project owner, Clerk Admin
  `user_3Gr8DpJw59xwHVz70XQ2VCm6yma`
- Reviewer independence: previously confirmed; the reviewer did not author the
  M1-T8 initial records
- Evidence accessed at (UTC): 2026-07-25
- Review completed at (UTC): pending
- Staging Web: https://staging.chinasupply.ai
- Staging API: https://api-staging.chinasupply.ai
- Current database prerequisite: all affected rows must be
  `draft + unverified` with null `publishedAt`, `verifiedAt`,
  `lastVerifiedAt`, and `verifiedBy`; confirm in `/ops` before editing

## Approved remediation boundary

- Keep the existing Dongguan and Nantong cluster associations.
- Keep exactly five factories in each selected cluster and 50 factories
  overall.
- Correct eight existing factory records and replace three ambiguous or
  unsupported Nantong draft identities in place:
  - `nantong-goldsun-textile` → `nantong-xinyi-home-textile`
  - `nantong-sunshine-textile` → `nantong-jinkanghong-textile`
  - `nantong-bestwin-textile` → `nantong-nanshing-home-textile`
- Apply staging content changes only through `/ops`; do not use SQL, seed,
  import, or a temporary script.
- Leave every factory unverified and every entity draft until the independent
  reviewer completes the SOP.

## Industrial cluster 1 — Dongguan electronic information

- slug: `dongguan-electronic-information`
- source:
  https://im.dg.gov.cn/gkmlpt/content/3/3874/post_3874985.html
- Chinese/English name: existing canonical industrial-cluster normalization;
  pending reviewer confirmation
- centroid: existing Nominatim relation centroid
  `[113.7452332,23.0183568]`
- boundary: OpenStreetMap relation
  [3464319](https://www.openstreetmap.org/relation/3464319), ODbL
- boundary query: Nominatim lookup with `polygon_geojson=1` and
  `polygon_threshold=0.0001`; Polygon wrapped as WGS-84 MultiPolygon
- bbox: `[113.5158919,22.6564988,114.2554700,23.1449285]`
- boundary visual check: pending independent reviewer
- linked factories:
  - `dongguan-oppo-mobile`
  - `dongguan-vivo-mobile`
  - `dongguan-amperex-technology`
  - `dongguan-delta-electronics`
  - `dongguan-luxshare-precision`
- result: candidate; reviewer attestation pending

## Industrial cluster 2 — Nantong home textiles

- slug: `nantong-home-textiles`
- source:
  https://www.nantong.gov.cn/ntsrmzf/ntxw/content/0cc4a48e-02a7-4d83-a2c5-8ff423ba4a38.html
- Chinese/English name: existing canonical industrial-cluster normalization;
  pending reviewer confirmation
- centroid: existing Nominatim relation centroid
  `[120.8904588,31.9827896]`
- boundary: OpenStreetMap relation
  [4430899](https://www.openstreetmap.org/relation/4430899), ODbL
- boundary query: Nominatim lookup with `polygon_geojson=1` and
  `polygon_threshold=0.0001`; Polygon wrapped as WGS-84 MultiPolygon
- bbox: `[120.1972423,31.6340915,122.3844852,32.8583333]`
- boundary visual check: pending independent reviewer
- linked factories:
  - `nantong-violet-home-textile`
  - `nantong-luolai-lifestyle`
  - `nantong-xinyi-home-textile`
  - `nantong-jinkanghong-textile`
  - `nantong-nanshing-home-textile`
- result: candidate; reviewer attestation pending

## Factory evidence

Every result below is `candidate`, not `pass`. The independent reviewer must
confirm the visible factory grounds and all bilingual fields in `/ops`.

### 01 — OPPO

- slug: `dongguan-oppo-mobile`
- official sources:
  - https://www.oppo.com/cn/about/
  - https://business.oppo.com/
- manufacturer evidence: official material documents global manufacturing
  centers and smartphones/smart devices
- address: No. 18 Haibin Road, Wusha, Chang'an Town / 东莞市长安镇乌沙海滨路18号
- coordinate object: AMap POI
  [B0FFJ6YNLB](https://www.amap.com/place/B0FFJ6YNLB),
  `OPPO广东移动通信有限公司(1号门)`
- original coordinate: GCJ-02 `[113.782309,22.767950]`
- canonical WGS-84: `[113.7771621452,22.7707857278]`
- products: smartphones; smart devices
- contact: official website only
- visual check: pending independent reviewer
- result: candidate

### 02 — vivo

- slug: `dongguan-vivo-mobile`
- official sources:
  - https://www.vivo.com/en/activity/about-us/
  - https://wwwresstatic.vivo.com.cn/vivoportal/files/resource/files/1725879702055/vivo%E4%BD%8E%E7%A2%B3%E8%A1%8C%E5%8A%A8%E7%99%BD%E7%9A%AE%E4%B9%A6.pdf
- manufacturer evidence: official material identifies the manufacturer,
  industrial parks A/B/C, smartphones, and wearables
- address: Vivo Industrial Park A, No. 1 Vivo Road, Chang'an Town /
  东莞市长安镇维沃路1号vivo工业园A区
- coordinate object: AMap POI
  [B0FFKVXC2S](https://www.amap.com/place/B0FFKVXC2S), `vivo工业园-A区`
- original coordinate: GCJ-02 `[113.759222,22.754449]`
- canonical WGS-84: `[113.7540478336,22.7572758486]`
- products: smartphones; wearable devices
- contact: official website only
- visual check: pending independent reviewer
- result: candidate

### 03 — ATL

- slug: `dongguan-amperex-technology`
- official sources:
  - https://www.atlbattery.com/zh/about.html
  - https://www.atlbattery.com/zh/contactus.html
  - https://www.atlbattery.com/static/upload/file/20180727/1532685526772910.pdf
- manufacturer evidence: official site identifies lithium-ion battery
  manufacturing; the plant acceptance report identifies the operating factory
- address: No. 1 Industrial West Road, Songshan Lake High-tech Industrial
  Development Zone / 东莞市松山湖高新技术产业开发区工业西路1号
- coordinate source: official plant report
  `113°47′26.77″E, 23°05′57.82″N`
- canonical WGS-84: `[113.7907694444,23.0993944444]`
- products: lithium-ion batteries; battery cells
- contact: official website only
- visual check: pending independent reviewer
- result: candidate

### 04 — Delta Electronics

- slug: `dongguan-delta-electronics`
- official sources:
  - https://www.deltaww.com/zh-TW/company/global-operations
  - https://filecenter.deltaww.com/about/download/esg/ISO%2050001%20Delta%20Electronics.pdf
- manufacturer evidence: official certification identifies Plant 3 and
  manufacture of power, network, fan/module, and automation products
- address: No. 33 Pantao Road, Shijie Town / 东莞市石碣镇蟠桃路33号
- coordinate object: AMap POI
  [B0FFGXX0YF](https://www.amap.com/place/B0FFGXX0YF)
- original coordinate: GCJ-02 `[113.822122,23.107868]`
- canonical WGS-84: `[113.8170423597,23.1106253923]`
- products: power supplies and network products; industrial automation
  components
- contact: official website only
- visual check: pending independent reviewer
- result: candidate

### 05 — Luxshare

- slug: `dongguan-luxshare-precision`
- official sources:
  - https://www.luxshare-ict.com/about/contact.html
  - https://www.luxshare-ict.com/Public/Uploads/uploadfile/files/20240617/lixunjingmiISO22301CN.pdf
- manufacturer evidence: official certificate identifies production of
  connectors, cables, speakers, headsets, and wearables
- address: No. 313 North Ring Road, Qingxi Town /
  东莞市清溪镇北环路313号
- coordinate object: AMap POI
  [B0FFKEB9HI](https://www.amap.com/place/B0FFKEB9HI)
- original coordinate: GCJ-02 `[114.194816,22.841245]`
- canonical WGS-84: `[114.1898699549,22.8439770706]`
- products: connectors and cables; acoustic and wearable components
- contact: official website only
- visual check: pending independent reviewer
- result: candidate

### 06 — Violet Home Textile

- slug: `nantong-violet-home-textile`
- official source: https://www.violet.com.cn/gsjs?_l=en
- manufacturer evidence: official history records a production center,
  functional textile production, and bedding products
- address: Violet Home Textile Industrial Park, Zhangjiang Road,
  Zhangzhishan Town / 通州区张芝山镇336省道张江路口紫罗兰家纺工业园
- coordinate object: Google Maps place
  `0x35b184edd3e99cb9:0xd70fe822e47dd124`,
  `Violet Home Textile Tech. Co.,Ltd.`
- canonical WGS-84: `[121.01587,31.9649]`
- products: bedding; quilts
- contact: official website only
- visual check: pending independent reviewer
- result: candidate

### 07 — Luolai Lifestyle

- slug: `nantong-luolai-lifestyle`
- official/regulatory sources:
  - https://www.luolai.com/pages/about-us
  - https://static.cninfo.com.cn/finalpage/2024-08-20/1220911649.PDF
  - https://www.cfie.org.cn/uploads/file/20240429/1714366877433032.pdf
- manufacturer evidence: business scope includes production and sale of home
  textiles; ESG report identifies the Xinghu Avenue plant
- address: No. 1699 Xinghu Avenue, Nantong Economic and Technological
  Development Area / 南通经济技术开发区星湖大道1699号
- coordinate object: Google Maps place
  `0x35b1818b2cb1e3cb:0xf3314c5d0d4268e8`,
  `Luolai Home Textile Co., Ltd. (Northeast Gate)`
- canonical WGS-84: `[120.918809,31.934472]`
- products: bed linen; silk bedding
- contact: official website only
- visual check: pending independent reviewer
- result: candidate

### 08 — Xinyi Home Textile

- slug: `nantong-xinyi-home-textile`
- replaces: `nantong-goldsun-textile`
- official sources:
  - https://en.xinyihometextile.com/
  - https://en.xinyihometextile.com/contact.html
- manufacturer evidence: official site records a 30-mu modern industrial
  park, 300+ employees, production equipment, and annual capacity
- address: No. 2 Zixing Village, Tongzhou District /
  南通市通州区紫星村2号
- coordinate object: Google Maps place
  `0x35b19c12fd77062b:0xcbf18daf26c440`,
  `Nantong Xinyi Home Textile Co.,Ltd.`
- canonical WGS-84: `[120.9732048,32.0685104]`
- products: bedding sets; embroidered home textiles
- contact: official website only
- visual check: pending independent reviewer
- result: candidate

### 09 — Jinkanghong Textile

- slug: `nantong-jinkanghong-textile`
- replaces: `nantong-sunshine-textile`
- official source: https://en.kifro.com/
- manufacturer evidence: official site identifies its own Xiting Town
  factory, a digital-printing industrial chain, and design/manufacturing
- address: No. 20 Tingnan Road, Xiting Town, Tongzhou District /
  南通市通州区西亭镇亭南路20号
- coordinate object: Google Maps place
  `0x35b1990e9958c757:0xdaeecb40c89e0411`,
  `Nantong Jinkanghong Textile Co.,Ltd.`
- canonical WGS-84: `[121.02599,32.09873]`
- products: digitally printed bedding; quilt covers and sheets
- contact: official website only
- visual check: pending independent reviewer
- result: candidate

### 10 — Nanshing Home Textile

- slug: `nantong-nanshing-home-textile`
- replaces: `nantong-bestwin-textile`
- official source: https://www.nanshing.com.cn/
- manufacturer evidence: official site records a 30,000-square-meter factory,
  500+ production machines, 500+ employees, and integrated production
- address: No. 999 Jianghai Avenue, Nantong High-tech Industrial Development
  Zone / 南通高新技术产业开发区江海大道999号
- coordinate object: Google Maps place
  `0x35b19a4a51824a85:0x3b199181a380a608`,
  `Jiangsu Nanxing Home Textile Limited Company`
- canonical WGS-84: `[121.0369299,32.0469352]`
- products: bedding sets; curtains and home textiles
- contact: official website only
- visual check: pending independent reviewer
- result: candidate

## Rejected source identities

| old slug                   | reason                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `nantong-goldsun-textile`  | Official group site and available map objects did not resolve to one unambiguous matching legal manufacturing entity.          |
| `nantong-sunshine-textile` | Official exact address was available, but no matching company/factory POI was found; similarly named map result was different. |
| `nantong-bestwin-textile`  | Official exact factory address was available, but Google/AMap did not return an address-matched company/factory POI.           |

## Staging correction result

- Correction completed at (UTC): 2026-07-25T10:48:54Z
- `/ops` prerequisite state check: passed. The authenticated Admin list response
  contained exactly 10 clusters and 50 factories; every cluster was
  `draft` with null `publishedAt`, and every factory was `draft + unverified`
  with null `publishedAt`.
- Detail audit prerequisite: passed for the ten selected factories. Each had
  `verified=false` and null `publishedAt`, `verifiedAt`, `lastVerifiedAt`, and
  `verifiedBy` before the review gate.
- Cluster updates: Dongguan and Nantong boundaries were saved through `/ops`;
  both PATCH requests returned HTTP 200. Reloaded Admin detail responses
  matched the canonical MultiPolygon coordinates exactly and remained draft
  with null `publishedAt`.
- Factory updates/replacements: all ten records were saved through `/ops`.
  Reloaded Admin detail responses matched the canonical slug, bilingual name
  and address, WGS-84 location, products, source, website, and empty images.
  The three replacement slugs are present and the three rejected slugs are
  absent.
- Post-update count: 10 clusters and 50 factories; each selected cluster still
  has its original five associated factories.
- Audit state after correction: all ten selected factories remain
  `draft + unverified`, with null `publishedAt`, `verifiedAt`,
  `lastVerifiedAt`, and `verifiedBy`.
- Public isolation after correction:
  - A-1 clusters: HTTP 200, zero records
  - A-4 factories: HTTP 200, zero records
  - A-6 `q=OPPO`: HTTP 200, zero category/cluster/factory results
  - MAP-1: HTTP 200, zero features
  - MAP-2 China bbox at zoom 9: HTTP 200, zero features
  - MAP-3 China bbox: HTTP 200, zero features and `truncated=false`
  - Dongguan cluster, OPPO factory, and Xinyi factory public details: HTTP 404
- `/ops` defect encountered and resolved: the initial boundary save was
  blocked before PATCH because staging CORS advertised only GET/HEAD/POST.
  No data changed during that failed attempt. PR
  [#38](https://github.com/huangsourcing-ux/supplyai/pull/38) explicitly
  separated public MAP read methods from trusted Web mutation methods, passed
  CI, merged as `6a3db3cf8a97b192fd61d28ac64859ecd44e160e`,
  deployed to Railway staging, and the real preflight then advertised
  GET/HEAD/POST/PUT/PATCH/DELETE/OPTIONS.
- Reviewer notes and attestation: pending independent review. No ADM-5,
  publish, or unpublish action has been executed.

## Required independent reviewer statement

After inspecting both boundaries, all ten map locations, every official source,
and the corrected `/ops` previews, the reviewer must state:

> 我已按 SOP 独立复核 2 个产业带和 10 家工厂，全部通过，授权执行 verify/publish。

Until that statement is received, do not call ADM-5 or any
publish/unpublish operation.
