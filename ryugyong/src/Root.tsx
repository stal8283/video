import React from 'react';
import { Composition, Still } from 'remotion';
import { CharacterSheet } from './sheets/CharacterSheet';

export const Root: React.FC = () => (
  <>
    <Still id="CharacterSheet" component={CharacterSheet} width={3840} height={2700} />
  </>
);
void Composition;
