import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

test('tailwind class aplica', () => {
  const { getByText } = render(<Text className="bg-purple-600 text-white">ok</Text>);
  expect(getByText('ok')).toBeTruthy();
});
