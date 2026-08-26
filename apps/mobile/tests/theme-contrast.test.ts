import { describe, expect, it } from 'vitest';

import { themeHex } from '../components/themeTokens';

function relativeLuminance(hex: string) {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16) / 255;
  const linearize = (value: number) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const red = linearize(channel(1));
  const green = linearize(channel(3));
  const blue = linearize(channel(5));

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

const ordinaryTextPairs = [
  ['ink on canvas', 'ink', 'canvas'],
  ['ink on card', 'ink', 'card'],
  ['muted on canvas', 'muted', 'canvas'],
  ['muted on card', 'muted', 'card'],
  ['Creator accent on card', 'teal', 'card'],
  ['Business accent on card', 'orange', 'card'],
  ['success on success soft', 'success', 'successSoft'],
  ['warning on warning soft', 'warning', 'warningSoft'],
  ['error on error soft', 'error', 'errorSoft'],
  ['locked on locked soft', 'locked', 'lockedSoft'],
] as const;

describe.each(['light', 'dark'] as const)('%s semantic palette', (mode) => {
  it.each(ordinaryTextPairs)(
    '%s meets WCAG AA ordinary-text contrast',
    (_, foreground, background) => {
      expect(
        contrastRatio(themeHex[mode][foreground], themeHex[mode][background]),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});
