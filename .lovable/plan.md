# Finnish dashboard and stable air-quality focus

## Build
- Translate the complete dashboard interface, chart labels, statuses, insights, export names, and metadata into Finnish.
- Expand the deterministic stable test data with air-quality measurements: carbon dioxide, ammonia, and fine particles alongside temperature and humidity.
- Redesign the stable view so current air-quality readings and their trends are the primary content; retain drinking and horse sensor information as a smaller supporting section.
- Export stable air-quality readings in CSV while keeping horse drinking-event exports unchanged.

## Technical details
- Keep data behind the existing asynchronous mock API so the views can later move to real sensor endpoints unchanged.
- Add focused tests for generated air-quality data and status thresholds.
- Verify the build, tests, and desktop preview, including chart rendering and text fit.
