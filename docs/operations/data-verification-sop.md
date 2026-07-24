# 数据核验 SOP

本 SOP 适用于产业带和工厂从 `draft + unverified` 进入可发布状态前的人工复核。
M1-T8 canonical 数据属于 `real-unverified`，种子命令不会设置 verified 或 published。

## 角色和证据

- 初录人整理公开资料，保留来源 URL、访问日期和坐标查询依据。
- 复核人必须是另一名获授权的 Admin；在 `/ops` 中逐项检查并记录姓名与 UTC 时间。
- 企业官网、政府网站和可追溯地图对象优先。聚合目录、搜索摘要或转载只能作为线索，
  不能单独作为通过依据。

## 逐条检查

任一项不通过即保持 draft/unverified：

1. 来源 URL 当前可访问，页面主体与记录一致，并记录访问日期。
2. 中文名称和地址与来源一致；英文名称、地址是准确的人工规范化。
3. 地图使用 WGS-84 `[lng, lat]`，落点位于有证据支持的工厂、厂区或产业带位置。
   记录查询、OSM 类型与 ID（或其他公开依据）并目视确认。只落到行政区或镇中心的
   候选点不得通过。
4. 主营产品与来源一致，且与关联类目、产业带合理匹配。
5. 工厂主体有生产、工厂、制造设施或生产能力的公开依据，不是纯贸易商、代理商、
   市场或品牌展示页。无法排除纯贸易主体时不通过。
6. 官网域名确属该主体。邮箱、电话、微信只有在官网或权威页面可交叉核对时才录入；
   未核对字段保持空值，不使用测试联系方式。
7. 图片若后续补录，须确认版权/授权、主体与 alt 文案；M1-T8 图片为空。
8. 复核人检查完整预览，记录 `verifiedBy`、`verifiedAt` 和 `lastVerifiedAt` 的
   UTC 时间，再由 Admin 明确更新。verified 不等于 published，发布仍是单独操作。

## 变更和失效

- 名称、地址、坐标、主营产品、制造主体、联系方式或来源变化后，取消旧结论并重新
  执行全部检查，不能只更新时间。
- 来源失效或无法证明关键事实时保持/恢复 unverified，补充替代来源后再复核。
- `synthetic-m1t8-*` 永远不得 verified、publish 或进入 production 导出。
- M2 Admin 上线前禁止通过 SQL、seed、import 或临时脚本直接写
  `verified=true`、`verifiedAt`、`lastVerifiedAt` 或 `verifiedBy`；不能留痕时应
  等待，禁止伪造验收。

## 复核记录模板

```text
slug:
record type:
source URL + accessedAt:
manufacturer evidence:
Chinese name/address:
English name/address:
coordinate query + object ID:
coordinate visual check:
main products/categories:
contact check:
reviewer:
reviewedAt (UTC):
result: pass | reject
rejection/fix notes:
```
