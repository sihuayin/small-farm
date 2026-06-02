import React from 'react';
import { Composition } from 'remotion';
import { SmallFarmPromo } from './SmallFarmPromo';
import { SmallFarmXhs } from './SmallFarmXhs';

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="SmallFarmPromo"
        component={SmallFarmPromo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="SmallFarmXhs"
        component={SmallFarmXhs}
        durationInFrames={680}
        fps={30}
        width={1080}
        height={1440}
      />
    </>
  );
}
