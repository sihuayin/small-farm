import React from 'react';
import { Composition } from 'remotion';
import { SmallFarmPromo } from './SmallFarmPromo';

export function RemotionRoot() {
  return (
    <Composition
      id="SmallFarmPromo"
      component={SmallFarmPromo}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
  );
}
