import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${location.hostname}:3030/metrics`;

// Connects to the load balancer telemetry WebSocket with auto-reconnect.
// Returns the latest full system-state object plus a `connected` flag.
export default function useMetricsStream() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const retryRef = useRef(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onmessage = (e) => {
        try { setState(JSON.parse(e.data)); } catch { /* ignore malformed frame */ }
      };
      ws.onclose = () => {
        setConnected(false);
        retryRef.current = setTimeout(connect, 1500);
      };
      ws.onerror = () => ws.close();
    } catch {
      retryRef.current = setTimeout(connect, 1500);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { state, connected };
}
