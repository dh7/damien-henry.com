'use client';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatConversationProps {
  messages: Message[];
}

export default function ChatConversation({ messages }: ChatConversationProps) {
  return (
    <div className="flex-1 overflow-y-auto space-y-6" style={{ fontFamily: 'monospace', fontSize: '14px', padding: '16px' }}>
      {messages.map((message) => (
        <div key={message.id} className="flex items-start gap-2">
          <span className={`flex-shrink-0 ${
            message.role === 'user' 
              ? 'text-gray-700 dark:text-white font-bold' 
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {message.role === 'user' ? '<' : '>'}
          </span>
          <div className={`flex-1 whitespace-pre-wrap break-words ${
            message.role === 'user' 
              ? 'text-gray-700 dark:text-white font-bold' 
              : 'text-gray-600 dark:text-gray-300'
          }`}>
            {message.content}
          </div>
        </div>
      ))}
    </div>
  );
}
