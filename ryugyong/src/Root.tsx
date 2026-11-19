import React from 'react';
import { Composition, Still } from 'remotion';
import { CharacterSheet } from './sheets/CharacterSheet';
import { Video } from './Video';
import { T } from './lib';

export const Root: React.FC = () => (
  <>
    <Still id="CharacterSheet" component={CharacterSheet} width={3840} height={2700} />
    <Composition id="Ryugyong" component={Video} width={1920} height={1080} fps={30} durationInFrames={T.frames} defaultProps={{ audio: true }} />
  </>
);
