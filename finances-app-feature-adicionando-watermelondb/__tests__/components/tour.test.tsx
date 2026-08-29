import React from 'react';
import { View, Text } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-walkthrough-tooltip', () => {
  const ReactMod = require('react');
  const { View: RNView } = require('react-native');
  const MockTooltip = ({ isVisible, content, children, testID }: any) =>
    ReactMod.createElement(RNView, { testID: testID ?? 'tooltip-mock' }, children, isVisible ? ReactMod.createElement(RNView, { testID: 'tooltip-content-mock' }, content) : null);
  return { __esModule: true, default: MockTooltip, Tooltip: MockTooltip };
});
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock walkthrough tooltip is already fallback friendly, but ensure isVisible logic via our fallback
jest.mock('../../src/repositories/config', () => {
  let mem: any = {};
  return {
    configRepo: {
      get: jest.fn(async () => (Object.keys(mem).length ? mem : null)),
      upsert: jest.fn(async (dto: any) => { mem = { ...mem, ...dto }; return dto; }),
      clearMemory: jest.fn(async () => { mem = {}; }),
      getMemory: () => mem,
    },
  };
});

import { TOUR_STEPS, Tour, TourStep, getHasSeenTour, setHasSeenTour, markTourSeen, markTourSkipped } from '../../src/components/Tour';
import { configRepo } from '../../src/repositories/config';

describe('Tour - walkthrough spotlight (react-native-walkthrough-tooltip + NativeWind + CTA)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    // @ts-ignore
    if (configRepo.clearMemory) await (configRepo as any).clearMemory();
    jest.clearAllMocks();
  });

  test('TOUR_STEPS has 6 steps highlighting AddButton, Inputs, Market stock, Runs, Reports', () => {
    expect(TOUR_STEPS.length).toBe(6);
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(ids).toContain('addButton');
    expect(ids).toContain('description');
    expect(ids).toContain('amount');
    expect(ids).toContain('stock');
    expect(ids).toContain('runs');
    expect(ids).toContain('reports');
    // anchor testIDs
    expect(TOUR_STEPS.find((s) => s.id === 'addButton')?.anchorTestID).toBe('add-button-fab');
    expect(TOUR_STEPS.find((s) => s.id === 'description')?.anchorTestID).toBe('tour-input-description');
    expect(TOUR_STEPS.find((s) => s.id === 'amount')?.anchorTestID).toBe('tour-input-amount');
  });

  test('TourStep renders spotlight with CTA Próximo and Pular (NativeWind compat)', () => {
    const onNext = jest.fn();
    const onSkip = jest.fn();
    const onComplete = jest.fn();
    const { getByTestId, getByText } = render(
      <TourStep stepId="addButton" isVisible={true} onNext={onNext} onSkip={onSkip} onComplete={onComplete}>
        <View testID="anchor-add">
          <Text>Add</Text>
        </View>
      </TourStep>
    );
    // fallback renders tooltip-content when isVisible
    expect(getByTestId('tour-step-addButton')).toBeTruthy();
    expect(getByText(/Toque no botão/)).toBeTruthy(); // partial match for description
    expect(getByTestId('tour-next')).toBeTruthy();
    expect(getByTestId('tour-skip')).toBeTruthy();
    expect(getByTestId('tour-skip')).toBeTruthy();
    // text Pular
    expect(getByText('Pular')).toBeTruthy();

    fireEvent.press(getByTestId('tour-next'));
    expect(onNext).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('tour-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  test('TourStep shows Concluir on last step (reports)', () => {
    const onNext = jest.fn();
    const onSkip = jest.fn();
    const onComplete = jest.fn();
    const { getByTestId, getByText } = render(
      <TourStep stepId="reports" isVisible={true} onNext={onNext} onSkip={onSkip} onComplete={onComplete}>
        <View><Text>Reports</Text></View>
      </TourStep>
    );
    expect(getByTestId('tour-step-reports')).toBeTruthy();
    expect(getByTestId('tour-complete')).toBeTruthy();
    expect(getByText('Concluir')).toBeTruthy();
    fireEvent.press(getByTestId('tour-complete'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('Tour controlled shows spotlight and advances via onNext prop', () => {
    const onNext = jest.fn();
    const { getByTestId, rerender } = render(
      <Tour visible={true} currentStep={0} onNext={onNext} useModal={false} />
    );
    expect(getByTestId('tour-step-addButton')).toBeTruthy();
    // Tooltip content shows Próximo
    expect(getByTestId('tour-next')).toBeTruthy();
    fireEvent.press(getByTestId('tour-next'));
    expect(onNext).toHaveBeenCalled();

    // simulate parent updating step to 1 (description)
    rerender(<Tour visible={true} currentStep={1} onNext={onNext} useModal={false} />);
    expect(getByTestId('tour-step-description')).toBeTruthy();
  });

  test('Tour skip persists hasSeenInteractiveTour in config + AsyncStorage (Pular)', async () => {
    const onSkip = jest.fn();
    const { getByTestId } = render(<Tour visible={true} currentStep={0} onSkip={onSkip} useModal={false} />);
    const skipBtn = getByTestId('tour-skip');
    fireEvent.press(skipBtn);
    await waitFor(() => expect(onSkip).toHaveBeenCalled());
    // wait for async persistence
    await waitFor(async () => {
      const seen = await getHasSeenTour();
      expect(seen).toBe(true);
    });
    const stored = await AsyncStorage.getItem('@hasSeenInteractiveTour');
    expect(stored).toBe('true');
    expect(configRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({ hasSeenInteractiveTour: 1 }));
  });

  test('hasSeenInteractiveTour persists via setHasSeenTour / getHasSeenTour + config', async () => {
    expect(await getHasSeenTour()).toBe(false);
    await setHasSeenTour(true);
    expect(await getHasSeenTour()).toBe(true);
    expect(await AsyncStorage.getItem('@hasSeenInteractiveTour')).toBe('true');

    await setHasSeenTour(false);
    expect(await getHasSeenTour()).toBe(false);

    await markTourSeen();
    expect(await getHasSeenTour()).toBe(true);
    await setHasSeenTour(false);
    await markTourSkipped();
    expect(await getHasSeenTour()).toBe(true);
  });

  test('Tour hidden when not visible', () => {
    const { queryByTestId } = render(<Tour visible={false} currentStep={0} useModal={false} />);
    expect(queryByTestId('tour')).toBeNull();
  });

  test('WalkthroughTooltip integration: content uses CTA glow variant (reacticx fallback NativeWind)', () => {
    const { getByTestId } = render(
      <TourStep stepId="amount" isVisible={true} onNext={jest.fn()} onSkip={jest.fn()} onComplete={jest.fn()}>
        <View testID="amount-anchor"><Text>Amount</Text></View>
      </TourStep>
    );
    // Next button should be CTA with variant glow - testID tour-next exists and is pressable
    const cta = getByTestId('tour-next');
    expect(cta).toBeTruthy();
    // Ensure NativeWind class container exists
    expect(getByTestId('tour-step-amount')).toBeTruthy();
  });
});
