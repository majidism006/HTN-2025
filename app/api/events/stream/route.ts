import { NextRequest } from 'next/server';
import { eventBus, BookingEvent } from '@/lib/event-bus';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupIdFilter = searchParams.get('groupId') || undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      let keepAlive: NodeJS.Timeout | null = null;

      const safeEnqueue = (payload: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          cleanup();
        }
      };

      const sendEvent = (data: any) => {
        safeEnqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      const onBooking = (ev: BookingEvent) => {
        if (!groupIdFilter || ev.groupId === groupIdFilter) {
          sendEvent(ev);
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (keepAlive) clearInterval(keepAlive);
        eventBus.off('booking', onBooking);
        try {
          controller.close();
        } catch {}
      };

      eventBus.on('booking', onBooking);

      // Initial ping
      safeEnqueue(`event: ping\ndata: ${Date.now()}\n\n`);
      keepAlive = setInterval(() => {
        // keep-alive pings; swallow errors if client disconnected
        safeEnqueue(`event: ping\ndata: ${Date.now()}\n\n`);
      }, 25000);

      // Attach cleanup so Next can call cancel on client disconnect
      (controller as any)._cleanup = cleanup;
    },
    cancel(reason) {
      const anyThis = this as any;
      if (anyThis._cleanup) anyThis._cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
