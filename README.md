# history-snack-renderer

Generic Remotion render worker for Bunny Magic Containers. It contains no story code or media:
it renders from a Remotion bundle hosted on Bunny (`BUNDLE_URL`) and uploads the MP4 back to Bunny storage.

Env: `BUNDLE_URL`, `BUNNY_ZONE`, `BUNNY_KEY`, `BUNNY_CDN`, `RENDER_SECRET`, optional `CONCURRENCY` (default 8).
API: `GET /health`, `POST /render` with header `x-render-secret` and body `{"story":"spinoza","cut":"short"}`.
