import { useState, useRef, useEffect } from 'react';
import Message from './components/Message';
import MessageInput from './components/MessageInput';
import Toast from './components/Toast';
import ToolsSidebar from './components/ToolsSidebar';
import TabsSidebar from './components/TabsSidebar';
import DebugPanel from './components/DebugPanel';
import { BotIcon } from './components/icons';
import { type Message as MessageType, type FunctionCall } from './types';
import { sendChatMessage } from './services/apiService';

interface ChatTab {
  id: string;
  name: string;
  messages: MessageType[];
  threadId: string | null;
  toolCalls: FunctionCall[];
  createdAt: Date;
  debugInfo?: any;
}

const STORAGE_KEY_TABS = 'portfolio-ai-tabs';
const STORAGE_KEY_ACTIVE_TAB = 'portfolio-ai-active-tab';

const createInitialMessage = (): MessageType => ({
      id: 'initial',
      role: 'model',
      text: "Hallo! Ich bin Herman AI, dein intelligenter Assistent. Wie kann ich dir heute helfen? Frag mich alles über Projekte, Erfahrungen, Skills oder IT-Themen!",
      timestamp: new Date(),
});

const createNewTab = (id?: string): ChatTab => ({
  id: id || `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  name: `Chat ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
  messages: [createInitialMessage()],
  threadId: null,
  toolCalls: [],
  createdAt: new Date(),
});

const loadTabsFromStorage = (): { tabs: ChatTab[]; activeTabId: string | null } => {
  try {
    const savedTabs = localStorage.getItem(STORAGE_KEY_TABS);
    const savedActiveTab = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
    
    if (savedTabs) {
      const tabs = JSON.parse(savedTabs);
      const tabsWithDates = tabs.map((tab: any) => ({
        ...tab,
        createdAt: new Date(tab.createdAt),
        messages: tab.messages.map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
        })),
      }));
      return { tabs: tabsWithDates, activeTabId: savedActiveTab };
    }
  } catch (error) {
    console.error('Error loading tabs from storage:', error);
  }
  
  const initialTab = createNewTab();
  return { tabs: [initialTab], activeTabId: initialTab.id };
};

const saveTabsToStorage = (tabs: ChatTab[], activeTabId: string) => {
  try {
    localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(tabs));
    localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTabId);
  } catch (error) {
    console.error('Error saving tabs to storage:', error);
  }
};

