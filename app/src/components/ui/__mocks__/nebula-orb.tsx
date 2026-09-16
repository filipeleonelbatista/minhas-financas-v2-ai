// @ts-nocheck
const React = require('react');
const { View } = require('react-native');
const fn = jest.fn((props: any) => React.createElement(View, { testID: props.testID }));
module.exports = { NebulaOrb: fn, default: fn, __esModule: true };
