import { useState, useEffect } from 'react';
import { desktopAgent, ConnectionStatus, AgentInfo } from '../lib/desktopAgent';

export interface HookAgentInfo {
  version: string;
  agent_version: string; // backwards compatibility
  protocolVersion: number;
  capabilities: string[];
  platform: string;
  agentPort: number;
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

const githubRepo = import.meta.env.VITE_GITHUB_REPO || 'Giriz-3407/InterAct-Agent';

async function fetchLatestReleaseVersion(repo: string): Promise<string | null> {
  const cacheKey = `latest_agent_version_${repo}`;
  const cacheTimeKey = `latest_agent_version_time_${repo}`;
  const cachedVersion = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);
  
  // Cache for 1 hour
  if (cachedVersion && cachedTime && Date.now() - Number(cachedTime) < 3600000) {
    return cachedVersion;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
    if (!response.ok) {
      throw new Error(`Failed to fetch latest release: ${response.statusText}`);
    }
    const data = await response.json();
    const version = data.tag_name ? data.tag_name.replace(/^v/, '') : null;
    if (version) {
      localStorage.setItem(cacheKey, version);
      localStorage.setItem(cacheTimeKey, String(Date.now()));
    }
    return version;
  } catch (error) {
    console.error('Error fetching latest release version:', error);
    return cachedVersion || null;
  }
}

function isVersionOlder(installed: string, latest: string): boolean {
  const parseVersion = (v: string) => v.split('.').map(Number);
  const instParts = parseVersion(installed);
  const latParts = parseVersion(latest);
  
  for (let i = 0; i < Math.max(instParts.length, latParts.length); i++) {
    const instVal = instParts[i] || 0;
    const latVal = latParts[i] || 0;
    if (instVal < latVal) return true;
    if (instVal > latVal) return false;
  }
  return false;
}

export function useDesktopAgent() {
  const [status, setStatus] = useState<ConnectionStatus>(desktopAgent.getStatus());
  const [agentInfo, setAgentInfo] = useState<HookAgentInfo | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isOutdated, setIsOutdated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize helper to map internal AgentInfo to HookAgentInfo
  const mapAgentInfo = (info: AgentInfo | null): HookAgentInfo | null => {
    if (!info) return null;
    return {
      ...info,
      agent_version: info.version,
    };
  };

  useEffect(() => {
    const supported = isDesktopOS();
    setIsSupported(supported);
    if (!supported) {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    // Ensure desktopAgent is connecting/connected
    desktopAgent.connect();

    // Set initial agent info
    setAgentInfo(mapAgentInfo(desktopAgent.getAgentInfo()));

    const unsubscribe = desktopAgent.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setAgentInfo(mapAgentInfo(desktopAgent.getAgentInfo()));
      
      if (newStatus !== 'connecting') {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, [isSupported]);

  useEffect(() => {
    if (status !== 'connected') {
      setIsOutdated(status === 'incompatible');
      return;
    }

    if (!agentInfo?.version) {
      return;
    }

    let isMounted = true;

    async function checkVersion() {
      const latest = await fetchLatestReleaseVersion(githubRepo);
      if (!isMounted) return;
      setLatestVersion(latest);
      if (latest && agentInfo?.version) {
        setIsOutdated(isVersionOlder(agentInfo.version, latest));
      } else {
        setIsOutdated(false);
      }
    }

    checkVersion();

    return () => {
      isMounted = false;
    };
  }, [status, agentInfo?.version]);

  return {
    isSupported,
    isDetected: status === 'connected' || status === 'incompatible',
    status,
    agentInfo,
    isOutdated,
    latestVersion,
    isLoading,
  };
}