const App = () => {
  const { tabs: initialTabs, activeTabId: initialActiveTabId } = loadTabsFromStorage();
  const [tabs, setTabs] = useState<ChatTab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string>(initialActiveTabId || initialTabs[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  // Initialize sidebars based on screen size
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768; // md breakpoint
    }
    return true;
  });
  const [isTabsSidebarOpen, setIsTabsSidebarOpen] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-close sidebars on mobile devices
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      if (isMobile) {
        setIsSidebarOpen(false);
        setIsTabsSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];
  const messages = activeTab?.messages || [];
  const threadId = activeTab?.threadId || null;
  const latestToolCalls = activeTab?.toolCalls || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTabId]);

  useEffect(() => {
    saveTabsToStorage(tabs, activeTabId);
  }, [tabs, activeTabId]);

  const updateActiveTab = (updates: Partial<ChatTab>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, ...updates } : tab
    ));
  };

  const handleSendMessage = async (text: string) => {
    if (isLoading || !activeTab) return;

    const userMessage: MessageType = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      role: 'user',
      text,
      timestamp: new Date(),
    };

    const botMessageId = `bot-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const botMessage: MessageType = {
      id: botMessageId,
      role: 'model',
      text: '',
      isStreaming: true,
      timestamp: new Date(),
    };
    
    const updatedMessages = [...messages, userMessage, botMessage];
    updateActiveTab({ messages: updatedMessages });
    setIsLoading(true);

    try {
      const response = await sendChatMessage(text, threadId, debugMode);
      
      const toolCallsArray: FunctionCall[] = response.toolCalls && response.toolCalls.length > 0 
        ? response.toolCalls.map((tc) => ({
            name: tc.name,
            args: tc.args,
            mcp: tc.mcp,
            schema: tc.schema,
          }))
        : [];
      
      updateActiveTab({
        messages: updatedMessages.map(msg => 
        msg.id === botMessageId 
          ? {
              ...msg,
              text: response.answer,
              isStreaming: false,
              toolCalls: toolCallsArray.length > 0 ? toolCallsArray : undefined,
            }
          : msg
        ),
        threadId: response.threadId,
        toolCalls: toolCallsArray,
        debugInfo: response.debugInfo || undefined,
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      updateActiveTab({
        messages: updatedMessages.map(msg => 
        msg.id === botMessageId 
          ? {
              ...msg,
              text: `I'm sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
              isStreaming: false,
            }
          : msg
        ),
      });
      setIsLoading(false);
    }
  };

  const handleNewTab = () => {
    const newTab = createNewTab();
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      const newTab = createNewTab();
      setTabs([newTab]);
      setActiveTabId(newTab.id);
      setToastMessage('Letzter Tab wurde zurückgesetzt');
    } else {
      const newTabs = tabs.filter(tab => tab.id !== tabId);
      setTabs(newTabs);
      if (activeTabId === tabId) {
        const index = tabs.findIndex(tab => tab.id === tabId);
        const newActiveTab = newTabs[Math.max(0, index - 1)] || newTabs[0];
        setActiveTabId(newActiveTab.id);
      }
    }
  };

  const handleClearChat = () => {
    if (!activeTab) return;
    const initialMessage = createInitialMessage();
    updateActiveTab({
      messages: [initialMessage],
      threadId: null,
      toolCalls: [],
    });
    setToastMessage('Chat wurde gelöscht');
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 shadow-lg z-10">
        <div className="px-4 md:px-5 py-3 md:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTabsSidebarOpen(!isTabsSidebarOpen)}
              className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-gray-700 hover:bg-gray-600 active:scale-95 rounded-lg transition-all duration-200 flex items-center gap-1.5 md:gap-2 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              title={isTabsSidebarOpen ? "Chat Tabs ausblenden" : "Chat Tabs einblenden"}
              aria-label={isTabsSidebarOpen ? "Chat Tabs ausblenden" : "Chat Tabs einblenden"}
            >
              <svg className={`w-4 h-4 transition-transform duration-200 ${isTabsSidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Chat Tabs</span>
            </button>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setDebugMode(!debugMode)}
              className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm active:scale-95 rounded-lg transition-all duration-200 flex items-center gap-1.5 md:gap-2 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                debugMode 
                  ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={debugMode ? "Debug-Modus deaktivieren" : "Debug-Modus aktivieren"}
              aria-label={debugMode ? "Debug-Modus deaktivieren" : "Debug-Modus aktivieren"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Debug</span>
            </button>
            {activeTab?.debugInfo && (
              <button
                onClick={() => setIsDebugPanelOpen(true)}
                className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-purple-600 hover:bg-purple-700 active:scale-95 rounded-lg transition-all duration-200 flex items-center gap-1.5 md:gap-2 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                title="Debug-Panel öffnen"
                aria-label="Debug-Panel öffnen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="hidden sm:inline">Debug Panel</span>
              </button>
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-gray-700 hover:bg-gray-600 active:scale-95 rounded-lg transition-all duration-200 flex items-center gap-1.5 md:gap-2 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              title={isSidebarOpen ? "Tools ausblenden" : "Tools einblenden"}
              aria-label={isSidebarOpen ? "Tools ausblenden" : "Tools einblenden"}
            >
              <svg className={`w-4 h-4 transition-transform duration-200 ${isSidebarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="hidden sm:inline">Tools</span>
            </button>
            <button
              onClick={handleClearChat}
              className="px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm bg-gray-700 hover:bg-gray-600 active:scale-95 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              title="Clear chat history"
              aria-label="Clear chat history"
            >
              <svg className="w-4 h-4 inline-block md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden md:inline">Clear Chat</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop for Tabs Sidebar */}
        {isTabsSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
            onClick={() => setIsTabsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Tabs Sidebar - Links */}
        <div className={`
          h-full transition-all duration-300 ease-in-out
          ${isTabsSidebarOpen 
            ? 'opacity-100 translate-x-0' 
            : 'opacity-0 -translate-x-full'
          }
          ${isTabsSidebarOpen 
            ? 'md:w-[420px] w-[85vw] max-w-[420px]' 
            : 'w-0 overflow-hidden'
          }
          fixed md:relative z-50 md:z-auto
          ${isTabsSidebarOpen ? 'left-0' : '-left-full md:left-0'}
        `}>
          {isTabsSidebarOpen && (
            <div className="h-full animate-slide-in-left">
              <TabsSidebar
                tabs={tabs}
                activeTabId={activeTabId}
                onTabClick={(tabId) => {
                  setActiveTabId(tabId);
                  // Close sidebar on mobile after selecting a tab
                  if (window.innerWidth < 768) {
                    setIsTabsSidebarOpen(false);
                  }
                }}
                onNewTab={() => {
                  handleNewTab();
                  // Close sidebar on mobile after creating a tab
                  if (window.innerWidth < 768) {
                    setIsTabsSidebarOpen(false);
                  }
                }}
                onCloseTab={handleCloseTab}
                onClose={() => setIsTabsSidebarOpen(false)}
              />
            </div>
          )}
        </div>
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <main className={`flex-1 overflow-y-auto transition-all duration-300 scroll-smooth`}>
            <div className="max-w-4xl mx-auto px-5 md:px-6 py-6 md:py-7">
              {messages.length === 1 && messages[0].id === 'initial' ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
                  <div className="max-w-2xl w-full">
                    {/* Animated Bot Icon */}
                    <div className="text-center mb-8 animate-slide-up" style={{ animationDelay: '0ms' }}>
                      <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/20 border-2 border-teal-500/30 shadow-2xl animate-pulse">
                        <BotIcon className="w-10 h-10" color="text-teal-400" />
                      </div>
                      <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-white via-teal-200 to-teal-400 bg-clip-text text-transparent">
                        Herman AI
                      </h2>
                      <p className="text-gray-300 text-lg md:text-xl leading-relaxed mb-3 font-medium">
                        Dein intelligenter Assistent für Portfolio & IT-Fragen
                      </p>
                      <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
                        Frag mich alles über Projekte, Erfahrungen, Skills oder allgemeine IT-Themen
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
                      <button
                        onClick={() => handleSendMessage("Was sind deine Hauptprojekte?")}
                        disabled={isLoading}
                        className="p-5 bg-gray-800/60 hover:bg-gray-800/70 border-2 border-gray-700/50 hover:border-teal-500/40 rounded-2xl text-left transition-all duration-500 ease-out group shadow-md hover:shadow-lg hover:shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] animate-slide-up"
                        style={{ animationDelay: '100ms' }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-500/25 transition-all duration-500 ease-out shadow-sm group-hover:shadow-sm">
                            <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-bold mb-1.5 group-hover:text-teal-200 transition-colors duration-500 ease-out text-base">Projekte</div>
                            <div className="text-sm text-gray-400 leading-relaxed">Was sind deine Hauptprojekte?</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handleSendMessage("Welche Skills und Technologien beherrschst du?")}
                        disabled={isLoading}
                        className="p-5 bg-gray-800/60 hover:bg-gray-800/70 border-2 border-gray-700/50 hover:border-purple-500/40 rounded-2xl text-left transition-all duration-500 ease-out group shadow-md hover:shadow-lg hover:shadow-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] animate-slide-up"
                        style={{ animationDelay: '200ms' }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/25 transition-all duration-500 ease-out shadow-sm group-hover:shadow-sm">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-bold mb-1.5 group-hover:text-purple-200 transition-colors duration-500 ease-out text-base">Skills</div>
                            <div className="text-sm text-gray-400 leading-relaxed">Welche Technologien beherrschst du?</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handleSendMessage("Erzähle mir von deiner Berufserfahrung")}
                        disabled={isLoading}
                        className="p-5 bg-gray-800/60 hover:bg-gray-800/70 border-2 border-gray-700/50 hover:border-blue-500/40 rounded-2xl text-left transition-all duration-500 ease-out group shadow-md hover:shadow-lg hover:shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] animate-slide-up"
                        style={{ animationDelay: '300ms' }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/25 transition-all duration-500 ease-out shadow-sm group-hover:shadow-sm">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-bold mb-1.5 group-hover:text-blue-200 transition-colors duration-500 ease-out text-base">Erfahrung</div>
                            <div className="text-sm text-gray-400 leading-relaxed">Erzähle mir von deiner Berufserfahrung</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handleSendMessage("Wie kann ich dich kontaktieren?")}
                        disabled={isLoading}
                        className="p-5 bg-gray-800/60 hover:bg-gray-800/70 border-2 border-gray-700/50 hover:border-green-500/40 rounded-2xl text-left transition-all duration-500 ease-out group shadow-md hover:shadow-lg hover:shadow-green-500/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] animate-slide-up"
                        style={{ animationDelay: '400ms' }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/25 transition-all duration-500 ease-out shadow-sm group-hover:shadow-sm">
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-bold mb-1.5 group-hover:text-green-200 transition-colors duration-500 ease-out text-base">Kontakt</div>
                            <div className="text-sm text-gray-400 leading-relaxed">Wie kann ich dich kontaktieren?</div>
                          </div>
                        </div>
                      </button>
                    </div>
                    
                    <div className="text-center animate-slide-up" style={{ animationDelay: '500ms' }}>
                      <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800/40 border border-gray-700/50 rounded-xl mb-4">
                        <svg className="w-4 h-4 text-teal-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-gray-400 font-medium">Oder stelle deine eigene Frage</p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <svg className="w-4 h-4 text-teal-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>Ich kann auch allgemeine IT-Fragen beantworten</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div key={msg.id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                      <Message message={msg} />
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
        </main>
          
          <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
        
        <div className={`h-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full w-0 overflow-hidden'}`}>
          {isSidebarOpen && (
            <div className="h-full animate-slide-in">
              <ToolsSidebar toolCalls={latestToolCalls} />
            </div>
          )}
        </div>
      </div>
      
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
      
      {isDebugPanelOpen && activeTab?.debugInfo && (
        <DebugPanel
          debugInfo={activeTab.debugInfo}
          isOpen={isDebugPanelOpen}
          onClose={() => setIsDebugPanelOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
