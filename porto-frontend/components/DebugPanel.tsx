import React, { useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-json';

interface ToolExecution {
  tool_name: string;
  args: Record<string, any>;
  result: string;
  execution_time_ms: number;
  timestamp: string;
  error?: string | null;
}

interface DebugInfo {
  tool_executions?: ToolExecution[];
  model_responses?: string[];
  agent_response?: Record<string, any> | null;
  total_tool_calls?: number;
  total_model_responses?: number;
}

interface DebugPanelProps {
  debugInfo: DebugInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

// JSON Code Block Component with Prism.js
const JsonCodeBlock: React.FC<{ data: any; maxHeight?: string; title?: string }> = ({ data, maxHeight = '600px', title }) => {
  const codeRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [data]);

  const jsonString = JSON.stringify(data, null, 2);

  return (
    <div className="relative">
      {title && (
        <div className="mb-2">
          <span className="text-xs text-gray-400 font-medium">{title}</span>
        </div>
      )}
      <pre className="bg-gray-900 rounded p-3 text-xs overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words" style={{ maxHeight }}>
        <code ref={codeRef as React.RefObject<HTMLElement>} className="language-json break-words">
          {jsonString}
        </code>
      </pre>
    </div>
  );
};

const DebugPanel: React.FC<DebugPanelProps> = ({ debugInfo, isOpen, onClose }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['agent', 'tools']));

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !debugInfo) return null;

  const toolExecutions = debugInfo.tool_executions || [];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">Debug & Development Mode</h2>
            <span className="px-2 py-1 text-xs font-medium bg-purple-600/20 text-purple-300 rounded">
              {debugInfo.total_tool_calls || 0} Tools
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close debug panel"
            title="Schließen (ESC)"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>


        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Agent Response */}
            {debugInfo.agent_response && (
              <div className="bg-gray-900 rounded-lg p-4">
                <button
                  onClick={() => toggleSection('agent')}
                  className="w-full flex items-center justify-between mb-4 group"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">Agent Response</h3>
                    <span className="text-xs text-gray-500">Vollständiges Response-Objekt</span>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expandedSections.has('agent') ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSections.has('agent') && (
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <JsonCodeBlock data={debugInfo.agent_response} maxHeight="600px" />
                  </div>
                )}
              </div>
            )}

            {/* Tool Executions */}
            <div className="bg-gray-900 rounded-lg p-4">
              <button
                onClick={() => toggleSection('tools')}
                className="w-full flex items-center justify-between mb-4 group"
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">Tool Executions</h3>
                  <span className="text-sm text-gray-400">
                    {debugInfo.total_tool_calls || 0} {debugInfo.total_tool_calls === 1 ? 'call' : 'calls'}
                  </span>
                </div>
                <svg 
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expandedSections.has('tools') ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.has('tools') && (
                <>
                  {toolExecutions.length === 0 ? (
                    <p className="text-gray-500">No tool executions recorded</p>
                  ) : (
                    <div className="space-y-4">
                  {toolExecutions.map((exec, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-white font-semibold">{exec.tool_name}</h4>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(exec.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-400">Execution Time</span>
                          <p className="text-teal-400 font-mono">
                            {exec.execution_time_ms.toFixed(2)} ms
                          </p>
                        </div>
                      </div>
                      
                      {exec.error ? (
                        <div className="bg-red-900/30 border border-red-700 rounded p-3 mb-3">
                          <p className="text-red-400 text-sm font-medium">Error:</p>
                          <p className="text-red-300 text-sm mt-1">{exec.error}</p>
                        </div>
                      ) : null}

                      <div className="mb-3">
                        <JsonCodeBlock data={exec.args} maxHeight="200px" title="Arguments" />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-400 font-medium">Result</p>
                          <span className="text-xs text-gray-500">
                            {exec.result.length} chars
                          </span>
                        </div>
                        <pre className="bg-gray-900 rounded p-3 text-xs text-gray-300 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-words">
                          {exec.result}
                        </pre>
                      </div>
                    </div>
                  ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;

