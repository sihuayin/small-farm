import React from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';

const screenshots = [
  staticFile('01-planner-overview.png'),
  staticFile('02-plant-library.png'),
  staticFile('03-action-button.png')
];

export function SmallFarmPromo() {
  return (
    <AbsoluteFill style={styles.stage}>
      <FarmBackdrop />
      <Sequence from={0} durationInFrames={180}>
        <HeroScene />
      </Sequence>
      <Sequence from={150} durationInFrames={210}>
        <ScreenshotScene
          image={screenshots[0]}
          eyebrow="Game-like planning"
          title="Plan a real backyard garden like a cozy farm game."
          body="Drag crops, beds, paths, and fences onto a grid made for home growers."
        />
      </Sequence>
      <Sequence from={330} durationInFrames={210}>
        <ScreenshotScene
          image={screenshots[1]}
          eyebrow="Your garden kit"
          title="Choose only the plants you actually want to grow."
          body="Build a personal kit from vegetables, herbs, flowers, and fruit."
          reverse
        />
      </Sequence>
      <Sequence from={510} durationInFrames={210}>
        <ScreenshotScene
          image={screenshots[2]}
          eyebrow="Actionable care"
          title="Harvest, water, clean up, and plan the next season."
          body="The app shows big buttons only when there is something useful to do."
        />
      </Sequence>
      <Sequence from={720} durationInFrames={180}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
}

function FarmBackdrop() {
  return (
    <AbsoluteFill>
      <div style={styles.sun} />
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          style={{
            ...styles.tile,
            left: 110 + index * 150,
            top: 740 + (index % 2) * 42,
            opacity: 0.14 + (index % 3) * 0.04
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

function HeroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const opacity = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...styles.center, opacity }}>
      <div style={{ ...styles.badge, transform: `translateY(${(1 - rise) * 22}px)` }}>Small Farm Planner</div>
      <div style={{ ...styles.heroTitle, transform: `translateY(${(1 - rise) * 30}px)` }}>
        A game-like planner for real backyard gardens.
      </div>
      <div style={styles.heroSubtitle}>
        Companion planting, crop rotation, weather tasks, harvests, and next-season planning in one cozy browser tool.
      </div>
    </AbsoluteFill>
  );
}

function ScreenshotScene({
  image,
  eyebrow,
  title,
  body,
  reverse = false
}: {
  image: string;
  eyebrow: string;
  title: string;
  body: string;
  reverse?: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const imageX = interpolate(enter, [0, 1], [reverse ? 80 : -80, 0]);
  const copyX = interpolate(enter, [0, 1], [reverse ? -60 : 60, 0]);

  return (
    <AbsoluteFill style={styles.scene}>
      <div style={{ ...styles.sceneGrid, flexDirection: reverse ? 'row-reverse' : 'row' }}>
        <div style={{ ...styles.screenshotFrame, transform: `translateX(${imageX}px)` }}>
          <Img src={image} style={styles.screenshot} />
        </div>
        <div style={{ ...styles.copyBlock, transform: `translateX(${copyX}px)` }}>
          <div style={styles.eyebrow}>{eyebrow}</div>
          <div style={styles.sceneTitle}>{title}</div>
          <div style={styles.sceneBody}>{body}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ClosingScene() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...styles.center, opacity }}>
      <div style={styles.badge}>Early Alpha</div>
      <div style={styles.heroTitle}>Try the 3-Min Check.</div>
      <div style={styles.heroSubtitle}>
        Help shape a practical garden planner for people who grow food at home.
      </div>
      <div style={styles.cta}>github.com/sihuayin/small-farm</div>
    </AbsoluteFill>
  );
}

const styles: Record<string, React.CSSProperties> = {
  stage: {
    background: 'linear-gradient(180deg, #91d7eb 0%, #9eddba 48%, #80c879 100%)',
    color: '#2f1d0d',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    overflow: 'hidden'
  },
  sun: {
    position: 'absolute',
    right: 130,
    top: 88,
    width: 140,
    height: 140,
    borderRadius: 999,
    background: '#fff0a6',
    boxShadow: '0 0 80px rgba(255, 240, 166, 0.85)'
  },
  tile: {
    position: 'absolute',
    width: 120,
    height: 72,
    transform: 'skewY(-22deg) rotate(22deg)',
    borderRadius: 10,
    background: '#f7e8c8',
    border: '3px solid rgba(90, 62, 32, 0.28)'
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: 120
  },
  badge: {
    display: 'inline-block',
    border: '3px solid rgba(67, 93, 54, 0.22)',
    background: '#fff8df',
    borderRadius: 10,
    padding: '14px 22px',
    fontSize: 26,
    fontWeight: 900,
    color: '#2f6b3f',
    boxShadow: '0 6px 0 rgba(120,72,24,0.14)'
  },
  heroTitle: {
    marginTop: 34,
    maxWidth: 1240,
    fontSize: 82,
    lineHeight: 1.02,
    fontWeight: 950,
    letterSpacing: 0
  },
  heroSubtitle: {
    marginTop: 28,
    maxWidth: 980,
    fontSize: 32,
    lineHeight: 1.35,
    fontWeight: 750,
    color: '#5f3d1b'
  },
  scene: {
    justifyContent: 'center',
    padding: 86
  },
  sceneGrid: {
    display: 'flex',
    alignItems: 'center',
    gap: 76
  },
  screenshotFrame: {
    width: 1120,
    height: 700,
    borderRadius: 18,
    border: '8px solid rgba(80, 50, 24, 0.22)',
    background: '#fff8df',
    overflow: 'hidden',
    boxShadow: '0 18px 0 rgba(120,72,24,0.16), 0 34px 80px rgba(61,40,20,0.28)'
  },
  screenshot: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  copyBlock: {
    width: 520,
    padding: 38,
    borderRadius: 16,
    border: '4px solid rgba(67, 93, 54, 0.2)',
    background: 'rgba(255, 248, 223, 0.92)',
    boxShadow: '0 10px 0 rgba(120,72,24,0.12)'
  },
  eyebrow: {
    fontSize: 24,
    fontWeight: 950,
    textTransform: 'uppercase',
    color: '#2f6b3f'
  },
  sceneTitle: {
    marginTop: 18,
    fontSize: 52,
    lineHeight: 1.05,
    fontWeight: 950
  },
  sceneBody: {
    marginTop: 22,
    fontSize: 27,
    lineHeight: 1.35,
    fontWeight: 760,
    color: '#6b461f'
  },
  cta: {
    marginTop: 36,
    borderRadius: 12,
    background: '#2f6b3f',
    color: '#fff8df',
    padding: '18px 28px',
    fontSize: 28,
    fontWeight: 900,
    boxShadow: '0 6px 0 rgba(47, 83, 56, 0.28)'
  }
};
