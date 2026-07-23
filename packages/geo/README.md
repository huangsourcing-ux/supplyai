# @chinasupply/geo

Shared, dependency-free coordinate primitives for ChinaSupply.AI.

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

GCJ-02 to WGS-84 uses a high-precision iterative inverse with at most 30
iterations and a convergence threshold of `1e-7` degrees. WGS-84 / BD-09
conversions compose through GCJ-02 so that there is only one implementation of
each coordinate-system boundary.

The coordinate-pair tests use public fixtures from
[EvilTransform](https://github.com/googollee/eviltransform/blob/master/javascript/test.js)
and
[coordtransform](https://github.com/wandergis/coordtransform/blob/master/test/app.js),
with an explicit 0.5 metre error ceiling.

Navigation target selection and URL generation remain gated by M0-T9 and are
intentionally absent from this package.
