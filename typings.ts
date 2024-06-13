export enum TimerState {
  ongoing = 'ongoing',
  paused = 'paused',
}

export interface IAddTimerRequestBody {
  duration: number;
}

export interface IPauseTimerRequestBody {
  timerId: string;
}

export interface ITimerDetail {
  state: TimerState;
  /** @description Initial timer duration (in seconds) */
  originalDuration: number;
  /** @description Current timer duration (in seconds) */
  currentDuration: number;
  /** @description NodeJS timeout object created from the `setInterval` function */
  timeoutId?: NodeJS.Timeout;
}
