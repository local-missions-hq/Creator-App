import { forwardRef, type ElementRef } from 'react';
import { Pressable as NativePressable, type PressableProps, StyleSheet } from 'react-native';

import { minimumTouchTarget } from './accessibilityTokens';

export const AccessiblePressable = forwardRef<ElementRef<typeof NativePressable>, PressableProps>(
  function AccessiblePressable({ style, ...props }, ref) {
    return (
      <NativePressable
        ref={ref}
        {...props}
        style={(state) => [
          styles.minimumTouchTarget,
          typeof style === 'function' ? style(state) : style,
        ]}
      />
    );
  },
);

const styles = StyleSheet.create({
  minimumTouchTarget,
});
