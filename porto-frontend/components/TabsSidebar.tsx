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
  return (
    <div className="w-full md:w-[420px] h-full bg-gray-800/95 md:bg-gray-800/50 backdrop-blur-sm border-r border-gray-700 overflow-y-auto overflow-x-hidden shadow-xl md:shadow-none">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Chat Tabs</h2>
            </div>
            {/* Close button for mobile */}
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-2 rounded-lg hover:bg-gray-700/60 active:scale-95 transition-all duration-150"
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
            className="w-full px-5 py-3 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800 text-sm font-semibold"
            aria-label="Neuer Tab"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neuer Tab
          </button>
        </div>

        <div className="space-y-3">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                activeTabId === tab.id
                  ? 'bg-teal-600/20 border-2 border-teal-500/50 shadow-lg shadow-teal-500/10'
                  : 'bg-gray-800/60 border-2 border-transparent hover:bg-gray-800/80 hover:border-gray-700/50 hover:shadow-md'
              }`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate mb-2 leading-tight">
                    {getTabName(tab)}
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{tab.messages.length - 1} {tab.messages.length - 1 === 1 ? 'Nachricht' : 'Nachrichten'}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => onCloseTab(tab.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-all duration-150 p-2 rounded-lg hover:bg-gray-700/60 active:scale-95 flex-shrink-0"
                  aria-label="Tab schließen"
                >
                  <svg className="w-4 h-4 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {activeTabId === tab.id && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-teal-500 rounded-r-lg shadow-sm"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TabsSidebar;

