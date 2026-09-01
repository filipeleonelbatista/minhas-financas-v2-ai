import * as React from "react";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { useColorScheme } from "../../lib/useColorScheme";

const Sheet = React.forwardRef<
  BottomSheetModal,
  React.ComponentPropsWithoutRef<typeof BottomSheetModal>
>(
  (
    { index = 0, backgroundStyle, style, handleIndicatorStyle, ...props },
    ref
  ) => {
    const { colors } = useColorScheme();

    const renderBackdrop = React.useCallback(
      (p: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
        index={index}
        backgroundStyle={
          backgroundStyle ?? {
            backgroundColor: colors.card,
          }
        }
        style={
          style ?? {
            borderWidth: 1,
            borderColor: colors.grey5,
            borderTopStartRadius: 16,
            borderTopEndRadius: 16,
          }
        }
        handleIndicatorStyle={
          handleIndicatorStyle ?? {
            backgroundColor: colors.grey4,
            width: 36,
            height: 4,
          }
        }
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        {...props}
      />
    );
  }
);
Sheet.displayName = "Sheet";

function useSheetRef() {
  return React.useRef<BottomSheetModal>(null);
}

export { Sheet, useSheetRef };
