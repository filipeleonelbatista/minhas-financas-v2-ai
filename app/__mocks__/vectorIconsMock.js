const React = require('react');
const { Text } = require('react-native');
const MockIcon = ({ name, ...props }) => React.createElement(Text, { ...props, testID: `icon-${name || 'mock'}` }, name || 'icon');
module.exports = {
  Feather: MockIcon,
  MaterialCommunityIcons: MockIcon,
  FontAwesome: MockIcon,
  Fontisto: MockIcon,
  Ionicons: MockIcon,
  Octicons: MockIcon,
  MaterialIcons: MockIcon,
  Entypo: MockIcon,
  AntDesign: MockIcon,
  EvilIcons: MockIcon,
  Foundation: MockIcon,
  SimpleLineIcons: MockIcon,
  Zocial: MockIcon,
};
module.exports.default = module.exports;
