import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Platform, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configRepo } from '../repositories/config';
import CTA from './ui/CTA';

// Lazy Tooltip: react-native-walkthrough-tooltip with fallback for jest
let Tooltip: any = null;
let TooltipFallback: any = null;

try {
  // eslint-disable-next-line global-require
  const mod = require('react-native-walkthrough-tooltip');
  Tooltip = mod.default ?? mod.Tooltip ?? mod;
} catch {
  Tooltip = null;
}

if (!Tooltip) {
  // Fallback: renders children + content inline when visible, for jest and when lib missing
  TooltipFallback = ({ isVisible, content, children, testID, placement, onClose }: any) => {
    return (
      <View testID={testID ?? 'tooltip-wrapper'}>
        {children}
        {isVisible && (
          <View testID="tooltip-content" style={{ padding: 12, backgroundColor: 'white', borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
            {content}
          </View>
        )}
      </View>
    );
  };
  Tooltip = TooltipFallback;
}

// Tour steps highlighting happy path: AddButton FAB, Inputs, Market stock, Runs, Reports
export const TOUR_STEPS = [
  {
    id: 'addButton',
    title: 'Adicionar',
    description: 'Toque no botão + para adicionar transações, abastecimentos e itens da lista.',
    placement: 'top' as const,
    testID: 'tour-step-addButton',
    anchorTestID: 'add-button-fab',
  },
  {
    id: 'description',
    title: 'Descrição',
    description: 'Descreva sua transação (ex: Salário, Aluguel).',
    placement: 'bottom' as const,
    testID: 'tour-step-description',
    anchorTestID: 'tour-input-description',
  },
  {
    id: 'amount',
    title: 'Valor',
    description: 'Informe o valor em R$. Use vírgula para centavos.',
    placement: 'bottom' as const,
    testID: 'tour-step-amount',
    anchorTestID: 'tour-input-amount',
  },
  {
    id: 'stock',
    title: 'Estoque do Mercado',
    description: 'Controle seu estoque e crie listas de compras automaticamente.',
    placement: 'top' as const,
    testID: 'tour-step-stock',
    anchorTestID: 'tour-stock-anchor',
  },
  {
    id: 'runs',
    title: 'Abastecimentos',
    description: 'Registre abastecimentos e veja autonomia e consumo.',
    placement: 'top' as const,
    testID: 'tour-step-runs',
    anchorTestID: 'tour-runs-anchor',
  },
  {
    id: 'reports',
    title: 'Relatórios & Metas',
    description: 'Veja gráficos, saúde financeira e acompanhe suas metas.',
    placement: 'top' as const,
    testID: 'tour-step-reports',
    anchorTestID: 'tour-reports-anchor',
  },
];

export const TOUR_STORAGE_KEY = '@hasSeenInteractiveTour';

// Persistence helpers: config table + AsyncStorage fallback
export async function getHasSeenTour(): Promise<boolean> {
  // drizzle first
  try {
    const cfg = await configRepo.get();
    if (cfg && typeof cfg.hasSeenInteractiveTour !== 'undefined' && cfg.hasSeenInteractiveTour !== null) {
      return !!cfg.hasSeenInteractiveTour;
    }
  } catch {}
  try {
    const v = await AsyncStorage.getItem(TOUR_STORAGE_KEY);
    if (v !== null) return v === 'true';
  } catch {}
  // also check legacy key maybe
  return false;
}

export async function setHasSeenTour(seen: boolean): Promise<void> {
  try {
    await configRepo.upsert({ id: 'config-singleton', hasSeenInteractiveTour: seen ? 1 : 0 });
  } catch {}
  try {
    await AsyncStorage.setItem(TOUR_STORAGE_KEY, seen ? 'true' : 'false');
  } catch {}
}

export async function markTourSeen(): Promise<void> {
  await setHasSeenTour(true);
}

export async function markTourSkipped(): Promise<void> {
  await setHasSeenTour(true);
}

export async function resetTour(): Promise<void> {
  await setHasSeenTour(false);
}

export interface TourProps {
  visible?: boolean;
  initialStep?: number;
  onComplete?: () => void;
  onSkip?: () => void;
  onStepChange?: (step: number) => void;
  testID?: string;
  // allow controlled step for tests
  currentStep?: number;
  onNext?: () => void;
  useModal?: boolean;
}

function TourContent({
  step,
  isLast,
  onNext,
  onSkip,
  onComplete,
  stepIndex,
  total,
}: {
  step: typeof TOUR_STEPS[number];
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
  stepIndex: number;
  total: number;
}) {
  return (
    <View className="bg-white rounded-2xl p-4 min-w-[260px]" style={{ minWidth: 260, backgroundColor: 'white', borderRadius: 16, padding: 16 }} testID={`tour-content-${step.id}`}>
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-xs font-bold text-purple-600 uppercase tracking-wider" style={{ fontSize: 11, fontWeight: '700', color: '#9c44dc' }}>
          {stepIndex + 1} / {total} • {step.title}
        </Text>
        <TouchableOpacity onPress={onSkip} testID="tour-skip" accessibilityRole="button" accessibilityLabel="Pular">
          <Text className="text-xs text-gray-500" style={{ fontSize: 12, color: '#6b7280' }}>
            Pular
          </Text>
        </TouchableOpacity>
      </View>
      <Text className="text-sm text-gray-800 mb-3" style={{ fontSize: 14, color: '#1f2937', marginBottom: 12 }}>
        {step.description}
      </Text>
      <View className="flex-row justify-between items-center">
        <Text className="text-[11px] text-gray-400" style={{ fontSize: 11, color: '#9ca3af' }}>
          {stepIndex + 1} de {total}
        </Text>
        <CTA testID={isLast ? 'tour-complete' : 'tour-next'} onPress={isLast ? onComplete : onNext} variant="glow" style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
          <Text className="text-white font-bold text-sm" style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
            {isLast ? 'Concluir' : 'Próximo'}
          </Text>
        </CTA>
      </View>
    </View>
  );
}

// Controlled single-step tooltip wrapper — used in tests and for spotlight per anchor
export function TourStep({
  stepId,
  isVisible,
  onNext,
  onSkip,
  onComplete,
  children,
  placement,
}: {
  stepId: string;
  isVisible: boolean;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}) {
  const step = TOUR_STEPS.find((s) => s.id === stepId) ?? TOUR_STEPS[0];
  const idx = TOUR_STEPS.findIndex((s) => s.id === stepId);
  const isLast = idx === TOUR_STEPS.length - 1;
  const total = TOUR_STEPS.length;
  return (
    <Tooltip
      isVisible={isVisible}
      content={
        <TourContent
          step={step}
          isLast={isLast}
          onNext={onNext}
          onSkip={onSkip}
          onComplete={onComplete}
          stepIndex={idx >= 0 ? idx : 0}
          total={total}
        />
      }
      placement={placement ?? step.placement}
      onClose={onSkip}
      backgroundColor="rgba(0,0,0,0.55)"
      displayInsets={{ top: 24, bottom: 24, left: 16, right: 16 }}
      topAdjustment={Platform.OS === 'android' ? -StatusBar.currentHeight! : 0}
      testID={step.testID}
      allowChildInteraction={false}
      closeOnChildInteraction={false}
      showChildInTooltip={true}
    >
      <View testID={step.anchorTestID}>{children}</View>
    </Tooltip>
  );
}

// Full tour controller rendering current step's tooltip around a placeholder anchor
export function Tour({
  visible: propVisible,
  initialStep = 0,
  onComplete,
  onSkip,
  onStepChange,
  testID = 'tour',
  currentStep: controlledStep,
  onNext: controlledOnNext,
  useModal = true,
}: TourProps) {
  const [current, setCurrent] = useState(initialStep);
  const [visible, setVisible] = useState(propVisible ?? false);
  const [hasSeen, setHasSeen] = useState(false);

  const activeStep = typeof controlledStep === 'number' ? controlledStep : current;

  useEffect(() => {
    if (typeof propVisible === 'boolean') setVisible(propVisible);
  }, [propVisible]);

  useEffect(() => {
    // if not controlled, auto-check persistence to decide visibility
    if (typeof propVisible !== 'boolean') {
      getHasSeenTour().then((seen) => {
        setHasSeen(seen);
        if (!seen) {
          // do not auto-show here; caller decides. But expose hasSeen.
        }
      });
    }
  }, [propVisible]);

  const handleNext = useCallback(() => {
    if (controlledOnNext) {
      controlledOnNext();
      return;
    }
    const next = activeStep + 1;
    if (next < TOUR_STEPS.length) {
      setCurrent(next);
      onStepChange?.(next);
    } else {
      // last step completed
      setVisible(false);
      markTourSeen().then(() => onComplete?.());
    }
  }, [activeStep, controlledOnNext, onStepChange, onComplete]);

  const handleSkip = useCallback(async () => {
    await markTourSkipped();
    setVisible(false);
    setHasSeen(true);
    onSkip?.();
  }, [onSkip]);

  const handleComplete = useCallback(async () => {
    await markTourSeen();
    setVisible(false);
    setHasSeen(true);
    onComplete?.();
  }, [onComplete]);

  if (!visible) return null;

  const step = TOUR_STEPS[activeStep] ?? TOUR_STEPS[0];
  const isLast = activeStep === TOUR_STEPS.length - 1;

  // Render centered tooltip without specific child duplication for general screen spotlight fallback
  // For testability we wrap a dummy anchor View with testID
  return (
    <View testID={testID} style={{ flex: 1 }} pointerEvents="box-none">
      <Tooltip
        isVisible={visible}
        content={
          <TourContent
            step={step}
            isLast={isLast}
            onNext={handleNext}
            onSkip={handleSkip}
            onComplete={handleComplete}
            stepIndex={activeStep}
            total={TOUR_STEPS.length}
          />
        }
        placement={step.placement}
        onClose={handleSkip}
        backgroundColor="rgba(0,0,0,0.55)"
        displayInsets={{ top: 24, bottom: 24, left: 16, right: 16 }}
        topAdjustment={Platform.OS === 'android' ? (-(StatusBar.currentHeight ?? 0)) : 0}
        testID={step.testID}
        allowChildInteraction={false}
        closeOnChildInteraction={false}
        showChildInTooltip={true}
        useReactNativeModal={useModal}
      >
        {/* Anchor placeholder: visible element being highlighted is determined by caller via wrap, but fallback is a hidden centered view */}
        <View testID={step.anchorTestID} style={{ width: 1, height: 1, opacity: 0 }} />
      </Tooltip>
    </View>
  );
}

// Imperative helper to start tour: resets seen flag and returns Tour component props
export async function startTour(): Promise<void> {
  await setHasSeenTour(false);
}

// Hook for screens to manage tour
export function useTour(autoStart = false) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);

  useEffect(() => {
    getHasSeenTour().then((seen) => {
      setHasSeen(seen);
      if (autoStart && !seen) setVisible(true);
    });
  }, [autoStart]);

  const start = useCallback(async () => {
    await setHasSeenTour(false);
    setHasSeen(false);
    setStep(0);
    setVisible(true);
  }, []);

  const next = useCallback(() => {
    setStep((prev) => {
      const nxt = prev + 1;
      if (nxt >= TOUR_STEPS.length) {
        setVisible(false);
        markTourSeen();
        return prev;
      }
      return nxt;
    });
  }, []);

  const skip = useCallback(async () => {
    await markTourSkipped();
    setVisible(false);
    setHasSeen(true);
  }, []);

  const complete = useCallback(async () => {
    await markTourSeen();
    setVisible(false);
    setHasSeen(true);
  }, []);

  return { visible, step, hasSeen, start, next, skip, complete, setVisible, setStep };
}

export default Tour;
