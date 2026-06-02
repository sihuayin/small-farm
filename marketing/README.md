# Marketing Kit

This folder contains first-round alpha marketing materials for Small Farm Planner.

## Contents

- `social-copy.md`: social media copy for X, Threads, LinkedIn, Indie Hackers, and tester outreach.
- `xiaohongshu/README.md`: 小红书图文笔记、配图顺序、视频字幕和发布话题。
- `screenshots/01-planner-overview.png`: product overview screenshot.
- `screenshots/02-plant-library.png`: Plant Library screenshot.
- `screenshots/03-action-button.png`: action-oriented planner screenshot.

## Video

The Remotion promo video source is in `apps/video`.

After dependencies are installed, render:

```bash
pnpm install
pnpm --filter video render
```

Optional poster frame:

```bash
pnpm --filter video still
```

Xiaohongshu vertical video:

```bash
pnpm --filter video render:xhs
pnpm --filter video still:xhs
```

Outputs:

- `marketing/small-farm-promo.mp4`
- `marketing/small-farm-promo-poster.png`
- `marketing/small-farm-xhs.mp4`
- `marketing/small-farm-xhs-poster.png`

## Current Note

The Remotion project is ready, but the MP4 was not rendered locally because dependency installation could not reach the npm registry from this environment.
