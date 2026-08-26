import { Ionicons as ExpoIonicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type DecorativeIconProps = ComponentProps<typeof ExpoIonicons>;

function DecorativeIonicon(props: DecorativeIconProps) {
  return (
    <ExpoIonicons
      {...props}
      accessibilityElementsHidden
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export const Ionicons = Object.assign(DecorativeIonicon, {
  glyphMap: ExpoIonicons.glyphMap,
});
