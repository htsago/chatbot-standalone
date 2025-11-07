import { useState, useRef, useEffect } from 'react';
import Message from './components/Message';
import MessageInput from './components/MessageInput';
import Toast from './components/Toast';
import ToolsSidebar from './components/ToolsSidebar';
import TabsSidebar from './components/TabsSidebar';
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
}

const STORAGE_KEY_TABS = 'portfolio-ai-tabs';
const STORAGE_KEY_ACTIVE_TAB = 'portfolio-ai-active-tab';

const createInitialMessage = (): MessageType => ({
      id: 'initial',
      role: 'model',
      text: "Hello! I'm your Portfolio AI Assistant. How can I help you today? Ask me anything about my portfolio, projects, experience, or skills!",
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTabsSidebarOpen, setIsTabsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const response = await sendChatMessage(text, threadId);
      
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
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 shadow-xl z-10">
        <div className="px-5 md:px-6 py-4 md:py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTabsSidebarOpen(!isTabsSidebarOpen)}
              className="px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm bg-gray-700 hover:bg-gray-600 active:scale-95 rounded-lg transition-all duration-200 flex items-center gap-1.5 md:gap-2 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800"
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
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm bg-gray-700 hover:bg-gray-600 active:scale-95 rounded-lg transition-all duration-200 flex items-center gap-1.5 md:gap-2 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800"
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
        {/* Tabs Sidebar - Links */}
            <div className={`h-full transition-all duration-300 ease-in-out ${isTabsSidebarOpen ? 'opacity-100 translate-x-0 w-[420px]' : 'opacity-0 -translate-x-full w-0 overflow-hidden'}`}>
          {isTabsSidebarOpen && (
            <div className="h-full animate-slide-in-left">
              <TabsSidebar
                tabs={tabs}
                activeTabId={activeTabId}
                onTabClick={setActiveTabId}
                onNewTab={handleNewTab}
                onCloseTab={handleCloseTab}
              />
            </div>
          )}
        </div>
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <main className={`flex-1 overflow-y-auto px-6 md:px-8 py-8 md:py-10 transition-all duration-300 scroll-smooth`}>
            <div className="max-w-4xl mx-auto space-y-8">
              {messages.length === 1 && messages[0].id === 'initial' ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
                  <div className="max-w-2xl w-full">
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-bold text-white mb-4">Willkommen bei Portfolio AI</h2>
                      <p className="text-gray-300 text-lg leading-relaxed mb-2">
                        Ich bin dein persönlicher AI-Assistent für Herman Tsagos Portfolio.
                      </p>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        Frag mich alles über Projekte, Erfahrungen, Skills oder allgemeine IT-Fragen!
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
                      <button
                        onClick={() => handleSendMessage("Was sind deine Hauptprojekte?")}
                        disabled={isLoading}
                        className="p-5 bg-gray-800/60 hover:bg-gray-800/80 border-2 border-gray-700/50 hover:border-teal-500/50 rounded-2xl text-left transition-all duration-200 group shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-500/30 transition-all duration-200 shadow-sm group-hover:shadow-md">
                            <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-bold mb-1.5 group-hover:text-teal-300 transition-colors text-base">Projekte</div>
                            <div className="text-sm text-gray-400 leading-relaxed">Was sind deine Hauptprojekte?</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handleSendMessage("Welche Skills und Technologien beherrschst du?")}
                        disabled={isLoading}
                        className="p-5 bg-gray-800/60 hover:bg-gray-800/80 border-2 border-gray-700/50 hover:border-purple-500/50 rounded-2xl text-left transition-all duration-200 group shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-all duration-200 shadow-sm group-hover:shadow-md">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-bold mb-1.5 group-hover:text-purple-300 transition-colors text-base">Skills</div>
                            <div className="text-sm text-gray-400 leading-relaxed">Welche Technologien beherrschst du?</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handleSendMessage("Erzähle mir von deiner Berufserfahrung")}
                        disabled={isLoading}
                        className="p-5 bg-gray-800/60 hover:bg-gray-800/80 border-2 border-gray-700/50 hover:border-blue-500/50 rounded-2xl text-left transition-all duration-200 group shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-all duration-200 shadow-sm group-hover:shadow-md">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-bold mb-1.5 group-hover:text-blue-300 transition-colors text-base">Erfahrung</div>
                            <div className="text-sm text-gray-400 leading-relaxed">Erzähle mir von deiner Berufserfahrung</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handleSendMessage("Wie kann ich dich kontaktieren?")}
                        disabled={isLoading}
                        className="p-5 bg-gray-800/60 hover:bg-gray-800/80 border-2 border-gray-700/50 hover:border-green-500/50 rounded-2xl text-left transition-all duration-200 group shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/30 transition-all duration-200 shadow-sm group-hover:shadow-md">
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-bold mb-1.5 group-hover:text-green-300 transition-colors text-base">Kontakt</div>
                            <div className="text-sm text-gray-400 leading-relaxed">Wie kann ich dich kontaktieren?</div>
                          </div>
                        </div>
                      </button>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-3">Oder stelle deine eigene Frage:</p>
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Ich kann auch allgemeine IT-Fragen beantworten</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={msg.id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <Message message={msg} />
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
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
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};

export default App;
