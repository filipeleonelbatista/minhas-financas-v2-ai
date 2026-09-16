import React from 'react';
import { Text, View } from 'react-native';
export function ShimmerWaveText({ text = 'Gerando resposta...', textColor = '#000', testID = 'shimmer-wave' }) {
  return <View testID={testID}><Text style={{ color: textColor }}>{text}</Text></View>;
}
export default ShimmerWaveText;
