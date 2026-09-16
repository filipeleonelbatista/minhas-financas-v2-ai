import React from 'react';
import { View, Pressable, Text } from 'react-native';
export const MorphFab = {
  Root: ({ children }) => <View>{children}</View>,
  Trigger: ({ children, onPress }) => <Pressable onPress={onPress}>{children}</Pressable>,
  Item: ({ children, onSelect }) => <Pressable onPress={() => onSelect && onSelect()}>{children}</Pressable>,
  ItemIcon: ({ children }) => <View>{children}</View>,
  ItemLabel: ({ children }) => <Text>{children}</Text>,
};
export default MorphFab;
