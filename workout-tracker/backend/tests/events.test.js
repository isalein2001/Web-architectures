const {
  addClient,
  broadcastToUser,
  writeEvent,
} = require('../events');

const createEventResponse = () => {
  let closeHandler;
  const response = {
    flushHeaders: vi.fn(),
    on: vi.fn((eventName, handler) => {
      if (eventName === 'close') closeHandler = handler;
    }),
    setHeader: vi.fn(),
    write: vi.fn(),
  };

  return {
    response,
    close: () => closeHandler?.(),
  };
};

describe('server-sent events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('writes a named SSE event using the expected wire format', () => {
    const { response } = createEventResponse();

    writeEvent(response, 'plans:changed', { id: 4 });

    expect(response.write).toHaveBeenNthCalledWith(1, 'event: plans:changed\n');
    expect(response.write).toHaveBeenNthCalledWith(2, 'data: {"id":4}\n\n');
  });

  test('registers, broadcasts to and removes a connected client', () => {
    const { response, close } = createEventResponse();

    addClient(42, response);

    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(response.flushHeaders).toHaveBeenCalledOnce();
    expect(response.write).toHaveBeenCalledWith('event: connected\n');

    broadcastToUser(42, 'plans:changed', { action: 'updated' });
    expect(response.write).toHaveBeenCalledWith('event: plans:changed\n');
    expect(response.write).toHaveBeenCalledWith('data: {"action":"updated"}\n\n');

    vi.advanceTimersByTime(25_000);
    expect(response.write).toHaveBeenCalledWith(': keep-alive\n\n');

    const writesBeforeClose = response.write.mock.calls.length;
    close();
    broadcastToUser(42, 'plans:changed', { action: 'deleted' });
    expect(response.write).toHaveBeenCalledTimes(writesBeforeClose);
  });

  test('keeps other clients connected when one client closes', () => {
    const first = createEventResponse();
    const second = createEventResponse();

    addClient(77, first.response);
    addClient(77, second.response);
    first.close();

    broadcastToUser(77, 'ping', {});

    expect(first.response.write).not.toHaveBeenCalledWith('event: ping\n');
    expect(second.response.write).toHaveBeenCalledWith('event: ping\n');
    second.close();
  });
});
