import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from '@/components/ui/sonner';
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatbotProps {
  summary: string;
  references?: string[];
  keywords?: string[];
  onSummaryUpdate: (newSummary: string) => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ 
  summary, 
  references = [], 
  keywords = [],
  onSummaryUpdate
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'system', content: 'Hi! I can help you update or customize the summary. What would you like me to do?' }
  ]);
  const [currentSummary, setCurrentSummary] = useState(summary);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() === '') return;
    
    // Update chat history with user message
    const userMessage = { role: 'user' as const, content: inputMessage };
    setChatHistory(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: currentSummary,
          user_message: inputMessage,
          chat_history: chatHistory.filter(msg => msg.role !== 'system'),
          references: references,
          keywords: keywords
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // First update the summary if available
        let summaryWasUpdated = false;
        
        if (data.refined_summary && data.refined_summary !== currentSummary) {
          setCurrentSummary(data.refined_summary);
          onSummaryUpdate(data.refined_summary);
          summaryWasUpdated = true;
        }
        
        // Always add the assistant's explanation to the chat history
        if (data.chat_history && data.chat_history.length > 0) {
          const latestMessage = data.chat_history[data.chat_history.length - 1];
          if (latestMessage.role === 'assistant') {
            // If the summary was updated, add a notification message first
            if (summaryWasUpdated) {
              setChatHistory(prev => [
                ...prev, 
                {
                  role: 'system',
                  content: '✅ The summary has been updated. Switch to the Summary tab to view the changes.'
                },
                latestMessage
              ]);
              
              // Show a toast notification
              toast.success('Summary has been updated successfully!');
            } else {
              // Just add the assistant message if no summary update
              setChatHistory(prev => [...prev, latestMessage]);
            }
          }
        }
      } else {
        // Handle error
        toast.error(data.error || 'Failed to get a response');
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.'
        }]);
      }
    } catch (error) {
      console.error('Error communicating with chatbot API:', error);
      toast.error('Failed to connect to the chatbot service');
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was a problem connecting to the server. Please try again later.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Render message bubbles with appropriate styling
  const renderMessages = () => {
    return chatHistory.map((message, index) => {
      // Format system notifications differently
      if (message.role === 'system') {
        // Always show the first message as a welcome message
        if (index === 0) {
          return (
            <div key={index} className="flex justify-start mb-4">
              <div className="flex items-start max-w-3/4">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="py-2 px-3 rounded-lg bg-gray-100 text-gray-800">
                  {message.content}
                </div>
              </div>
            </div>
          );
        } 
        // For notification messages (after index 0)
        else if (message.content.includes('summary has been updated') || message.content.includes('Switch to the Summary tab')) {
          return (
            <div key={index} className="flex justify-center mb-4">
              <div className="py-2 px-4 rounded-lg bg-green-100 text-green-800 border border-green-300 text-center">
                {message.content}
              </div>
            </div>
          );
        }
        // Skip other system messages
        return null;
      }
      
      return (
        <div 
          key={index} 
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
        >
          <div className="flex items-start max-w-3/4">
            {message.role !== 'user' && (
              <Avatar className="h-8 w-8 mr-2">
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            )}
            
            <div className={`
              py-2 px-3 rounded-lg
              ${message.role === 'user' 
                ? 'bg-blue-500 text-white ml-2' 
                : 'bg-gray-100 text-gray-800'}
            `}>
              {message.content}
            </div>
            
            {message.role === 'user' && (
              <Avatar className="h-8 w-8 ml-2">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <Card className="w-full border shadow-md">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center justify-between text-base">
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-0 m-0 h-auto text-sm font-medium text-indigo-600 hover:text-indigo-800"
            onClick={() => {
              setChatHistory([
                { role: 'system', content: 'Hi! I can help you update or customize the summary. What would you like me to do?' }
              ]);
              setCurrentSummary(summary); // Reset to original summary
              onSummaryUpdate(summary);
            }}
          >
            Reset Chat
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ScrollArea className="h-[350px] pr-4">
          <div className="flex flex-col">
            {renderMessages()}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your request here..."
            disabled={isLoading}
            className="flex-grow"
          />
          <Button type="submit" disabled={isLoading || inputMessage.trim() === ''}>
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default Chatbot;
