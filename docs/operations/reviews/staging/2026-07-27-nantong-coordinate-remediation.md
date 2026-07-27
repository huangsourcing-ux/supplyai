# Nantong factory coordinate remediation — 2026-07-27

This is a staging-only evidence package for the five published Nantong factory
coordinates. It does not authorize production changes or replace the required
independent Owner attestation.

## Scope and review gate

- PRD/ADM scope: G-1, G-7, ADM-3, ADM-4, ADM-5.
- Staging Web: https://staging.chinasupply.ai
- Staging API: https://api-staging.chinasupply.ai
- Operations account observed in `/ops`:
  `user_3Gr8DpJw59xwHVz70XQ2VCm6yma`
- Initial state: all five records were `Published + Verified`.
- Evidence accessed at (UTC): 2026-07-27.
- Postflight recorded at (UTC): 2026-07-27T04:39:07Z.
- Owner attestation recorded at (UTC): 2026-07-27.
- Final ADM-5/publication postflight recorded at (UTC):
  2026-07-27T05:16:06Z.

## Imagery method

Each current value and each `packages/geo` `gcj02ToWgs84` reference candidate
was opened as an exact coordinate pin in Google Earth satellite view. The
high-resolution roof, road, water, parking, and field features were
cross-checked against the WGS-84-georeferenced Sentinel-2 L2A natural-color
item
`S2B_MSIL2A_20260407T023549_R089_T51SUR_20260407T044802` through Microsoft
Planetary Computer.

The tightened SOP gate is literal: a factory coordinate passes only when the
pin is on a factory-building footprint. A nearby gate, road, parking area,
industrial park, field, or water body does not pass.

## Per-record evidence

### `nantong-luolai-lifestyle`

- `/ops` id: `1wVCjRxeAY3tDnY3SXxMt`
- official/regulatory evidence: Luolai official website and the previously
  recorded Xinghu Avenue plant evidence
