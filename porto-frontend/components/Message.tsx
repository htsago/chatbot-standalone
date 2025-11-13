import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { BotIcon } from './icons';
import { type Message as MessageType } from '../types';

const getModelLabel = (value: string | undefined): string => {
  if (!value) return '';
  const modelMap: Record<string, string> = {
    'qwen/qwen3-32b': 'Qwen 3 32B',
    'meta-llama/llama-4-maverick-17b-128e-instruct': 'Llama 4 Maverick 17B',
    'meta-llama/llama-4-scout-17b-16e-instruct': 'Llama 4 Scout 17B',
    'moonshotai/kimi-k2-instruct-0905': 'Kimi K2',
    'openai/gpt-oss-120b': 'GPT-OSS 120B',
    'openai/gpt-oss-20b': 'GPT-OSS 20B',
    'llama-3.1-8b-instant': 'Llama 3.1 8B Instant',
    'llama-3.3-70b-versatile': 'Llama 3.3 70B',
  };
  return modelMap[value] || value;
};

interface MessageProps {
  message: MessageType & {
    timestamp?: Date;
    isStreaming?: boolean;
  };
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const [isToolCallsExpanded, setIsToolCallsExpanded] = useState(false);
  const codeBlockCounter = useRef(0);
  const isUser = message.role === 'user';
  const isBot = message.role === 'model';

