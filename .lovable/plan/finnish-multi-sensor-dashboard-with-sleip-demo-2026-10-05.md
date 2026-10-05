# Finnish multi-sensor dashboard with SLEIP demo

## Build
- Translate the complete dashboard interface, charts, statuses, insights, exports, and page metadata into Finnish.
- Expand stable test data with carbon dioxide, ammonia, fine particles, temperature, and humidity.
- Make air quality and other stable conditions the primary Stable view; retain drinking as supporting information.
- Add a dedicated SLEIP Data Dashboard demo view using deterministic gait and movement metrics for the selected horse.
- Export data appropriate to each active view.

## Technical details
- Keep all demo data behind the existing asynchronous mock API for an easy later switch to real endpoints.
- Add focused tests for air-quality status thresholds and generated SLEIP data.
- Verify tests, build status, and the desktop preview for chart rendering and text fit.
