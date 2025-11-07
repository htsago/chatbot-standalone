import { useState, useEffect } from 'react';
import { getTools, type Tool } from '../services/apiService';
import { type FunctionCall } from '../types';
import ToolsAvatar from './ToolsAvatar';

interface ToolsSidebarProps {
  toolCalls?: FunctionCall[];
}

const ToolsSidebar = ({ toolCalls = [] }: ToolsSidebarProps) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTools = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getTools();
        console.log('Loaded tools:', response);
        setTools(response.tools || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load tools:', error);
        setError(error instanceof Error ? error.message : 'Failed to load tools');
        setIsLoading(false);
      }
    };
    loadTools();
  }, []);

  // Auto-expand tools that are being used
  useEffect(() => {
    if (toolCalls && toolCalls.length > 0) {
      const usedToolNames = new Set(
        toolCalls
          .map(tc => tc.name.replace('_lc', ''))
          .filter(name => name)
      );
      
      setExpandedTools(prev => {
        const newSet = new Set(prev);
        usedToolNames.forEach(name => newSet.add(name));
        return newSet;
      });
    }
  }, [toolCalls]);

  const toggleTool = (toolName: string) => {
    setExpandedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolName)) {
        newSet.delete(toolName);
      } else {
        newSet.add(toolName);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="w-full md:w-[420px] h-full bg-gray-800/50 backdrop-blur-sm border-l border-gray-700 overflow-y-auto overflow-x-hidden">
        <div className="p-6">
          <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2.5">
            <ToolsAvatar size="sm" />
            Tools
          </h2>
          <p className="text-sm text-gray-400 mb-4">Verfügbare Tools</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
          Lade Tools...
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-[420px] h-full bg-gray-800/50 backdrop-blur-sm border-l border-gray-700 overflow-y-auto overflow-x-hidden">
      <div className="p-7">
        <div className="mb-7">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ToolsAvatar size="sm" />
            Tools
          </h2>
          <p className="text-xs text-gray-400 mt-1">Verfügbare Tools</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700/50 rounded-xl text-sm text-red-200 shadow-sm">
          <div className="font-semibold mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Fehler beim Laden
          </div>
          <div className="text-xs leading-relaxed">{error}</div>
        </div>
      )}

      {tools.length === 0 && !error && (
        <div className="text-sm text-gray-400 italic p-4 text-center bg-gray-900/40 rounded-xl border border-gray-700/30">
          Keine Tools verfügbar
        </div>
      )}

      <div className="space-y-3">
        {tools.map((tool) => {
          const isExpanded = expandedTools.has(tool.name);
          const hasParams = Object.keys(tool.parameters).length > 0;
          
          // Find tool calls for this tool
          const toolCall = toolCalls?.find(tc => {
            const baseName = tc.name.replace('_lc', '');
            return baseName === tool.name;
          });
          const isUsed = !!toolCall;

          return (
            <div
              key={tool.name}
              className={`bg-gray-900/60 border-2 rounded-2xl overflow-hidden transition-all ${
                isUsed 
                  ? 'border-teal-500/70 shadow-xl shadow-teal-500/20' 
                  : 'border-gray-700/50 shadow-md hover:shadow-lg'
              }`}
            >
              <button
                onClick={() => toggleTool(tool.name)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-800/50 active:bg-gray-800/70 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-teal-500/50 rounded-t-2xl"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${isUsed ? 'bg-teal-400 animate-pulse' : 'bg-teal-400'}`}></div>
                  <span className="text-sm font-mono font-semibold text-teal-300 truncate">
                    {tool.name}
                  </span>
                  {isUsed && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-600/40 text-green-200 border border-green-500/50 rounded font-semibold flex-shrink-0 animate-pulse">
                      Aktiv
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 group-hover:text-gray-300 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 pt-5 border-t border-gray-700/50 space-y-6 animate-fade-in">
                  {tool.description && (
                    <div className="bg-gray-900/40 p-6 rounded-xl border-2 border-gray-700/30 shadow-md">
                      <div className="text-sm text-gray-400 mb-4 font-semibold flex items-center gap-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Beschreibung
                      </div>
                      <div className="text-sm text-gray-300 leading-relaxed">{tool.description}</div>
                    </div>
                  )}

                      {hasParams ? (
                        <div>
                          <div className="text-sm text-gray-400 mb-5 font-semibold flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Parameter ({Object.keys(tool.parameters).length})
                          </div>
                          <div className="space-y-5">
                            {Object.entries(tool.parameters).map(([paramName, paramInfo]) => {
                              const isRequired = tool.required.includes(paramName);
                              const actualValue = toolCall?.args?.[paramName];
                              const hasValue = actualValue !== undefined && actualValue !== null;

                              return (
                                <div
                                  key={paramName}
                                  className={`p-6 border-2 rounded-xl transition-all ${
                                    hasValue 
                                      ? 'bg-teal-900/20 border-teal-500/40 shadow-lg shadow-teal-500/10' 
                                      : 'bg-gray-800/60 border-gray-700/30 shadow-md hover:shadow-lg'
                                  }`}
                                >
                                  <div className="flex items-center gap-4 mb-4">
                                    <span className="text-sm font-mono font-bold text-teal-300">
                                      {paramName}
                                    </span>
                                    {isRequired && (
                                      <span className="text-xs px-2.5 py-1.5 bg-red-600/40 text-red-200 border border-red-500/50 rounded-lg font-semibold">
                                        Required
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-3">
                                    {paramInfo.type && (
                                      <div className="flex items-center gap-3 text-xs">
                                        <span className="text-gray-500 font-medium">Typ:</span>
                                        <span className="text-teal-400 font-mono bg-teal-900/20 px-2.5 py-1.5 rounded-lg border border-teal-700/30 font-semibold">
                                          {paramInfo.type}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {paramInfo.description && (
                                      <div className={`text-sm leading-relaxed ${hasValue ? 'text-gray-400' : 'text-gray-300'}`}>
                                        {paramInfo.description}
                                      </div>
                                    )}
                                    
                                    {hasValue && (
                                      <div className="mt-4 pt-4 border-t border-gray-700/40">
                                        <div className="text-xs text-gray-400 mb-3 font-semibold flex items-center gap-2">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          Aktueller Wert
                                        </div>
                                        <div className="p-4 bg-gray-900/80 border-2 border-gray-700/50 rounded-xl font-mono text-xs text-white break-words leading-relaxed">
                                          {typeof actualValue === 'string' ? (
                                            <span>
                                              <span className="text-gray-400">"</span>
                                              <span className="text-green-300">{actualValue}</span>
                                              <span className="text-gray-400">"</span>
                                            </span>
                                          ) : (
                                            <pre className="whitespace-pre-wrap text-green-300 leading-relaxed">{JSON.stringify(actualValue, null, 2)}</pre>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 bg-gray-900/40 border-2 border-gray-700/30 rounded-xl text-sm text-gray-400 italic text-center shadow-md">
                          Dieses Tool benötigt keine Parameter
                        </div>
                      )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};

export default ToolsSidebar;