  return (
    <div className={`flex gap-4 group mb-4 justify-center`}>
      <div className={`flex-1 max-w-3xl`}>
        <div className={`relative group/message`}>
          <div className={`inline-block max-w-full px-5 md:px-6 py-4 md:py-5 rounded-xl transition-all bg-gradient-to-br from-gray-800/90 to-gray-900/90 ${isUser ? 'text-teal-100' : 'text-gray-100'} border border-gray-700/50 shadow-lg hover:shadow-xl hover:border-gray-600/50 backdrop-blur-sm ${isUser ? 'ml-auto mr-8 md:mr-12' : 'mr-auto'}`}>
          {message.isStreaming && (
            <div className={`flex items-center gap-1.5 mb-2`}>
              <span className="inline-block w-2 h-2 bg-teal-400 rounded-full animate-pulse"></span>
              <span className="inline-block w-2 h-2 bg-teal-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
              <span className="inline-block w-2 h-2 bg-teal-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
            </div>
          )}
          
          {message.text ? (
            <div className={`prose prose-invert max-w-none prose-sm text-left`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  p({ node, children, ...props }: any) {
                    return <p className={`my-2.5 leading-relaxed ${isUser ? 'text-teal-100' : 'text-gray-100'}`} {...props}>{children}</p>;
                  },
                  h1({ node, children, ...props }: any) {
                    return <h1 className={`text-xl font-medium mt-5 mb-3 ${isUser ? 'text-teal-50' : 'text-white'}`} {...props}>{children}</h1>;
                  },
                  h2({ node, children, ...props }: any) {
                    return <h2 className={`text-lg font-medium mt-4 mb-2.5 ${isUser ? 'text-teal-50' : 'text-white'}`} {...props}>{children}</h2>;
                  },
                  h3({ node, children, ...props }: any) {
                    return <h3 className={`text-base font-medium mt-3.5 mb-2 ${isUser ? 'text-teal-50' : 'text-white'}`} {...props}>{children}</h3>;
                  },
                  h4({ node, children, ...props }: any) {
                    return <h4 className={`text-sm font-medium mt-3 mb-1.5 ${isUser ? 'text-teal-50' : 'text-white'}`} {...props}>{children}</h4>;
                  },
                  h5({ node, children, ...props }: any) {
                    return <h5 className={`text-sm font-normal mt-2.5 mb-1 ${isUser ? 'text-teal-50' : 'text-white'}`} {...props}>{children}</h5>;
                  },
                  h6({ node, children, ...props }: any) {
                    return <h6 className={`text-xs font-normal mt-2 mb-1 ${isUser ? 'text-teal-50' : 'text-white'}`} {...props}>{children}</h6>;
                  },
                  ul({ node, children, ...props }: any) {
                    return (
                      <ul 
                        className="list-disc list-inside my-3 space-y-2 ml-4"
                        style={{ listStyleType: 'disc' }}
                        {...props}
                      >
                        {children}
                      </ul>
                    );
                  },
                  ol({ node, children, ...props }: any) {
                    return (
                      <ol 
                        className="list-decimal list-inside my-3 space-y-2 ml-4"
                        style={{ listStyleType: 'decimal' }}
                        {...props}
                      >
                        {children}
                      </ol>
                    );
                  },
                  li({ node, children, ...props }: any) {
                    const hasCheckbox = React.Children.toArray(children).some((child: any) => 
                      child?.props?.type === 'checkbox'
                    );
                    
                    return (
                      <li className={`leading-relaxed ${hasCheckbox ? 'list-none flex items-start' : ''}`} {...props}>
                        {children}
                      </li>
                    );
                  },
                  input({ node, checked, ...props }: any) {
                    // Handle task list checkboxes
                    if (props.type === 'checkbox') {
                      return (
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled
                          className="mr-2 accent-teal-500 cursor-not-allowed"
                          {...props}
                        />
                      );
                    }
                    return <input {...props} />;
                  },
                  blockquote({ node, children, ...props }: any) {
                    return <blockquote className={`border-l-4 border-teal-500 pl-4 my-4 italic ${isUser ? 'text-teal-200' : 'text-gray-300'} bg-gray-800/30 py-2 rounded-r`} {...props}>{children}</blockquote>;
                  },
                  hr({ node, ...props }: any) {
                    return <hr className="my-6 border-gray-600" {...props} />;
                  },
                  a({ node, href, children, ...props }: any) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors"
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  },
                  strong({ node, children, ...props }: any) {
                    return <strong className={`font-medium ${isUser ? 'text-teal-300' : 'text-teal-300'}`} {...props}>{children}</strong>;
                  },
                  em({ node, children, ...props }: any) {
                    return <em className={`italic ${isUser ? 'text-teal-200' : 'text-gray-300'}`} {...props}>{children}</em>;
                  },
                  del({ node, children, ...props }: any) {
                    return <del className="line-through text-gray-500" {...props}>{children}</del>;
                  },
                  pre({ node, children, ...props }: any) {
                    return <pre className="bg-gray-900/60 p-4 rounded-lg overflow-x-auto my-4 border border-gray-700/30" {...props}>{children}</pre>;
                  },
                  img({ node, src, alt, ...props }: any) {
                    return (
                      <img
                        src={src}
                        alt={alt}
                        className="my-4 rounded-lg max-w-full h-auto shadow-lg border border-gray-700/50"
                        {...props}
                      />
                    );
                  },
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    const codeIndex = `code-${codeBlockCounter.current++}`;
                    
                    if (!inline && (match || codeString.includes('\n'))) {
                      return (
                        <div className="relative group/code my-4">
                          {match && (
                            <div className="absolute top-2 left-2 z-10">
                              <span className="px-2 py-1 bg-gray-800/90 border border-gray-600/50 rounded text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">
                                {match[1]}
                              </span>
                            </div>
                          )}
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match ? match[1] : 'text'}
                            PreTag="div"
                            customStyle={{
                              margin: '0',
                              borderRadius: '0.5rem',
                              padding: '2.5rem 1rem 1rem 1rem',
                              fontSize: '0.875rem',
                              lineHeight: '1.6',
                              background: 'rgba(0, 0, 0, 0.5)',
                              border: '1px solid rgba(75, 85, 99, 0.4)',
                              overflowX: 'auto',
                            }}
                            codeTagProps={{
                              style: {
                                fontFamily: 'source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace',
                                fontSize: 'inherit',
                              }
                            }}
                            showLineNumbers={codeString.split('\n').length > 5}
                            lineNumberStyle={{
                              minWidth: '3em',
                              paddingRight: '1em',
                              color: 'rgba(156, 163, 175, 0.5)',
                              userSelect: 'none',
                            }}
                            {...props}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }
                    return (
                      <code className={`${className || ''} bg-gray-900/60 px-1.5 py-0.5 rounded text-sm font-mono text-teal-300 border border-gray-700/30`} {...props}>
                        {children}
                      </code>
                    );
                  },
                  table({ node, ...props }: any) {
                    return (
                      <div className="overflow-x-auto my-4 rounded-lg border border-gray-700/50 shadow-lg">
                        <table className="min-w-full divide-y divide-gray-700/50" {...props} />
                      </div>
                    );
                  },
                  thead({ node, ...props }: any) {
                    return <thead className="bg-gray-800/70" {...props} />;
                  },
                  tbody({ node, ...props }: any) {
                    return <tbody className="divide-y divide-gray-700/50 bg-gray-800/30" {...props} />;
                  },
                  tr({ node, ...props }: any) {
                    return <tr className="hover:bg-gray-700/30 transition-colors" {...props} />;
                  },
                  th({ node, ...props }: any) {
                    return <th className="px-4 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider border-b border-gray-600" {...props} />;
                  },
                  td({ node, ...props }: any) {
                    return <td className="px-4 py-3 text-sm text-gray-300 border-b border-gray-600/50" {...props} />;
                  },
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></span>
                <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
              </div>
              <span className="italic">Thinking...</span>
            </div>
          )}
          </div>
        </div>
        
