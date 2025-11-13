import React from 'react';

interface ChatTab {
  id: string;
  name: string;
  messages: any[];
  createdAt: Date;
}

interface TabsSidebarProps {
  tabs: ChatTab[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onNewTab: () => void;
  onCloseTab: (tabId: string, e: React.MouseEvent) => void;
  onClose?: () => void;
}

const getTabName = (tab: ChatTab): string => {
  if (tab.messages.length > 1 && tab.messages[1]?.text) {
    const firstUserMessage = tab.messages[1].text;
    return firstUserMessage.length > 25 
      ? firstUserMessage.substring(0, 25) + '...' 
      : firstUserMessage;
  }
  return tab.name;
};

const TabsSidebar: React.FC<TabsSidebarProps> = ({
  tabs,
  activeTabId,
  onTabClick,
  onNewTab,
  onCloseTab,
  onClose,
}) => {
  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="w-full md:w-[420px] h-full bg-gray-800/95 md:bg-gray-800/50 backdrop-blur-sm border-r border-gray-700/50 overflow-y-auto overflow-x-hidden shadow-xl md:shadow-none">
      <div className="p-4 md:p-5">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
              Chats
            </h2>
            {/* Close button for mobile */}
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg hover:bg-gray-700/60 active:scale-95 transition-all duration-150"
                aria-label="Sidebar schließen"
              >
                <svg className="w-5 h-5 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={onNewTab}
            className="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] rounded-lg transition-all duration-200 flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800 text-sm font-semibold text-white"
            aria-label="Neuer Tab"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Neuer Chat
          </button>
        </div>

        {/* Tabs List */}
        <div className="space-y-1">
          {tabs.map((tab, index) => {
            const isActive = activeTabId === tab.id;
            const messageCount = tab.messages.length - 1;
            
            return (
              <div
                key={tab.id}
                onClick={() => onTabClick(tab.id)}
                className={`
                  group relative px-3.5 py-3 rounded-lg cursor-pointer 
                  transition-all duration-200 ease-out
                  ${isActive
                    ? 'bg-teal-600/20 border border-teal-500/40 shadow-sm shadow-teal-500/5'
                    : 'bg-transparent border border-transparent hover:bg-gray-700/50 hover:border-gray-600/30'
                  }
                `}
                style={{ animationDelay: `${index * 20}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {/* Chat Icon */}
                    <div className={`
                      mt-0.5 flex-shrink-0
                      ${isActive ? 'text-teal-400' : 'text-gray-500 group-hover:text-gray-400'}
                      transition-colors duration-200
                    `}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate leading-tight mb-1.5">
                        {getTabName(tab)}
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          {messageCount}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span>{formatTime(tab.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => onCloseTab(tab.id, e)}
                    className={`
                      opacity-0 group-hover:opacity-100 transition-all duration-200 
                      p-1.5 rounded-md hover:bg-gray-600/70 active:scale-95 flex-shrink-0
                      ${isActive ? 'opacity-100' : ''}
                    `}
                    aria-label="Tab schließen"
                  >
                    <svg className="w-4 h-4 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TabsSidebar;

