import { atom } from 'jotai';

export const timerAtom = atom({
  isRunning: false,
  timeRemaining: 60, // Default 60 seconds
  totalDuration: 60,
});

export const timerControlsAtom = atom(
  (get) => get(timerAtom),
  (get, set, action: { type: 'START' | 'PAUSE' | 'RESET' | 'SET_DURATION'; duration?: number }) => {
    const timer = get(timerAtom);
    
    switch (action.type) {
      case 'START':
        set(timerAtom, { ...timer, isRunning: true });
        break;
      case 'PAUSE':
        set(timerAtom, { ...timer, isRunning: false });
        break;
      case 'RESET':
        set(timerAtom, { ...timer, isRunning: false, timeRemaining: timer.totalDuration });
        break;
      case 'SET_DURATION':
        if (action.duration) {
          set(timerAtom, { 
            isRunning: false, 
            timeRemaining: action.duration,
            totalDuration: action.duration
          });
        }
        break;
    }
  }
);

export const decrementTimerAtom = atom(
  null,
  (get, set) => {
    const timer = get(timerAtom);
    if (timer.isRunning && timer.timeRemaining > 0) {
      set(timerAtom, { ...timer, timeRemaining: timer.timeRemaining - 1 });
    } else if (timer.isRunning && timer.timeRemaining <= 0) {
      set(timerAtom, { ...timer, isRunning: false });
    }
  }
);

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
} 