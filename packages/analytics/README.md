# @chinasupply/analytics

Consent-aware analytics facade shared by Web and Mobile.

The package deliberately has no PostHog dependency. Applications may inject a
capture adapter only after loading their analytics SDK following explicit
consent. Until consent is `granted` and an adapter is configured, every tracking
method is a complete no-op.

Search queries are privacy-filtered inside this package before an event reaches
an adapter: email and phone-like values are redacted, whitespace is normalized,
and the result is limited to 100 Unicode characters.

Factory contact and navigation events only include the factory identity plus the
selected contact method or navigation provider/platform. Contact values,
addresses, and coordinates never enter analytics payloads.

The frozen V1 event surface is:

- `search_performed`
- `cluster_viewed`
- `factory_viewed`
- `factory_contact_clicked`
- `navigation_clicked`
- `map_moved`

`map_moved` accepts only the normalized WGS-84 `bbox`, integer `zoom`, and
nullable `categorySlug`. The facade permits one successfully captured map event
per `MAP_MOVED_THROTTLE_MS` (10 seconds). Events attempted without consent or a
capture adapter are neither queued nor counted against that window.

`AnalyticsClient.subscribe` and `getConsent` form the external-store interface
used by React consumers. `setConsent` notifies subscribers only when the consent
state actually changes. All tracking methods return `void` and isolate adapter
errors from product interactions.
