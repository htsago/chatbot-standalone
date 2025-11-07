
import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inputRef.current) {
        inputRef.current.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 shadow-2xl">
      <div className="flex justify-center items-center py-8 md:py-9 px-6 md:px-8">
        <div className="relative w-full max-w-4xl">
          <div className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isLoading ? "AI is thinking..." : "How can I assist you today?"}
            disabled={isLoading}
            className="w-full bg-gray-700/80 text-white border-2 border-gray-600 py-5 md:py-6 pl-16 pr-20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-gray-700 transition-all shadow-lg hover:shadow-xl placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-base leading-relaxed"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-teal-600 text-white p-3 rounded-xl hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 shadow-lg hover:shadow-xl disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            aria-label="Send message"
            title="Nachricht senden"
            style={{ transform: 'translateY(-50%)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: 'none' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
};

export default MessageInput;
