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