- current value:
  [Google Earth satellite view](https://earth.google.com/web/search/31.934472,120.918809),
  `[120.918809,31.934472]`
- reference candidate:
  [Google Earth satellite view](https://earth.google.com/web/search/31.9366294,120.9145918),
  `[120.9145918,31.9366294]`
- visual basis: the current pin is on the multi-lane bridge across a water
  body. The reference candidate is on a traffic lane of Xinghu Avenue; large
  rectangular factory roofs and a paved factory yard are visible immediately
  south, but the pin does not overlap a roof.
- decision: neither candidate passes the factory-roof gate.
- staging action: coordinate unchanged; unpublish and save through `/ops`;
  final state `Draft + Unverified`.

### `nantong-xinyi-home-textile`

- `/ops` id: `0VI72IH1WZVGo3HPRTAd1`
- official evidence: Xinyi official site records a 30-mu production park and
  the Zixing Village address
- current value:
  [Google Earth satellite view](https://earth.google.com/web/search/32.0685104,120.9732048),
  `[120.9732048,32.0685104]`
- reference candidate:
  [Google Earth satellite view](https://earth.google.com/web/search/32.0706056,120.9688606),
  `[120.9688606,32.0706056]`
- visual basis: the current pin is in the surface-parking area beside Nantong
  Xingdong International Airport's terminal. The reference candidate is on
  Airport Avenue beside a residential/green strip. Neither pin overlaps a
  factory roof matching the documented production park.
- decision: neither candidate passes; a new traceable roof-level coordinate is
  required.
- staging action: coordinate unchanged; unpublish and save through `/ops`;
  final state `Draft + Unverified`.

### `nantong-violet-home-textile`

- `/ops` id: `1ofyBDJtPgDAvCWmROfzI`
- official evidence: Violet official site records its production center and
  industrial-park address
- current value:
  [Google Earth satellite view](https://earth.google.com/web/search/31.9649,121.01587),
  `[121.01587,31.9649]`
- reference candidate:
  [Google Earth satellite view](https://earth.google.com/web/search/31.9668470,121.0113817),
  `[121.0113817,31.9668470]`
- visual basis: the current pin is on cultivated plots/nursery rows. The
  reference candidate is on the east-west access road between narrow northern
  industrial roofs and a larger southern solar-roof complex, not on either
  building footprint.
- decision: neither candidate passes; a new traceable roof-level coordinate is
  required.
- staging action: coordinate unchanged; unpublish and save through `/ops`;
  final state `Draft + Unverified`.

### `nantong-jinkanghong-textile`

- `/ops` id: `7xkIy5So-yz4eUZodAVMj`
- official evidence: Jinkanghong official site records its Xiting Town factory
  and integrated digital-printing manufacturing chain
- current value:
  [Google Earth satellite view](https://earth.google.com/web/search/32.09873,121.02599),
  `[121.02599,32.09873]`
- corrected value:
  [Google Earth satellite view](https://earth.google.com/web/search/32.1006772,121.0214538),
  `[121.0214538,32.1006772]`
- conversion evidence: the Google Maps place source was treated as GCJ-02 and
  converted with `packages/geo` `gcj02ToWgs84`.
- visual basis: the current pin is on a cultivated field among scattered
  houses. The corrected pin overlaps the north-west edge of a continuous blue
  factory roof; the same compound contains several aligned blue roofs and
  paved internal yards.
- decision: corrected value passes the evidence-preparation gate. Final SOP
  pass remains an Owner decision.
- staging action: unpublish, update to
  `[121.0214538,32.1006772]`, and save through `/ops`; final state
  `Draft + Unverified`.

### `nantong-nanshing-home-textile`

- `/ops` id: `1eOVHEGBEs2aKp71P7dRF`
- official evidence: Nanshing official site records a 30,000-square-meter
  factory, 500+ machines, and the Jianghai Avenue address
- current value:
  [Google Earth satellite view](https://earth.google.com/web/search/32.0469352,121.0369299),
  `[121.0369299,32.0469352]`
- reference candidate:
  [Google Earth satellite view](https://earth.google.com/web/search/32.0488415,121.0323614),
  `[121.0323614,32.0488415]`
- visual basis: the current pin is in the Tonglü Canal waterway beside a
  bridge. The reference candidate is on a Jianghai Avenue traffic
  lane/central divider; industrial roofs are north of the avenue, but the pin
  does not overlap one.
- decision: neither candidate passes; a new traceable roof-level coordinate is
  required.
- staging action: coordinate unchanged; unpublish and save through `/ops`;
  final state `Draft + Unverified`.

## `/ops` result and public isolation

- All mutations used the authenticated staging `/ops`; no SQL, seed, import,
  or temporary mutation script was used.
- Every unpublish action completed before the corresponding save. Each status
  transition therefore purged the MAP cache through ADM-4.
- Pre-attestation containment state in `/ops`:
  - `nantong-luolai-lifestyle`: `Draft + Unverified`
  - `nantong-xinyi-home-textile`: `Draft + Unverified`
  - `nantong-violet-home-textile`: `Draft + Unverified`
  - `nantong-jinkanghong-textile`: `Draft + Unverified`
  - `nantong-nanshing-home-textile`: `Draft + Unverified`
- Reloaded Jinkanghong detail showed
  `[121.0214538,32.1006772]`.
- `GET /api/v1/factories?cluster=nantong-home-textiles&limit=20` returned zero
  records.
- All five public factory detail routes returned HTTP 404.
- `GET /api/v1/map/factories?bbox=120.8,31.8,121.2,32.2` returned zero
  features and `meta.truncated=false`; the first postflight request had
  `CF-Cache-Status: MISS`, and the identical second request had
  `CF-Cache-Status: HIT`.

## Owner-signed finalization

- PR #63 was merged as `ddc5c3d17e91b344544b91229084dc724213c26e`
  after its CI Gate passed. Main CI run `30238836667`, CMS migration, core
  migration, and Staging Release Gate all passed.
- Railway API deployment `300ee622-5c3f-4fe1-a84b-80fbd121f217` and Worker
  deployment `144341c6-5d3f-4d34-b5cc-20ddcb2f60fe` both reached `SUCCESS` on
  the exact merge commit before ADM-5.
- Through the authenticated staging `/ops` session, Owner attestation was
  applied only to Jinkanghong. ADM-5 wrote:
  - `verifiedAt = 2026-07-27T05:13:42.340Z`
  - `lastVerifiedAt = 2026-07-27T05:13:42.340Z`
  - `verifiedBy = user_3Gr8DpJw59xwHVz70XQ2VCm6yma`
- Jinkanghong was then published through `/ops`; its final state is
  `Published + Verified` at `[121.0214538,32.1006772]`.
- Luolai, Xinyi, Violet, and Nanshing were not verified or published. Their
  final state remains `Draft + Unverified`.
- Public postflight:
  - Jinkanghong detail returned HTTP 200, `verified=true`, the corrected
    coordinate, and the new matching verification timestamps.
  - The Nantong cluster factory list returned exactly Jinkanghong.
  - The other four factory detail routes returned HTTP 404.
  - MAP-3 returned exactly one Jinkanghong feature at the corrected coordinate
    with `meta.truncated=false`; the first request had `CF-Cache-Status: MISS`
    and the identical second request had `CF-Cache-Status: HIT` with `age: 24`.

## Owner attestation and remaining gate

- Owner statement recorded in the Codex task on 2026-07-27: `签署通过`.
- Attestation scope: accept Jinkanghong's corrected roof-level coordinate and
  the evidence package; reject both reviewed candidates for Luolai, Xinyi,
  Violet, and Nanshing, which remain ineligible for verification until new
  traceable roof-level evidence is supplied.

- [x] Owner reviewed the five exact coordinate comparisons and the strengthened
      SOP.
- [x] Owner accepted Jinkanghong's corrected roof-level coordinate.
- [x] Owner rejected the reviewed candidates for Luolai, Xinyi, Violet, and
      Nanshing; those records remain `Draft + Unverified` pending new evidence.
- [x] ADM-5 wrote new `verifiedAt`, `lastVerifiedAt`, and `verifiedBy` for each
      accepted record.
- [x] Accepted records were republished through `/ops`, with MAP purge and
      public API convergence rechecked.

The signed remediation is complete for Jinkanghong. The other four records
remain `Draft + Unverified` until new traceable roof-level evidence is supplied;
this is the required safe outcome, not a waived check. No development-plan
checkbox was changed because this remediation is not a numbered plan task.
