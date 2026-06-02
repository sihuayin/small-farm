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

const lifeShots = {
  start: staticFile('xhs-life/01-start.png'),
  plants: staticFile('xhs-life/02-pick-plants.png'),
  ready: staticFile('xhs-life/03-ready.png'),
  planted: staticFile('xhs-life/04-planted.png'),
  growth: staticFile('xhs-life/05-growth-60.png'),
  harvestReady: staticFile('xhs-life/06-harvest-ready.png'),
  harvestPanel: staticFile('xhs-life/07-harvest-panel.png')
};

const scenes = [
  {
    from: 78,
    duration: 76,
    image: lifeShots.start,
    step: '01',
    title: '先设置你的菜园',
    body: '小园子、后院菜畦、小农地，都可以先定尺寸。',
    cursor: { x: 550, y: 1020 },
    fit: 'full' as const
  },
  {
    from: 146,
    duration: 82,
    image: lifeShots.plants,
    step: '02',
    title: '挑出这季想种的植物',
    body: '蔬菜、香草、花卉、果物，先放进自己的工具箱。',
    cursor: { x: 615, y: 620 },
    fit: 'full' as const
  },
  {
    from: 222,
    duration: 82,
    image: lifeShots.ready,
    step: '03',
    title: '点击地块，种下第一棵',
    body: '地块像游戏地图一样可操作，但背后是种植规则。',
    cursor: { x: 560, y: 645 },
    fit: 'garden' as const
  },
  {
    from: 298,
    duration: 82,
    image: lifeShots.planted,
    step: '04',
    title: '它会进入生长状态',
    body: '地块会显示植物、状态、任务和下一步操作。',
    cursor: { x: 600, y: 655 },
    fit: 'garden' as const
  },
  {
    from: 374,
    duration: 82,
    image: lifeShots.growth,
    step: '05',
    title: '把时间往后推',
    body: '看它长大，也看系统什么时候提醒浇水、施肥、采收。',
    cursor: { x: 735, y: 190 },
    fit: 'garden' as const
  },
  {
    from: 450,
    duration: 76,
    image: lifeShots.harvestReady,
    step: '06',
    title: '成熟后，采收按钮出现',
    body: '需要用户操作时才强调按钮，没有任务时就保持干净。',
    cursor: { x: 815, y: 930 },
    fit: 'garden' as const
  },
  {
    from: 520,
    duration: 78,
    image: lifeShots.harvestPanel,
    step: '07',
    title: '收获后继续下一季',
    body: '记录结果、清理地块，再进入轮作和下一轮规划。',
    cursor: { x: 840, y: 290 },
    fit: 'garden' as const
  }
];

export function SmallFarmXhs() {
  return (
    <AbsoluteFill style={styles.stage}>
      <Backdrop />
      <Sequence from={0} durationInFrames={96}>
        <CoverScene />
      </Sequence>
      {scenes.map((scene) => (
        <Sequence key={scene.step} from={scene.from} durationInFrames={scene.duration}>
          <FlowScene {...scene} />
        </Sequence>
      ))}
      <Sequence from={592} durationInFrames={88}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
}

function Backdrop() {
  return (
    <AbsoluteFill>
      <div style={styles.skyGlow} />
      <div style={styles.ground} />
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          style={{
            ...styles.soilTile,
            left: 32 + (index % 5) * 218,
            top: 1180 + Math.floor(index / 5) * 90
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

function CoverScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 88 } });
  const fadeIn = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [76, 96], [1, 0], { extrapolateLeft: 'clamp' });
  const opacity = Math.min(fadeIn, fadeOut);
  const imageScale = interpolate(frame, [0, 96], [1.08, 1.13], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...styles.cover, opacity }}>
      <div style={{ ...styles.coverShot, transform: `translateY(${(1 - enter) * 34}px) rotate(-2deg)` }}>
        <Img src={lifeShots.harvestReady} style={{ ...styles.coverGardenImage, transform: `scale(${imageScale})` }} />
      </div>
      <div style={styles.coverOverlay}>
        <div style={styles.badge}>Alpha 体验邀请</div>
        <div style={styles.coverTitle}>
          有个小园子？
          <br />
          先在网页里种一遍
        </div>
        <div style={styles.coverBody}>
          从选植物、种下、成长到采收，先在网页里走一遍。
        </div>
      </div>
    </AbsoluteFill>
  );
}

