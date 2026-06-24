import React, { useState, useEffect, useRef } from 'react';

export const SpeechTestPage: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const startTimestamp = useRef<number | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Helper to format timestamp [HH:MM:SS.mmm]
  const getTimestamp = () => {
    const now = new Date();
    const pad = (n: number, z = 2) => ('00' + n).slice(-z);
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
  };

  const addLog = (msg: string) => {
    const timeStr = getTimestamp();
    const elapsed = startTimestamp.current ? Math.round(performance.now() - startTimestamp.current) : 0;
    const logMsg = `[${timeStr}] +${elapsed}ms ${msg}`;
    setLogs(prev => [...prev, logMsg]);
  };

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const startRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      addLog("ERROR: SpeechRecognition is not supported on this browser.");
      return;
    }

    const rec = new SpeechRecognitionClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 1;

    // Reset transcripts and set baseline start timestamp
    setInterimText("");
    setFinalText("");
    startTimestamp.current = performance.now();
    setIsListening(true);
    recognitionRef.current = rec;

    const addEventLog = (name: string, data?: string) => {
      const timeStr = getTimestamp();
      const elapsed = startTimestamp.current ? Math.round(performance.now() - startTimestamp.current) : 0;
      const logMsg = `[${timeStr}] +${elapsed}ms ${name}${data ? ` | ${data}` : ''}`;
      setLogs(prev => [...prev, logMsg]);
    };

    rec.onstart = () => {
      addEventLog("onstart");
    };

    rec.onaudiostart = () => {
      addEventLog("onaudiostart");
    };

    rec.onsoundstart = () => {
      addEventLog("onsoundstart");
    };

    rec.onspeechstart = () => {
      addEventLog("onspeechstart");
    };

    rec.onspeeechend = () => {
      addEventLog("onspeeechend");
    };

    rec.onsoundend = () => {
      addEventLog("onsoundend");
    };

    rec.onaudioend = () => {
      addEventLog("onaudioend");
    };

    rec.onerror = (event: any) => {
      addEventLog("onerror", `error: ${event.error}${event.message ? ` - ${event.message}` : ''}`);
    };

    rec.onend = () => {
      addEventLog("onend");
      setIsListening(false);
      recognitionRef.current = null;
    };

    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      addEventLog(
        "onresult",
        `results length: ${event.results.length}, index: ${event.resultIndex}, interim: "${interim}", final: "${final}"`
      );

      // Accumulate the entire results list to display
      let cumulativeFinal = "";
      let cumulativeInterim = "";
      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          cumulativeFinal += result[0].transcript + " ";
        } else {
          cumulativeInterim += result[0].transcript;
        }
      }
      setInterimText(cumulativeInterim);
      if (cumulativeFinal) {
        setFinalText(cumulativeFinal.trim());
      }
    };

    addLog("--- Clicked Start Recognition ---");
    try {
      rec.start();
    } catch (e: any) {
      addLog(`ERROR starting recognition: ${e.message || e}`);
      setIsListening(false);
    }
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        addLog("--- Clicked Stop Recognition (Stop called) ---");
      } catch (e: any) {
        addLog(`ERROR stopping recognition: ${e.message || e}`);
      }
    } else {
      addLog("--- Clicked Stop Recognition (Not active) ---");
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setInterimText("");
    setFinalText("");
    addLog("--- Logs Cleared ---");
  };

  const copyLogsToClipboard = () => {
    const textToCopy = logs.join('\n');
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        alert("Logs copied to clipboard!");
      })
      .catch(err => {
        console.error("Could not copy logs: ", err);
      });
  };

  // Gather browser environment variables safely
  const hasSR = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const hasWebkitSR = typeof window !== 'undefined' && !!(window as any).webkitSpeechRecognition;
  const isSecure = typeof window !== 'undefined' && window.isSecureContext;

  const browserInfo = {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    speechRecognitionConstructor: hasSR ? 'Detected' : 'Not Detected',
    webkitSpeechRecognition: hasWebkitSR ? 'Available' : 'Not Available',
    isSecureContext: isSecure ? 'Yes (Secure)' : 'No (Insecure)',
    platform: typeof navigator !== 'undefined' ? (navigator.platform || 'Unknown') : 'Unknown',
    vendor: typeof navigator !== 'undefined' ? (navigator.vendor || 'Unknown') : 'Unknown',
    language: typeof navigator !== 'undefined' ? (navigator.language || 'Unknown') : 'Unknown',
    languages: typeof navigator !== 'undefined' ? (navigator.languages ? navigator.languages.join(', ') : 'Unknown') : 'Unknown',
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#e5e1e4] flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-3xl bg-[#131315] border border-zinc-850 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-6">
        
        {/* Header */}
        <div className="border-b border-zinc-800 pb-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-geist">
              Speech Recognition Isolation Test
            </h1>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isListening ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`}></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {isListening ? 'Listening' : 'Idle'}
              </span>
            </div>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            This page runs SpeechRecognition in total isolation without WebRTC, rooms, websockets, or audio analyzers.
          </p>
        </div>

        {/* Buttons / Controls */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={startRecognition}
            disabled={isListening}
            className={`px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold font-geist transition-all flex items-center gap-2 cursor-pointer shadow-md ${
              isListening
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-750'
                : 'bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold hover:scale-[1.01]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] md:text-[18px]">play_arrow</span>
            Start Recognition
          </button>
          
          <button
            onClick={stopRecognition}
            disabled={!isListening}
            className={`px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold font-geist transition-all flex items-center gap-2 cursor-pointer shadow-md ${
              !isListening
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-750'
                : 'bg-rose-600 hover:bg-rose-500 text-white font-bold hover:scale-[1.01]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] md:text-[18px]">stop</span>
            Stop Recognition
          </button>
          
          <button
            onClick={clearLogs}
            className="px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold font-geist bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all border border-zinc-750 flex items-center gap-2 cursor-pointer hover:scale-[1.01]"
          >
            <span className="material-symbols-outlined text-[16px] md:text-[18px]">clear_all</span>
            Clear Logs
          </button>

          {logs.length > 0 && (
            <button
              onClick={copyLogsToClipboard}
              className="px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold font-geist bg-indigo-600 hover:bg-indigo-500 text-white transition-all border border-indigo-700 flex items-center gap-2 cursor-pointer hover:scale-[1.01]"
            >
              <span className="material-symbols-outlined text-[16px] md:text-[18px]">content_copy</span>
              Copy Logs
            </button>
          )}
        </div>

        {/* Section 1: Live Transcripts */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold tracking-wider uppercase text-zinc-400 font-geist">
            1. Live Transcript
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Interim Transcript
              </label>
              <div className="bg-[#18181b] border border-zinc-850 rounded-lg p-3 min-h-[80px] max-h-[120px] overflow-y-auto text-sm text-yellow-400 font-mono whitespace-pre-wrap">
                {interimText || <span className="text-zinc-650 italic font-sans text-xs">No interim results yet...</span>}
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Final Transcript
              </label>
              <div className="bg-[#18181b] border border-zinc-850 rounded-lg p-3 min-h-[80px] max-h-[120px] overflow-y-auto text-sm text-emerald-400 font-mono whitespace-pre-wrap">
                {finalText || <span className="text-zinc-650 italic font-sans text-xs">No final results yet...</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Event Log */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-wider uppercase text-zinc-400 font-geist">
              2. Event Log
            </h2>
            <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded">
              {logs.length} entries
            </span>
          </div>
          
          <div className="bg-[#0e0e10] border border-zinc-900 rounded-xl p-4 h-[240px] overflow-y-auto custom-scrollbar font-mono text-xs text-zinc-300 flex flex-col gap-1">
            {logs.length === 0 ? (
              <span className="text-zinc-600 italic font-sans">No events logged yet. Press 'Start Recognition' to begin.</span>
            ) : (
              logs.map((log, index) => {
                let textClass = "text-zinc-400";
                if (log.includes("ERROR") || log.includes("onerror")) textClass = "text-rose-400";
                else if (log.includes("onresult")) textClass = "text-yellow-300";
                else if (log.includes("onstart") || log.includes("onaudiostart")) textClass = "text-emerald-400";
                else if (log.includes("onend") || log.includes("onaudioend")) textClass = "text-amber-400";
                else if (log.includes("Clicked Start")) textClass = "text-indigo-400 font-bold border-t border-zinc-900 pt-1 mt-1";
                else if (log.includes("Clicked Stop") || log.includes("Cleared")) textClass = "text-zinc-500 font-bold border-b border-zinc-900 pb-1 mb-1";
                
                return (
                  <div key={index} className={`${textClass} leading-relaxed whitespace-pre-wrap break-all`}>
                    {log}
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Section 3: Browser Information */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-sm font-bold tracking-wider uppercase text-zinc-400 font-geist">
            3. Browser Information
          </h2>
          
          <div className="border border-zinc-850 rounded-xl overflow-hidden text-xs">
            <div className="grid grid-cols-3 bg-zinc-900 border-b border-zinc-850 p-2 text-zinc-400 font-semibold font-geist">
              <div className="col-span-1">Property</div>
              <div className="col-span-2">Value</div>
            </div>
            
            <div className="divide-y divide-zinc-850">
              <div className="grid grid-cols-3 p-2 bg-[#131315]/50">
                <div className="col-span-1 text-zinc-500 font-semibold font-geist">User Agent</div>
                <div className="col-span-2 text-zinc-300 font-mono break-all">{browserInfo.userAgent}</div>
              </div>
              
              <div className="grid grid-cols-3 p-2 bg-[#131315]/50">
                <div className="col-span-1 text-zinc-500 font-semibold font-geist">SpeechConstructor</div>
                <div className={`col-span-2 font-bold ${hasSR ? 'text-emerald-400' : 'text-rose-400'}`}>{browserInfo.speechRecognitionConstructor}</div>
              </div>
              
              <div className="grid grid-cols-3 p-2 bg-[#131315]/50">
                <div className="col-span-1 text-zinc-500 font-semibold font-geist">webkitSpeechRecognition</div>
                <div className={`col-span-2 font-bold ${hasWebkitSR ? 'text-emerald-400' : 'text-rose-400'}`}>{browserInfo.webkitSpeechRecognition}</div>
              </div>
              
              <div className="grid grid-cols-3 p-2 bg-[#131315]/50">
                <div className="col-span-1 text-zinc-500 font-semibold font-geist">Secure Context</div>
                <div className={`col-span-2 font-bold ${isSecure ? 'text-emerald-400' : 'text-amber-500'}`}>{browserInfo.isSecureContext}</div>
              </div>
              
              <div className="grid grid-cols-3 p-2 bg-[#131315]/50">
                <div className="col-span-1 text-zinc-500 font-semibold font-geist">Platform</div>
                <div className="col-span-2 text-zinc-300">{browserInfo.platform}</div>
              </div>
              
              <div className="grid grid-cols-3 p-2 bg-[#131315]/50">
                <div className="col-span-1 text-zinc-500 font-semibold font-geist">Vendor</div>
                <div className="col-span-2 text-zinc-300">{browserInfo.vendor}</div>
              </div>
              
              <div className="grid grid-cols-3 p-2 bg-[#131315]/50">
                <div className="col-span-1 text-zinc-500 font-semibold font-geist">Language</div>
                <div className="col-span-2 text-zinc-300 font-mono">{browserInfo.language}</div>
              </div>
              
              <div className="grid grid-cols-3 p-2 bg-[#131315]/50">
                <div className="col-span-1 text-zinc-500 font-semibold font-geist">Languages</div>
                <div className="col-span-2 text-zinc-300 font-mono">{browserInfo.languages}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
