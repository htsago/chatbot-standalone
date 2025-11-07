import React, { useEffect, useRef } from 'react';
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
const JsonCodeBlock: React.FC<{ data: any; maxHeight?: string }> = ({ data, maxHeight = '600px' }) => {
  const codeRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [data]);

  const jsonString = JSON.stringify(data, null, 2);

  return (
    <pre className="bg-gray-900 rounded p-3 text-xs overflow-x-auto overflow-y-auto" style={{ maxHeight }}>
      <code ref={codeRef as React.RefObject<HTMLElement>} className="language-json">
        {jsonString}
      </code>
    </pre>
  );
};

const DebugPanel: React.FC<DebugPanelProps> = ({ debugInfo, isOpen, onClose }) => {

  if (!isOpen || !debugInfo) return null;

  const toolExecutions = debugInfo.tool_executions || [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Debug & Development Mode</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close debug panel"
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
                <h3 className="text-lg font-semibold text-white mb-4">Agent Response</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Vollständiges Response-Objekt vom Agent
                </p>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <JsonCodeBlock data={debugInfo.agent_response} maxHeight="600px" />
                </div>
              </div>
            )}

            {/* Tool Executions */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Tool Executions</h3>
              <div className="text-sm text-gray-400 mb-4">
                Total: {debugInfo.total_tool_calls || 0} tool calls
              </div>
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
                        <p className="text-xs text-gray-400 mb-1">Arguments:</p>
                        <div className="bg-gray-900 rounded p-2">
                          <JsonCodeBlock data={exec.args} maxHeight="200px" />
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 mb-1">Result:</p>
                        <pre className="bg-gray-900 rounded p-2 text-xs text-gray-300 overflow-x-auto max-h-48 overflow-y-auto">
                          {exec.result.length > 500 
                            ? `${exec.result.substring(0, 500)}...` 
                            : exec.result}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;

