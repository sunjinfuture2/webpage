import { calculate } from './engine';
import type { Plan } from './types';
self.onmessage = (event: MessageEvent<{ revision: number; plan: Plan }>) => {
  try { self.postMessage({ revision: event.data.revision, result: calculate(event.data.plan) }); }
  catch (error) { self.postMessage({ revision: event.data.revision, error: error instanceof Error ? error.message : '계산 오류' }); }
};
