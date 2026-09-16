import type { StyleProp, TextStyle, ViewStyle } from "react-native";

interface IAnimatedRadianButtonTheme {
  readonly background?: string;
  readonly backgroundSubtle?: string;
  readonly foreground?: string;
  readonly highlight?: string;
  readonly highlightSubtle?: string;
}

interface IRadiantButton {
  children: React.ReactNode;
  readonly onPress?: () => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly textStyle?: StyleProp<TextStyle>;
  readonly borderRadius?: number;
  readonly borderWidth?: number;
  readonly duration?: number;
  readonly theme?: IAnimatedRadianButtonTheme;
  readonly paddingHorizontal?: number;
  readonly paddingVertical?: number;
  readonly disabled?: boolean;
  readonly showDots?: boolean;
  readonly showShimmer?: boolean;
  readonly showGlow?: boolean;
  readonly dotSpacing?: number;
  readonly dotRadius?: number;
  readonly dotOpacity?: number;
  readonly shimmerOpacity?: number;
  readonly glowBlur?: number;
  readonly glowWidth?: number;
  readonly breathingEnabled?: boolean;
  readonly glowBandWidth?: number;
}

interface INebulaOrb {
  readonly size?: number;
  readonly color?: string;
  readonly highlightColor?: string;
  readonly speed?: number;
  readonly turbulence?: number;
  readonly detail?: number;
  readonly contrast?: number;
  readonly edgeSoftness?: number;
  readonly paused?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export type { IRadiantButton, IAnimatedRadianButtonTheme, INebulaOrb };
