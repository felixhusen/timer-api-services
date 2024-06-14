import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { randomUUID } from 'crypto';
import {
  ITimerDetail,
  IAddTimerRequestBody,
  IPauseTimerRequestBody,
  TimerState,
} from './typings';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const port = process.env.PORT || 3000;
const timers: Record<string, ITimerDetail> = {};

function startTimer(timerId: string) {
  const timerIntervalFn = () => {
    const timerDetail = timers[timerId];
    timerDetail.currentDuration--;

    // Send websocket timer message to the client
    io.sockets.emit('timer', { timerId, ...timers[timerId] });

    const currentDuration = timerDetail.currentDuration;
    if (currentDuration <= 0) {
      // Stop the timer once it has passed 0
      clearInterval(timerDetail.timeoutId);
      delete timers[timerId];
      return;
    }
  };

  return setInterval(timerIntervalFn, 1000);
}

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Timer-Api-Services');
});

app.get('/timer', (req: Request, res: Response) => {
  const timerDetails = Object.keys(timers ?? {}).map((timerId) => {
    const timerDetail = timers[timerId];

    return {
      timerId,
      state: timerDetail.state,
      originalDuration: timerDetail.originalDuration,
      currentDuration: timerDetail.currentDuration,
      createdAt: timerDetail.createdAt,
    };
  });

  const pausedTimerCount = timerDetails.filter(
    (timer) => timer.state === TimerState.paused
  ).length;
  const ongoingTimerCount = timerDetails.filter(
    (timer) => timer.state === TimerState.ongoing
  ).length;

  res.json({
    success: true,
    data: {
      timerDetails,
      pausedCount: pausedTimerCount,
      ongoingCount: ongoingTimerCount,
    },
  });
});

app.post(
  '/timer/start',
  (req: Request<any, any, IPauseTimerRequestBody>, res: Response) => {
    const { timerId } = req.body;

    const timerDetail = timers[timerId];
    if (!timerDetail) throw Error('Timer with the provided ID does not exist.');
    if (timerDetail.state === TimerState.ongoing)
      throw Error('The timer has already started.');

    const timeoutId = startTimer(timerId);
    timerDetail.state = TimerState.ongoing;
    timers[timerId].timeoutId = timeoutId;

    res.json({ success: true, data: { timerId } });
  }
);

app.post(
  '/timer/pause',
  (req: Request<any, any, IPauseTimerRequestBody>, res: Response) => {
    const { timerId } = req.body;

    const timerDetail = timers[timerId];
    if (!timerDetail) throw Error('Timer with the provided ID does not exist.');
    if (timerDetail.state === TimerState.paused)
      throw Error('The timer has already been paused.');

    timerDetail.state = TimerState.paused;
    clearInterval(timerDetail.timeoutId);

    delete timerDetail.timeoutId;

    res.json({ success: true, data: { timerId } });
  }
);

app.post(
  '/timer/add',
  (req: Request<any, any, IAddTimerRequestBody>, res: Response) => {
    const { duration } = req.body;

    // Generate `timerId` and
    const timerId = randomUUID();
    const createdAt = new Date().toISOString();

    // Start the timer and create a new timer detail obj
    const timeoutId = startTimer(timerId);
    const newTimer: ITimerDetail = {
      state: TimerState.ongoing,
      originalDuration: duration,
      currentDuration: duration,
      createdAt,
    };

    timers[timerId] = { ...newTimer, timeoutId };

    res.json({
      success: true,
      data: newTimer,
    });
  }
);

io.on('connection', (socket) => {
  console.log('A user has connected');
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
