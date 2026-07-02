import { createContext, useContext, useEffect, useRef, useState } from 'react';
import useMetricsStream from '../hooks/useMetricsStream';

const MetricsContext = createContext(null);

// Wraps the app with a single live telemetry stream and keeps short rolling
// histories (latency / request-rate) for the charts.
export function MetricsProvider({ children }) {
  const { state, connected } = useMetricsStream();
  const [latencyHistory, setLatencyHistory] = useState([]);
  const lastTs = useRef(0);

  useEffect(() => {
    if (!state?.system) return;
    if (state.ts === lastTs.current) return;
    lastTs.current = state.ts;
    setLatencyHistory((prev) => {
      const next = [
        ...prev,
        {
          t: new Date(state.ts).toLocaleTimeString('en', { hour12: false, minute: '2-digit', second: '2-digit' }),
          latency: state.system.averageLatency || 0,
          rate: state.system.requestRate || 0,
          errors: state.system.errorRate || 0,
        },
      ];
      return next.slice(-40);
    });
  }, [state]);

  const value = { state, connected, latencyHistory };
  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
}

export function useMetrics() {
  const ctx = useContext(MetricsContext);
  if (!ctx) throw new Error('useMetrics must be used within MetricsProvider');
  return ctx;
}
