# @chinasupply/geo

Shared, dependency-free coordinate and navigation primitives for
ChinaSupply.AI.

## Coordinate contract

- Every coordinate is a `[longitude, latitude]` tuple.
- Database and public API coordinates remain WGS-84.
- GCJ-02 and BD-09 conversions are limited to data import and, after its
  separate validation gate, navigation.
- Conversion functions do not mutate their input and return a new tuple.
- Coordinates outside the China conversion bounds are returned unchanged.

## Exports

- Types: `Wgs84Position`, `Gcj02Position`, `Bd09Position`
- Validation: `isWgs84Position`
- WGS-84 / GCJ-02: `wgs84ToGcj02`, `gcj02ToWgs84`
- GCJ-02 / BD-09: `gcj02ToBd09`, `bd09ToGcj02`
- WGS-84 / BD-09: `wgs84ToBd09`, `bd09ToWgs84`
- Navigation: `buildNavUrl`, `NAVIGATION_VALIDATION_FIXTURES`
- Navigation types: `NavigationTarget`, `NavigationUrls`,
  `NavigationCoordinateMode`

GCJ-02 to WGS-84 uses a high-precision iterative inverse with at most 30
iterations and a convergence threshold of `1e-7` degrees. WGS-84 / BD-09
conversions compose through GCJ-02 so that there is only one implementation of
each coordinate-system boundary.

The coordinate-pair tests use public fixtures from
[EvilTransform](https://github.com/googollee/eviltransform/blob/master/javascript/test.js)
and
[coordtransform](https://github.com/wandergis/coordtransform/blob/master/test/app.js),
with an explicit 0.5 metre error ceiling.

## Navigation contract

M0-T9 physical-device validation selected WGS-84 for every current provider.
Every generated link opens a route-planning view with the destination filled;
none of the templates forces live navigation to start.

- iOS: Apple Maps, Google Maps, Amap, and Baidu Maps.
- Android: Google Maps, Amap, and Baidu Maps. The `NavigationTarget` union
  rejects Android Apple Maps at compile time.
- Google and Apple use their HTTPS map links for both app dispatch and browser
  fallback.
- Amap uses its platform-specific route-planning URI plus an HTTPS web
  fallback.
- Baidu uses `baidumap://map/direction` for the app. Its physical-device
  verified web fallback is the official marker page, where the user can choose
  “到这去” without granting location access first.

```ts
import { buildNavUrl } from "@chinasupply/geo/navigation";

const links = buildNavUrl(
  {
    platform: "android",
    provider: "amap",
    destinationName: "国家会议中心",
  },
  [116.3838387, 39.9984707],
);

links.app;
// { coordinateMode: "wgs84", url: "amapuri://route/plan/?..." }

links.webFallback;
// { coordinateMode: "wgs84", url: "https://uri.amap.com/navigation?..." }
```

The optional third `gcj02` argument preserves an original source coordinate in
the public contract. Current verified rules do not consume it because every
provider passed with WGS-84. A future coordinate-rule change requires a new
physical-device validation conclusion before this implementation changes.
