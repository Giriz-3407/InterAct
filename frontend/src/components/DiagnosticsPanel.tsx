import React, { useState, useEffect } from 'react';
import { getDiagResults, getSessionId, subscribeToDiag, type StageResult } from '../hooks/useViewerMicDiag';

interface DiagnosticsPanelProps {
  isHost: boolean;
  roomId: string;
  getPeerConnectionStates: () => { connectionState: string; iceConnectionState: string };
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  isHost,
  roomId,
  getPeerConnectionStates,
}) => {
  const [results, setResults] = useState<StageResult[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [isExpanded, setIsExpanded] = useState(window.innerWidth >= 768);
  const [copied, setCopied] = useState(false);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  useEffect(() => {
    setResults(getDiagResults());
    setSessionId(getSessionId());

    const unsubscribe = subscribeToDiag(() => {
      setResults(getDiagResults());
      setSessionId(getSessionId());
    });

    return unsubscribe;
  }, []);

  const STAGES_CONFIG = [
    { num: 1, name: 'syncMic executes' },
    { num: 2, name: 'Microphone acquisition' },
    { num: 3, name: 'Track attachment' },
    { num: 4, name: 'SDP negotiation' },
    { num: 5, name: 'Peer connection state' },
    { num: 6, name: 'Host reception (ontrack)' },
    { num: 7, name: 'Host playback' },
  ];

  // Process results ensuring first failure is preserved and not overwritten by subsequent passes
  const processedStages = STAGES_CONFIG.map((cfg) => {
    const stageResults = results.filter((r) => r.stage === cfg.num);
    const firstFail = stageResults.find((r) => r.status === 'FAIL');
    const latestPass = [...stageResults].reverse().find((r) => r.status === 'PASS');

    let status: 'PASS' | 'FAIL' | 'NOT REACHED';
    let displayResult: StageResult | undefined;

    if (firstFail) {
      status = 'FAIL';
      displayResult = firstFail;
    } else if (latestPass) {
      status = 'PASS';
      displayResult = latestPass;
    } else {
      status = 'NOT REACHED';
      displayResult = undefined;
    }

    return {
      ...cfg,
      status,
      displayResult,
      historyCount: stageResults.length,
    };
  });

  // Calculate summary metrics
  const reachedStages = processedStages.filter((s) => s.status !== 'NOT REACHED');
  const lastCompletedStage = reachedStages.length > 0 ? Math.max(...reachedStages.map((s) => s.num)) : 'None';
  const failedStages = processedStages.filter((s) => s.status === 'FAIL');
  const firstFailedStage = failedStages.length > 0 ? Math.min(...failedStages.map((s) => s.num)) : 'None';

  let overallResult: 'PASS' | 'FAIL' | 'NOT STARTED' = 'NOT STARTED';
  if (reachedStages.length > 0) {
    overallResult = reachedStages.some((s) => s.status === 'FAIL') ? 'FAIL' : 'PASS';
  }

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    const pad = (n: number, z = 2) => ('00' + n).slice(-z);
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  };

  const handleCopyReport = () => {
    const connInfo = getPeerConnectionStates();
    const envInfo = {
      Role: isHost ? 'Host' : 'Viewer',
      Browser: navigator.userAgent,
      'Room ID': roomId,
      'Connection State': connInfo.connectionState,
      'ICE State': connInfo.iceConnectionState,
      Timestamp: new Date().toISOString(),
    };

    let report = `==================================================\n`;
    report += `          INTERACT MIC DIAGNOSTIC REPORT          \n`;
    report += `==================================================\n\n`;

    report += `--- ENVIRONMENT ---\n`;
    report += `Session ID       : ${sessionId}\n`;
    report += `Role             : ${envInfo.Role}\n`;
    report += `Room ID          : ${envInfo['Room ID']}\n`;
    report += `Connection State : ${envInfo['Connection State']}\n`;
    report += `ICE State        : ${envInfo['ICE State']}\n`;
    report += `Browser          : ${envInfo.Browser}\n`;
    report += `Report Gen Time  : ${envInfo.Timestamp}\n\n`;

    report += `--- SUMMARY ---\n`;
    report += `Last Completed Stage : ${lastCompletedStage}\n`;
    report += `First Failed Stage   : ${firstFailedStage}\n`;
    report += `Overall Result       : ${overallResult}\n\n`;

    report += `--- STAGES STATE ---\n`;
    processedStages.forEach((s) => {
      const ts = s.displayResult ? formatTimestamp(s.displayResult.timestamp) : 'N/A';
      report += `Stage ${s.num} [${s.name}]: ${s.status} (Time: ${ts})\n`;
      if (s.displayResult) {
        report += `  - Details: ${JSON.stringify(s.displayResult.details, null, 2).replace(/\n/g, '\n  ')}\n`;
      } else {
        report += `  - Details: Not Reached\n`;
      }
      report += `\n`;
    });

    report += `--- CHRONOLOGICAL RUN LOGS ---\n`;
    report += JSON.stringify(results, null, 2);

    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getStatusBadgeColor = (status: 'PASS' | 'FAIL' | 'NOT REACHED') => {
    switch (status) {
      case 'PASS':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'FAIL':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50';
    }
  };

  const getOverallDotColor = () => {
    switch (overallResult) {
      case 'PASS':
        return 'bg-emerald-500';
      case 'FAIL':
        return 'bg-rose-500';
      default:
        return 'bg-zinc-500';
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[9999] flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-zinc-700 bg-zinc-900/90 text-zinc-100 shadow-xl backdrop-blur-md cursor-pointer transition-all hover:bg-zinc-800 hover:-translate-y-0.5 max-w-[calc(100vw-32px)]"
      >
        <span className={`h-2.5 w-2.5 rounded-full ${getOverallDotColor()} animate-pulse-subtle`} />
        <span className="text-xs font-semibold tracking-wider uppercase font-mono truncate max-w-[180px] sm:max-w-none">
          Diagnostics ({overallResult})
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999] max-h-[calc(85vh-env(safe-area-inset-bottom))] flex flex-col glass-panel rounded-xl shadow-2xl overflow-hidden font-sans border border-zinc-800 select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-zinc-800 bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${getOverallDotColor()} animate-pulse-subtle`} />
          <h3 className="text-sm font-semibold text-zinc-200 tracking-tight font-mono">
            Mic Diagnostic Pipeline
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/55 rounded-md cursor-pointer transition-colors"
            title="Minimize"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        {/* Session Meta */}
        <div className="flex flex-col xs:flex-row xs:items-center justify-between text-[10px] md:text-[11px] text-zinc-500 font-mono bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/60 gap-1 overflow-hidden">
          <span className="truncate pr-1">Session: {sessionId}</span>
          <span className="capitalize shrink-0">Role: {isHost ? 'Host' : 'Viewer'}</span>
        </div>

        {/* Summary Dashboard */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-zinc-900/35 border border-zinc-850 p-2 rounded-lg flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium">Last Completed</span>
            <span className="text-sm font-bold font-mono text-zinc-300 mt-0.5">
              {lastCompletedStage !== 'None' ? `S${lastCompletedStage}` : '—'}
            </span>
          </div>
          <div className="bg-zinc-900/35 border border-zinc-850 p-2 rounded-lg flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium font-sans">First Failed</span>
            <span className={`text-sm font-bold font-mono mt-0.5 ${firstFailedStage !== 'None' ? 'text-rose-400' : 'text-zinc-500'}`}>
              {firstFailedStage !== 'None' ? `S${firstFailedStage}` : 'None'}
            </span>
          </div>
          <div className="bg-zinc-900/35 border border-zinc-850 p-2 rounded-lg flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium">Overall Result</span>
            <span className={`text-xs font-bold font-mono uppercase tracking-wider mt-0.5 ${overallResult === 'PASS' ? 'text-emerald-400' : overallResult === 'FAIL' ? 'text-rose-400' : 'text-zinc-500'}`}>
              {overallResult}
            </span>
          </div>
        </div>

        {/* Stages List */}
        <div className="space-y-2">
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 px-0.5">Pipeline Stages (1-7)</h4>
          <div className="space-y-1.5">
            {processedStages.map((stage) => {
              const isStageExpanded = expandedStage === stage.num;
              const hasDetails = !!stage.displayResult;

              return (
                <div
                  key={stage.num}
                  className="bg-zinc-950/20 border border-zinc-850 rounded-lg overflow-hidden transition-all duration-200"
                >
                  <div
                    onClick={() => hasDetails && setExpandedStage(isStageExpanded ? null : stage.num)}
                    className={`flex items-center justify-between p-2.5 transition-colors ${
                      hasDetails ? 'cursor-pointer hover:bg-zinc-900/25' : 'opacity-85'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full border border-zinc-800 bg-zinc-900/30 text-[10px] font-bold font-mono text-zinc-400">
                        {stage.num}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-300 leading-tight">
                          {stage.name}
                        </span>
                        {stage.displayResult && (
                          <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
                            {formatTimestamp(stage.displayResult.timestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono tracking-wider ${getStatusBadgeColor(stage.status)}`}>
                        {stage.status}
                      </span>
                      {hasDetails && (
                        <svg
                          className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${
                            isStageExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Details */}
                  {isStageExpanded && stage.displayResult && (
                    <div className="p-3 bg-zinc-950/50 border-t border-zinc-900 text-[10.5px] font-mono text-zinc-400 overflow-x-auto max-h-48 custom-scrollbar whitespace-pre-wrap select-text">
                      <div className="font-semibold text-zinc-300 mb-1 border-b border-zinc-900 pb-1">
                        Step: {stage.displayResult.name}
                      </div>
                      {JSON.stringify(stage.displayResult.details, null, 2)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer / Copy Button */}
      <div className="p-3.5 border-t border-zinc-800 bg-zinc-950/40">
        <button
          onClick={handleCopyReport}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-950 cursor-pointer shadow-sm transition-all active:scale-[0.98]"
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Copied Report!</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy Diagnostic Report</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