function FlowScene({
  image,
  step,
  title,
  body,
  cursor,
  fit,
  duration
}: {
  image: string;
  step: string;
  title: string;
  body: string;
  cursor: { x: number; y: number };
  fit: 'full' | 'garden';
  duration: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 92 } });
  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [duration - 14, duration], [1, 0], { extrapolateLeft: 'clamp' });
  const opacity = Math.min(fadeIn, fadeOut);
  const imageY = interpolate(enter, [0, 1], [54, 0]);
  const imageScale = interpolate(frame, [0, duration], fit === 'garden' ? [1.08, 1.13] : [1, 1.035], {
    extrapolateRight: 'clamp'
  });
  const imageX = interpolate(frame, [0, duration], fit === 'garden' ? [10, -14] : [0, -8], {
    extrapolateRight: 'clamp'
  });
  const cursorPulse = 1 + Math.sin(frame / 5) * 0.08;
  const clickScale = frame > 34 && frame < 50 ? interpolate(frame, [34, 42, 50], [0.3, 1, 1.35]) : 0;
  const clickOpacity = frame > 34 && frame < 50 ? interpolate(frame, [34, 42, 50], [0.65, 0.35, 0]) : 0;

  return (
    <AbsoluteFill style={{ ...styles.flow, opacity }}>
      <div style={{ ...styles.screenCard, transform: `translateY(${imageY}px)` }}>
        <Img
          src={image}
          style={{
            ...(fit === 'garden' ? styles.gardenFocusImage : styles.screenImage),
            transform: `translateX(${imageX}px) scale(${imageScale})`
          }}
        />
        <div style={{ ...styles.cursor, left: cursor.x, top: cursor.y, transform: `scale(${cursorPulse})` }}>
          <div style={styles.cursorPoint} />
        </div>
        <div
          style={{
            ...styles.clickRing,
            left: cursor.x - 28,
            top: cursor.y - 28,
            opacity: clickOpacity,
            transform: `scale(${clickScale})`
          }}
        />
      </div>
      <div style={styles.stepPanel}>
        <div style={styles.stepBadge}>{step}</div>
        <div style={styles.stepTitle}>{title}</div>
        <div style={styles.stepBody}>{body}</div>
      </div>
    </AbsoluteFill>
  );
}

function ClosingScene() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...styles.closing, opacity }}>
      <div style={styles.badge}>Small Farm Planner</div>
      <div style={styles.closeTitle}>想找真实种菜的人试用</div>
      <div style={styles.closeBody}>
        如果你有农地、后院、阳台菜畦，欢迎帮我看看它到底有没有用。
      </div>
      <div style={styles.cta}>github.com/sihuayin/small-farm</div>
    </AbsoluteFill>
  );
}

