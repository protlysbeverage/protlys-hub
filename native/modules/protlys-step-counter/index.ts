
import { requireNativeModule } from 'expo';

export type DailyStepRecord = {
  date: string;
  steps: number;
};

type ProtlysStepCounterModule = {
  isAvailable(): boolean;
  startTracking(userId: string): boolean;
  isTracking(userId: string): boolean;
  getTodaySteps(userId: string): number;
  getRecentDailySteps(userId: string, days: number): DailyStepRecord[];
  stopTracking(): boolean;
};

const ProtlysStepCounter =
  requireNativeModule<ProtlysStepCounterModule>(
    'ProtlysStepCounter'
  );

export default ProtlysStepCounter;
