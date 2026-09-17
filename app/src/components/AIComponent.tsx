// @ts-nocheck
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { Animated, View, Text, Pressable } from 'react-native';
import { useSettingsStore } from '../stores/settings';

const PURPLE_600 = "#9c44dc";
const PURPLE_900 = "#581c87";

export default function AIComponent() {
  const colorModeState = useSettingsStore((s) => s.colorModeState);
  const isDark = colorModeState === "dark";
  const text = isDark ? "#e4e4e7" : "#52525b";
  const bgCard = isDark ? "#27272a" : "#f5f5f4";

  const navigation = useNavigation();
  const isAiEnabled = useSettingsStore((s) => !!s.isAiEnabled);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const tiltValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  const handlePulse = () => {
    Animated.sequence([
      Animated.timing(pulseValue, { toValue: 1.1, duration: 300, useNativeDriver: true }),
      Animated.timing(pulseValue, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        Animated.delay(4000).start(handlePulse);
      }
    });
  };

  const interpolatedPulse = pulseValue.interpolate({ inputRange: [1, 1.1], outputRange: [1, 1.1] });

  const handleTilt = () => {
    const tiltAnimation = Animated.sequence([
      Animated.timing(tiltValue, { toValue: 0.5, duration: 100, useNativeDriver: true }),
      Animated.timing(tiltValue, { toValue: -0.5, duration: 100, useNativeDriver: true }),
      Animated.timing(tiltValue, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(tiltValue, { toValue: 0.5, duration: 100, useNativeDriver: true }),
      Animated.timing(tiltValue, { toValue: -0.5, duration: 100, useNativeDriver: true }),
      Animated.timing(tiltValue, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(tiltValue, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]);
    Animated.loop(tiltAnimation, { iterations: 3000 }).start();
  };

  const tiltInterpolate = tiltValue.interpolate({ inputRange: [-0.5, 0.5], outputRange: ['-5deg', '5deg'] });

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      handleTilt();
      handlePulse();
      const fadeOutAnimation = Animated.timing(fadeAnim, { toValue: 0, duration: 1000, useNativeDriver: true });
      const timer = setTimeout(() => { fadeOutAnimation.start(); }, 6000);
      return () => { clearTimeout(timer); fadeOutAnimation.stop(); };
    }
  }, []);

  if (!isAiEnabled) return null;

  return (
    <View style={{ position: 'absolute', bottom: 32, left: 16, flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ scale: interpolatedPulse }], padding: 0 }}>
        <Pressable
          onPress={() => navigation.navigate("IAPage")}
          style={{ backgroundColor: PURPLE_600, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999, elevation: 4 }}
        >
          <MaterialCommunityIcons name="robot-outline" size={20} color="white" />
        </Pressable>
      </Animated.View>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Animated.View style={{ transform: [{ rotate: tiltInterpolate }], padding: 0 }}>
          <View style={{ backgroundColor: bgCard, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4, elevation: 4 }}>
            <Text style={{ color: text }}>Converser com a IA</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
