import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { MetricSample, ServiceCheck, MetricAnomaly, HistoricalPoint } from '../types/index.js';

interface MetricsWsContextType {
  isConnected: boolean;
  lastMessageTime: Date | null;
  timeAgoText: string;
  latestSample: MetricSample | null;
  liveBuffer: HistoricalPoint[];
  liveServices: ServiceCheck[];
  liveAnomalies: MetricAnomaly[];
  subscribe: (machineId?: string, groupId?: string) => void;
}

const MetricsWsContext = createContext<MetricsWsContextType | undefined>(undefined);

export const MetricsWsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [timeAgoText, setTimeAgoText] = useState<string>('Desconectado');
  const [latestSample, setLatestSample] = useState<MetricSample | null>(null);
  const [liveBuffer, setLiveBuffer] = useState<HistoricalPoint[]>([]);
  const [liveServices, setLiveServices] = useState<ServiceCheck[]>([]);
  const [liveAnomalies, setLiveAnomalies] = useState<MetricAnomaly[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const currentSubRef = useRef<{ machineId?: string; groupId?: string }>({});

  // 1. Calculate relative time indicator (e.g., "LIVE ● 2s ago")
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isConnected || !lastMessageTime) {
        setTimeAgoText('Desconectado');
        return;
      }
      const diffSec = Math.max(0, Math.floor((Date.now() - lastMessageTime.getTime()) / 1000));
      if (diffSec === 0) {
        setTimeAgoText('Ahora');
      } else if (diffSec < 60) {
        setTimeAgoText(`hace ${diffSec}s`);
      } else {
        setTimeAgoText(`hace ${Math.floor(diffSec / 60)}m`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isConnected, lastMessageTime]);

  // 2. Establish WebSocket connection
  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Determine WS url based on environment
    const isSsl = window.location.protocol === 'https:';
    const protocol = isSsl ? 'wss:' : 'ws:';
    // In dev: proxy through Vite/Fastify port 4000; in prod: nginx /ws/metrics
    const host = window.location.port === '5173' || window.location.port === '3000'
      ? `${window.location.hostname}:4000`
      : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/metrics`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setLastMessageTime(new Date());

        // Re-send current subscription if any
        if (currentSubRef.current.machineId || currentSubRef.current.groupId) {
          socket.send(
            JSON.stringify({
              type: 'subscribe',
              machineId: currentSubRef.current.machineId,
              groupId: currentSubRef.current.groupId,
            })
          );
        }
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLastMessageTime(new Date());

          if (payload.type === 'metric' && payload.data) {
            const sample: MetricSample = payload.data;
            setLatestSample(sample);

            // Convert to Chart Point and append to rolling in-memory buffer (max 60 points ~5min)
            const point: HistoricalPoint = {
              timestamp: sample.timestamp,
              timeLabel: new Date(sample.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              cpuUsage: sample.cpuUsage ?? null,
              ramUsage: sample.ramUsage ?? null,
              diskUsage: sample.diskUsage ?? null,
              networkRxKbps: sample.networkRxKbps ?? null,
              networkTxKbps: sample.networkTxKbps ?? null,
              networkErrors: sample.networkErrors || 0,
              latencyMs: sample.latencyMs ?? null,
              responseTimeMs: sample.responseTimeMs ?? null,
              errorRate: sample.errorRate || 0,
              activeConnections: sample.activeConnections || 0,
              samplesCount: 1,
            };

            setLiveBuffer((prev) => {
              const updated = [...prev, point];
              // Keep maximum last 60 points in memory to prevent browser memory growth
              if (updated.length > 60) return updated.slice(updated.length - 60);
              return updated;
            });
          } else if (payload.type === 'service_change' && payload.data) {
            const srv: ServiceCheck = payload.data;
            setLiveServices((prev) => {
              const idx = prev.findIndex(
                (p) =>
                  p.machineId === srv.machineId &&
                  p.portNumber === srv.portNumber &&
                  p.protocol === srv.protocol
              );
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = srv;
                return next;
              }
              return [srv, ...prev];
            });
          } else if (payload.type === 'alert' && payload.data) {
            const anomaly: MetricAnomaly = payload.data;
            setLiveAnomalies((prev) => [anomaly, ...prev.slice(0, 19)]);
          }
        } catch (err) {
          console.error('[WS] Error processing message', err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Reconnect after 3 seconds
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      socket.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.error('[WS] Connection failed:', err);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // 3. Dynamic subscribe handler
  const subscribe = useCallback((machineId?: string, groupId?: string) => {
    currentSubRef.current = { machineId, groupId };
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'subscribe',
          machineId,
          groupId,
        })
      );
    }
    // Clear buffer when switching machine/group to avoid mixing streams
    setLiveBuffer([]);
  }, []);

  return (
    <MetricsWsContext.Provider
      value={{
        isConnected,
        lastMessageTime,
        timeAgoText,
        latestSample,
        liveBuffer,
        liveServices,
        liveAnomalies,
        subscribe,
      }}
    >
      {children}
    </MetricsWsContext.Provider>
  );
};

export const useMetricsWs = (): MetricsWsContextType => {
  const context = useContext(MetricsWsContext);
  if (!context) {
    throw new Error('useMetricsWs must be used within a MetricsWsProvider');
  }
  return context;
};