const styles: Record<string, React.CSSProperties> = {
  stage: {
    background: 'linear-gradient(180deg, #91d7eb 0%, #b8dfbd 52%, #86c982 100%)',
    color: '#2f1d0d',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    overflow: 'hidden'
  },
  skyGlow: {
    position: 'absolute',
    right: 56,
    top: 52,
    width: 190,
    height: 190,
    borderRadius: 999,
    background: '#fff0a6',
    boxShadow: '0 0 88px rgba(255,240,166,0.88)'
  },
  ground: {
    position: 'absolute',
    left: -80,
    right: -80,
    bottom: -160,
    height: 420,
    transform: 'rotate(-4deg)',
    background: 'rgba(247,232,200,0.5)'
  },
  soilTile: {
    position: 'absolute',
    width: 138,
    height: 78,
    transform: 'skewY(-22deg) rotate(22deg)',
    borderRadius: 10,
    background: 'rgba(82, 57, 31, 0.22)',
    border: '3px solid rgba(82, 57, 31, 0.18)'
  },
  cover: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 54
  },
  coverShot: {
    position: 'absolute',
    width: 960,
    height: 900,
    top: 78,
    borderRadius: 30,
    border: '8px solid rgba(80,50,24,0.22)',
    overflow: 'hidden',
    boxShadow: '0 24px 70px rgba(61,40,20,0.26)'
  },
  coverGardenImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: '24% 73%'
  },
  coverOverlay: {
    position: 'absolute',
    left: 58,
    right: 58,
    bottom: 86,
    borderRadius: 28,
    border: '4px solid rgba(67,93,54,0.22)',
    background: 'rgba(255,248,223,0.96)',
    padding: 42,
    boxShadow: '0 12px 0 rgba(120,72,24,0.14)'
  },
  badge: {
    display: 'inline-block',
    border: '3px solid rgba(47,107,63,0.22)',
    background: '#fff8df',
    borderRadius: 999,
    padding: '13px 24px',
    fontSize: 27,
    fontWeight: 950,
    color: '#2f6b3f'
  },
  coverTitle: {
    marginTop: 24,
    fontSize: 78,
    lineHeight: 1.08,
    fontWeight: 950,
    letterSpacing: 0
  },
  coverBody: {
    marginTop: 22,
    fontSize: 34,
    lineHeight: 1.36,
    fontWeight: 800,
    color: '#6b461f'
  },
  flow: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 44
  },
  screenCard: {
    position: 'absolute',
    top: 54,
    width: 996,
    height: 1038,
    borderRadius: 28,
    border: '8px solid rgba(80,50,24,0.22)',
    background: '#fff8df',
    overflow: 'hidden',
    boxShadow: '0 18px 0 rgba(120,72,24,0.16), 0 32px 76px rgba(61,40,20,0.26)'
  },
  screenImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  gardenFocusImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: '24% 73%'
  },
  cursor: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 999,
    border: '5px solid #fff8df',
    background: '#2f6b3f',
    boxShadow: '0 8px 20px rgba(47,107,63,0.34)'
  },
  cursorPoint: {
    position: 'absolute',
    left: 16,
    top: 16,
    width: 16,
    height: 16,
    borderRadius: 999,
    background: '#fff8df'
  },
  clickRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 999,
    border: '8px solid #fff8df',
    boxShadow: '0 0 0 5px rgba(47,107,63,0.45)'
  },
  stepPanel: {
    position: 'absolute',
    left: 54,
    right: 54,
    bottom: 58,
    borderRadius: 26,
    border: '4px solid rgba(67,93,54,0.22)',
    background: 'rgba(255,248,223,0.96)',
    padding: 34,
    boxShadow: '0 12px 0 rgba(120,72,24,0.14)'
  },
  stepBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    background: '#2f6b3f',
    color: '#fff8df',
    fontSize: 24,
    fontWeight: 950,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepTitle: {
    marginTop: 18,
    fontSize: 52,
    lineHeight: 1.08,
    fontWeight: 950
  },
  stepBody: {
    marginTop: 14,
    fontSize: 29,
    lineHeight: 1.36,
    fontWeight: 780,
    color: '#6b461f'
  },
  closing: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: 72
  },
  closeTitle: {
    marginTop: 32,
    fontSize: 72,
    lineHeight: 1.1,
    fontWeight: 950
  },
  closeBody: {
    marginTop: 28,
    fontSize: 34,
    lineHeight: 1.38,
    fontWeight: 780,
    color: '#6b461f'
  },
  cta: {
    marginTop: 36,
    borderRadius: 18,
    background: '#2f6b3f',
    color: '#fff8df',
    padding: '18px 28px',
    fontSize: 28,
    fontWeight: 900
  }
};
