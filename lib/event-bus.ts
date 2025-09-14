import { EventEmitter } from 'events';

export type BookingEvent = {
  type: 'booking';
  groupId: string;
  event: { id: string; title: string; start: string; end: string };
  updatedMembers: number;
  timestamp: string;
};

class GlobalEventBus extends EventEmitter {}

// Single process bus; good enough for local/hackathon/demo
export const eventBus = new GlobalEventBus();
// Avoid MaxListeners warnings during dev when HMR or many SSE clients are active
eventBus.setMaxListeners(100);

export function emitBookingEvent(payload: Omit<BookingEvent, 'type' | 'timestamp'>) {
  const ev: BookingEvent = {
    type: 'booking',
    timestamp: new Date().toISOString(),
    ...payload,
  };
  eventBus.emit('booking', ev);
}
