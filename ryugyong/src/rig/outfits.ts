import type { Outfit } from './Character';

/* Main cast */
export const GUEST: Outfit = {
  name: 'The Guest', skin: '#EBC3A0', skinShade: '#C99878',
  hair: { style: 'sidepart', color: '#5B3A26', hi: '#8A5E40' },
  top: { kind: 'parka', color: '#4A6B6E', dark: '#34504F', light: '#B9B09A' },
  legs: '#2B2B33', shoes: '#3A2A20', glasses: 'round', scarf: '#B98A3A',
};
export const CLERK: Outfit = {
  name: 'The Clerk', skin: '#E6BE96', skinShade: '#C29673',
  hair: { style: 'sidepart', color: '#1E1E22', hi: '#4A4A55' },
  hat: { kind: 'peaked', color: '#2C3E50', band: '#7A2E2A' },
  top: { kind: 'uniform', color: '#2C3E50', dark: '#1D2A37', light: '#3E5568', trim: '#C8A64B', badge: 'DESK' },
  legs: '#1D2A37', shoes: '#151515',
};
export const EXEC: Outfit = {
  name: 'The Hotel Exec', skin: '#B98058', skinShade: '#8E5E3E',
  hair: { style: 'bun', color: '#2A1A14', hi: '#5C3B2C' },
  top: { kind: 'suit', color: '#6B7178', dark: '#4B5056', light: '#8A9097', shirt: '#F4F1EA', badge: 'HOTEL CO.' },
  legs: '#2E3036', shoes: '#1A1A1A', glasses: 'square',
};
/* Extras */
export const BUILDER: Outfit = {
  name: 'Builder, 1987', skin: '#E2B48C', skinShade: '#BE8E68',
  hair: { style: 'short', color: '#2A2420', hi: '#4A403A' },
  hat: { kind: 'hardhat', color: '#C99A2E', band: '#8C6A1E' },
  top: { kind: 'parka', color: '#556B7D', dark: '#3E4F5D', light: '#7F8F9C' },
  legs: '#3A3F46', shoes: '#3A2A20',
};
export const INSTALLER: Outfit = {
  name: 'Glass fitter, 2011', skin: '#A8724E', skinShade: '#82553A',
  hair: { style: 'short', color: '#1E1A18', hi: '#3E3632' },
  hat: { kind: 'hardhat', color: '#EDEBE4', band: '#A9A59A' },
  top: { kind: 'vest', color: '#C9773A', dark: '#9C5A2A', light: '#E09A5E', shirt: '#6B6F73' },
  legs: '#3A3F46', shoes: '#2A2A2A',
};
export const DOORMAN: Outfit = {
  name: 'Doorman, Singapore 1986', skin: '#D9A77F', skinShade: '#B5845F',
  hair: { style: 'short', color: '#1A1A1E', hi: '#3A3A44' },
  hat: { kind: 'pillbox', color: '#7A2E3A', band: '#C8A64B' },
  top: { kind: 'doorman', color: '#7A2E3A', dark: '#5A1F28', light: '#94485A', trim: '#C8A64B' },
  legs: '#2A1A1E', shoes: '#151515',
};
export const CITIZEN: Outfit = {
  name: 'Passer-by, Pyongyang', skin: '#E3BB93', skinShade: '#BF946F',
  hair: { style: 'short', color: '#1C1C20', hi: '#3C3C46' },
  top: { kind: 'coat', color: '#4D5446', dark: '#373D32', light: '#6A7262', shirt: '#D8D2C0' },
  legs: '#2A2C2A', shoes: '#1A1A1A',
};
export const MAIN = [GUEST, CLERK, EXEC];
export const EXTRAS = [BUILDER, INSTALLER, DOORMAN, CITIZEN];
