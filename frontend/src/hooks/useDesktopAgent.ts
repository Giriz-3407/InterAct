import { useState, useEffect } from 'react';

export interface AgentStatus {
  status: string;
  agent_version: string;
  protocol_version: number;
  capabilities: string[];
}

// Check if the current OS is a supported desktop platform
export function isDesktopOS(): boolean {
  if (typeof window === 'undefined' || !navigator) return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  // Mobile / Tablet operating systems
  const isMobileOS = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);
  
  // Safari on iPadOS reports as Macintosh but has touch support
  const isMac = /macintosh|mac os x/i.test(userAgent);
  const isIPad = isMac && navigator.maxTouchPoints > 1;

  if (isMobileOS || isIPad) {
    return false;
  }

  // Supported desktop platforms
  const isDesktop = /win|mac|linux/i.test(userAgent);
  return isDesktop;
}

const AGENT_PORT = import.meta.env.VITE_AGENT_PORT || '8765';
const STATUS_URL = `http://127.0.0.1:${AGENT_PORT}/status`;
const CHECK_INTERVAL_MS = 5000; // Poll every 5 seconds
const TIMEOUT_MS = 1000; // Timeout after 1 second

export function useDesktopAgent() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isDetected, setIsDetected] = useState<boolean>(false);
  const [agentInfo, setAgentInfo] = useState<AgentStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const desktopSupported = isDesktopOS();
    setIsSupported(desktopSupported);

    if (!desktopSupported) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let timerId: any = null;

    const checkAgent = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(STATUS_URL, {
          method: 'GET',
          signal: controller.signal,
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Basic validation of response format
        if (data && data.status === 'ok' && typeof data.agent_version === 'string') {
          if (isMounted) {
            setIsDetected(true);
            setAgentInfo(data);
            setIsLoading(false);
          }
        } else {
          throw new Error('Malformed agent response');
        }
      } catch (error) {
        clearTimeout(timeoutId);
        // Fails silently, logging only to debug/console
        if (isMounted) {
          setIsDetected(false);
          setAgentInfo(null);
          setIsLoading(false);
        }
      }
    };

    // Perform immediate check
    checkAgent();

    // Setup polling
    timerId = setInterval(checkAgent, CHECK_INTERVAL_MS);

    return () => {
      isMounted = false;
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, []);

  return {
    isSupported,
    isDetected,
    agentInfo,
    isLoading,
  };
}