        {isBot && message.toolCalls !== undefined && (
          <div className={`mt-3 flex justify-center`}>
            <div className={`w-full max-w-3xl bg-gradient-to-br from-gray-700/80 to-gray-800/80 border border-gray-600/50 px-5 md:px-6 py-3.5 md:py-4 rounded-xl shadow-lg backdrop-blur-sm hover:border-gray-500/50 transition-colors`}>
              <button
                onClick={() => setIsToolCallsExpanded(!isToolCallsExpanded)}
                className="w-full flex items-center justify-between group py-1.5 hover:bg-gray-600/30 active:bg-gray-600/40 rounded-lg px-1 -mx-1 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                aria-label={isToolCallsExpanded ? "Tool Calls ausblenden" : "Tool Calls einblenden"}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-300 group-hover:text-gray-200 transition-colors">
                    {message.toolCalls && message.toolCalls.length > 0 
                      ? `${message.toolCalls.length} ${message.toolCalls.length === 1 ? 'Tool Call' : 'Tool Calls'}`
                      : '0 Tool Calls'}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 group-hover:text-gray-300 transition-all duration-200 ${isToolCallsExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isToolCallsExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-600/50 space-y-4 animate-fade-in">
                  {message.toolCalls && message.toolCalls.length > 0 ? (
                    message.toolCalls.map((toolCall, index) => {
                      const links = toolCall.args?.links;
                      const hasLinks = Array.isArray(links) && links.length > 0;
                      
                      return (
                        <div key={index} className={`bg-gray-800/40 p-3.5 rounded-lg border border-gray-700/50 shadow-sm animate-slide-up`} style={{ animationDelay: `${index * 50}ms` }}>
                          <div className="flex items-center gap-2.5 mb-2.5">
                            <div className="w-1 h-1 bg-teal-400"></div>
                            <span className="text-sm font-mono font-medium text-teal-400">
                              {toolCall.name}
                            </span>
                          </div>
                          
                          {toolCall.schema?.description && (
                            <div className="mb-2">
                              <div className="text-xs text-gray-400">
                                {toolCall.schema.description}
                              </div>
                            </div>
                          )}
                          
                          {/* Display links if available */}
                          {hasLinks && (
                            <div className="mt-3 mb-3">
                              <div className="text-sm text-gray-400 mb-2.5 font-medium flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Quellen
                              </div>
                              <div className="space-y-2.5">
                                {links.map((link: any, linkIndex: number) => (
                                  <a
                                    key={linkIndex}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block bg-gray-900/60 hover:bg-gray-900/80 active:bg-gray-900 p-2.5 border border-gray-700/30 rounded-lg transition-all duration-200 group shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                  >
                                    <div className="flex items-start gap-2">
                                      <svg
                                        className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0 group-hover:text-teal-300 transition-colors"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                        />
                                      </svg>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm text-teal-300 group-hover:text-teal-200 font-normal truncate">
                                          {link.title || link.url}
                                        </div>
                                        <div className="text-xs text-gray-400 truncate mt-0.5">
                                          {link.url}
                                        </div>
                                      </div>
                                      <svg
                                        className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0 group-hover:text-gray-400 transition-colors"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                        />
                                      </svg>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Display parameters in a structured way */}
                          {toolCall.args && Object.keys(toolCall.args).filter(key => key !== 'links').length > 0 && (
                            <div className={`mt-2.5 bg-gray-900/60 p-3.5 border border-gray-700/30 rounded-lg ${hasLinks ? 'border-t-0' : ''}`}>
                              <div className="text-sm text-gray-400 mb-2.5 font-medium flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Parameter
                              </div>
                              <div className="space-y-2">
                                {Object.entries(toolCall.args)
                                  .filter(([key]) => key !== 'links')
                                  .map(([key, value]) => {
                                    const valueType = typeof value;
                                    const isString = valueType === 'string';
                                    const isObject = valueType === 'object' && value !== null && !Array.isArray(value);
                                    const isArray = Array.isArray(value);
                                    const paramSchema = toolCall.schema?.parameters?.[key];
                                    const isRequired = toolCall.schema?.required?.includes(key);
                                    
                                    return (
                                      <div key={key} className="flex gap-3 text-sm p-2 bg-gray-800/40 rounded-lg border border-gray-700/20">
                                        <div className="flex-shrink-0">
                                          <span className="text-teal-300/90 font-mono font-medium">
                                            {key}
                                            {isRequired && <span className="text-red-400 ml-1">*</span>}:
                                          </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          {isString ? (
                                            <span className="text-gray-200 break-words">
                                              <span className="text-gray-400">"</span>
                                              {String(value)}
                                              <span className="text-gray-400">"</span>
                                            </span>
                                          ) : isObject ? (
                                            <pre className="text-gray-200 font-mono whitespace-pre-wrap break-words">
                                              {JSON.stringify(value, null, 2)}
                                            </pre>
                                          ) : isArray ? (
                                            <div className="text-gray-200">
                                              <span className="text-gray-400">[</span>
                                              <span className="ml-2">
                                                {value.map((item: any, idx: number) => (
                                                  <span key={idx}>
                                                    {typeof item === 'string' ? `"${item}"` : JSON.stringify(item)}
                                                    {idx < value.length - 1 && <span className="text-gray-400">, </span>}
                                                  </span>
                                                ))}
                                              </span>
                                              <span className="text-gray-400">]</span>
                                            </div>
                                          ) : (
                                            <span className="text-gray-200">
                                              {value === null ? (
                                                <span className="text-gray-500 italic">null</span>
                                              ) : (
                                                String(value)
                                              )}
                                            </span>
                                          )}
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-gray-500 text-[10px]">
                                              ({valueType === 'object' && value === null ? 'null' : valueType}
                                              {paramSchema?.type && `, expected: ${paramSchema.type}`})
                                            </span>
                                            {paramSchema?.description && (
                                              <span className="text-gray-500 text-[10px] italic">
                                                - {paramSchema.description}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-gray-400 italic">Keine Tool Calls</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {isBot && message.model && (
          <div className="mt-2 flex justify-center">
            <div className="max-w-3xl w-full">
              <p className="text-xs text-gray-500 italic text-left">
                {getModelLabel(message.model)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
                                                                                                                                                                                                                                