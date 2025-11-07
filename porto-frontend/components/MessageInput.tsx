
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

  // Scroll input into view on focus (for mobile devices)
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleFocus = () => {
      // Small delay to ensure keyboard is shown
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    };

    const handleBlur = () => {
      // Optional: scroll back after blur
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    };

    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);

    return () => {
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
    };
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
    <form onSubmit={handleSubmit} className="bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 shadow-xl">
      <div className="flex justify-center items-center py-6 md:py-7 px-6 md:px-8">
        <div className="relative w-full max-w-4xl">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="w-full bg-gray-700/80 text-white border border-gray-600 py-4 md:py-4.5 pl-14 pr-18 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-gray-700 transition-all shadow-md hover:shadow-lg placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm leading-relaxed"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-teal-600 text-white p-2.5 rounded-lg hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 shadow-md hover:shadow-lg disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            aria-label="Send message"
            title="Nachricht senden"
            style={{ transform: 'translateY(-50%)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: 'none' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
};

export default MessageInput;
