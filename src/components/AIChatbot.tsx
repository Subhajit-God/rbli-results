import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Trash2, Sparkles, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIChat, ChatMessage } from '@/hooks/useAIChat';
import ReactMarkdown from 'react-markdown';

interface StudentData {
  name: string;
  classNumber: number;
  section: string;
  rollNumber: number;
  examName: string;
  marks: Array<{
    subject: string;
    total: number;
    fullTotal: number;
    percentage: number;
  }>;
  summary: {
    grandTotal: number;
    fullMarks: number;
    percentage: number;
    grade: string;
    isPassed: boolean;
    rank: number;
  };
}

interface AIChatbotProps {
  studentData?: StudentData;
}

const AIChatbot = ({ studentData }: AIChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, error, sendMessage, clearChat } = useAIChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput('');
    await sendMessage(message, studentData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = studentData ? [
    "How can I improve my performance?",
    "Which subjects need more attention?",
    "Give me study tips",
  ] : [
    "How do I check my result?",
    "What is my Student ID format?",
    "What are the passing marks?",
  ];

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg transition-all duration-300 ${
          isOpen ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90 animate-pulse'
        }`}
        size="icon"
        aria-label={isOpen ? 'Close chat' : 'Open AI assistant'}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-36 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-background shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground">AI Assistant</h3>
                <p className="text-xs text-primary-foreground/80">Ask me anything about results</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="h-8 w-8 text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages Area */}
          <ScrollArea className="h-[350px] p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h4 className="font-medium text-foreground mb-2">Hello! I'm here to help 👋</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {studentData 
                    ? "I can analyze your performance and give personalized tips!" 
                    : "Ask me about checking results, understanding marks, or anything else!"}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-1.5 px-3"
                      onClick={() => {
                        setInput(q);
                        inputRef.current?.focus();
                      }}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <MessageBubble key={i} message={msg} />
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="rounded-2xl rounded-tl-none bg-muted px-4 py-2">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Error Display */}
          {error && (
            <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 border-t border-destructive/20">
              {error}
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
        isUser ? 'bg-primary' : 'bg-primary/10'
      }`}>
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
        isUser 
          ? 'rounded-tr-none bg-primary text-primary-foreground' 
          : 'rounded-tl-none bg-muted text-foreground'
      }`}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                code: ({ children }) => <code className="bg-background/50 px-1 rounded text-xs">{children}</code>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChatbot;
