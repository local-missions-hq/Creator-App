import type { ImageSourcePropType } from 'react-native';

declare module '*.png' {
  const source: ImageSourcePropType;
  export default source;
}
