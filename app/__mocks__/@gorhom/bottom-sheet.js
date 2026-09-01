const React = require('react');
const { View } = require('react-native');
const MockSheet = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn(), close: jest.fn() }));
  return React.createElement(View, { testID: "mock-sheet" }, props.children);
});
const MockView = (props) => React.createElement(View, props, props.children);
module.exports = {
  BottomSheetModal: MockSheet,
  BottomSheetBackdrop: () => null,
  BottomSheetView: MockView,
  BottomSheetScrollView: MockView,
  BottomSheetModalProvider: ({ children }) => React.createElement(View, null, children),
};
