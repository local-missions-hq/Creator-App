import { DynamicColorIOS, Platform, type ColorValue } from 'react-native';

import { themeHex } from './themeTokens';

export { themeHex } from './themeTokens';

function adaptive(light: string, dark: string): ColorValue {
  return Platform.OS === 'ios' ? DynamicColorIOS({ dark, light }) : light;
}

export const appColors = {
  canvas: adaptive(themeHex.light.canvas, themeHex.dark.canvas),
  card: adaptive(themeHex.light.card, themeHex.dark.card),
  ink: adaptive(themeHex.light.ink, themeHex.dark.ink),
  line: adaptive(themeHex.light.line, themeHex.dark.line),
  muted: adaptive(themeHex.light.muted, themeHex.dark.muted),
  orange: adaptive(themeHex.light.orange, themeHex.dark.orange),
  orangeSoft: adaptive(themeHex.light.orangeSoft, themeHex.dark.orangeSoft),
  teal: adaptive(themeHex.light.teal, themeHex.dark.teal),
  tealSoft: adaptive(themeHex.light.tealSoft, themeHex.dark.tealSoft),
  success: adaptive(themeHex.light.success, themeHex.dark.success),
  successSoft: adaptive(themeHex.light.successSoft, themeHex.dark.successSoft),
  warning: adaptive(themeHex.light.warning, themeHex.dark.warning),
  warningSoft: adaptive(themeHex.light.warningSoft, themeHex.dark.warningSoft),
  error: adaptive(themeHex.light.error, themeHex.dark.error),
  errorSoft: adaptive(themeHex.light.errorSoft, themeHex.dark.errorSoft),
  locked: adaptive(themeHex.light.locked, themeHex.dark.locked),
  lockedSoft: adaptive(themeHex.light.lockedSoft, themeHex.dark.lockedSoft),
  onAccent: '#ffffff',
  scrim: adaptive('rgba(16,42,67,0.42)', 'rgba(0,0,0,0.64)'),
  sheetHandle: adaptive('#b8c0c7', '#688196'),
} satisfies Record<string, ColorValue>;
