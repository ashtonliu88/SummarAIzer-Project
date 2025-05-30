// src/components/FloatingChatbot.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from '@/components/ui/sonner';
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, MessageCircle, ArrowRight, InfoIcon, Pencil } from "lucide-react";

// Add global CSS for the pulse animation
const pulseStyle = `
@keyframes gentle-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4);
    transform: scale(0.95);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(79, 70, 229, 0);
    transform: scale(1);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0);
    transform: scale(0.95);
  }
}
`;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface FloatingChatbotProps {
  summary: string;
  references?: string[];
  keywords?: string[];
  onSummaryUpdate: (newSummary: string) => void;
}

const FloatingChatbot: React.FC<FloatingChatbotProps> = ({ 
  summary, 
  references = [], 
  keywords = [],
  onSummaryUpdate
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'system', content: 'Hi! I can help you answer questions about the summary or update it. What would you like to do?' }
  ]);
  const [currentSummary, setCurrentSummary] = useState(summary);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'question' | 'update'>('question'); // Default mode is question-answering
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Add the pulse animation style to the document
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = pulseStyle;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);
  
  // Update current summary when prop changes
  useEffect(() => {
    setCurrentSummary(summary);
  }, [summary]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() === '') return;
    
    // Update chat history with user message
    const userMessage = { role: 'user' as const, content: inputMessage };
    setChatHistory(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      // Detect if user is explicitly requesting to update the summary
      const updateKeywords = ['update', 'modify', 'change', 'refine', 'revise', 'rewrite', 'edit', 'alter'];
      const isUpdateRequest = updateKeywords.some(keyword => 
        inputMessage.toLowerCase().includes(`${keyword} the summary`) || 
        inputMessage.toLowerCase().includes(`${keyword} summary`) ||
        inputMessage.toLowerCase().startsWith(keyword)
      );
      
      // Set the mode based on the user's request
      const currentMode = isUpdateRequest || mode === 'update' ? 'update' : 'question';
      
      // Use the appropriate endpoint based on the mode
      const endpoint = currentMode === 'update' ? 'chat' : 'answer-question';
      
      // Prepare the request parameters based on the mode
      const requestBody = {
        summary: currentSummary,
        chat_history: chatHistory.filter(msg => msg.role !== 'system'),
        references: references,
        keywords: keywords
      };
      
      // Add the specific parameter for each endpoint
      if (currentMode === 'update') {
        Object.assign(requestBody, { user_message: inputMessage });
      } else {
        Object.assign(requestBody, { user_question: inputMessage });
      }
      
      const response = await fetch(`http://127.0.0.1:8000/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // First update the summary if available (only in update mode)
        let summaryWasUpdated = false;
        
        if (currentMode === 'update' && data.refined_summary && data.refined_summary !== currentSummary) {
          setCurrentSummary(data.refined_summary);
          onSummaryUpdate(data.refined_summary);
          summaryWasUpdated = true;
        }
        
        // Always add the assistant's explanation to the chat history
        if (data.chat_history && data.chat_history.length > 0) {
          const latestMessage = data.chat_history[data.chat_history.length - 1];
          if (latestMessage.role === 'assistant') {
            // If the summary was updated, add a notification message first and create a simplified assistant message
            if (summaryWasUpdated) {
              const simplifiedMessage = {
                role: 'assistant' as const,
                content: 'New summary has been generated. You can view the updated summary in the main content area.'
              };
              
              setChatHistory(prev => [
                ...prev, 
                {
                  role: 'system',
                  content: '✅ New summary has been generated!'
                },
                simplifiedMessage
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

  // Toggle the chat window open/closed
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Reset the chat
  const resetChat = () => {
    setChatHistory([
      { role: 'system', content: 'Hi! I can help you answer questions about the summary or update it. What would you like to do?' }
    ]);
    setCurrentSummary(summary); // Reset to original summary
    onSummaryUpdate(summary);
    setMode('question'); // Reset to question mode
  };
  
  // Switch mode between question answering and summary updating
  const switchMode = (newMode: 'question' | 'update') => {
    if (mode !== newMode) {
      setMode(newMode);
      
      // Add a system message indicating the mode change
      const modeMessage = newMode === 'question' 
        ? 'Switched to question-answering mode. Ask me anything about the summary!' 
        : 'Switched to summary update mode. Let me know how you\'d like to modify the summary.';
      
      setChatHistory(prev => [...prev, { role: 'system', content: modeMessage }]);
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
            <div key={index} className="flex justify-start mb-3">
              <div className="flex items-start max-w-3/4">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="py-1 px-2 rounded-lg bg-gray-100 text-gray-800 text-sm">
                  {message.content}
                </div>
              </div>
            </div>
          );
        } 
        // For notification messages (after index 0)
        else if (message.content.includes('summary has been updated') || message.content.includes('✅')) {
          return (
            <div key={index} className="flex justify-center mb-2">
              <div className="py-1 px-2 rounded-md bg-green-100 text-green-800 border border-green-200 text-center text-xs">
                {message.content}
              </div>
            </div>
          );
        }
        // For mode switch messages
        else if (message.content.includes('Switched to')) {
          return (
            <div key={index} className="flex justify-center mb-2">
              <div className="py-1 px-2 rounded-md bg-blue-50 text-blue-800 border border-blue-100 text-center text-xs">
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
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}
        >
          <div className="flex items-start max-w-[85%]">
            {message.role !== 'user' && (
              <Avatar className="h-6 w-6 mr-1 flex-shrink-0">
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            )}
            
            <div className={`
              py-1 px-2 rounded-lg text-sm
              ${message.role === 'user' 
                ? 'bg-blue-500 text-white ml-1' 
                : 'bg-gray-100 text-gray-800'}
            `}>
              {message.content}
            </div>
            
            {message.role === 'user' && (
              <Avatar className="h-6 w-6 ml-1 flex-shrink-0">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    // Use fixed with higher z-index and explicit bottom/left positioning
    <div style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 9999 }}>
      {isOpen ? (
        <Card className="w-80 md:w-96 shadow-xl border border-gray-300 rounded-xl">
          <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center">
              <MessageCircle size={16} className="mr-2" />
              Summary Assistant
            </CardTitle>
            <div className="flex gap-1">
              {/* Mode toggle buttons */}
              <Button 
                variant={mode === 'question' ? "secondary" : "ghost"}
                size="sm" 
                className="h-6 text-xs px-2 flex items-center gap-1"
                onClick={() => switchMode('question')}
                title="Question answering mode"
              >
                <InfoIcon size={12} />
                <span className="hidden sm:inline">Q&A</span>
              </Button>
              <Button 
                variant={mode === 'update' ? "secondary" : "ghost"}
                size="sm" 
                className="h-6 text-xs px-2 flex items-center gap-1"
                onClick={() => switchMode('update')}
                title="Summary update mode"
              >
                <Pencil size={12} />
                <span className="hidden sm:inline">Update</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-gray-500 hover:text-gray-700"
                onClick={resetChat}
                title="Reset conversation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-gray-500 hover:text-gray-700"
                onClick={toggleChat}
              >
                <X size={16} />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 px-3">
            <ScrollArea className="h-60 pr-2">
              <div className="flex flex-col py-1">
                {renderMessages()}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
          
          <CardFooter className="px-3 py-2">
            <form onSubmit={handleSubmit} className="flex w-full gap-1">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={mode === 'question' ? "Ask a question about the summary..." : "How would you like to update the summary?"}
                disabled={isLoading}
                className="flex-grow text-sm h-8"
              />
              <Button type="submit" size="sm" className="h-8 px-2" disabled={isLoading || inputMessage.trim() === ''}>
                {isLoading ? '...' : <ArrowRight size={16} />}
              </Button>
            </form>
          </CardFooter>
        </Card>
      ) : (
        <Button
          onClick={toggleChat}
          className="rounded-full h-14 w-14 bg-indigo-600 hover:bg-indigo-700 shadow-xl flex items-center justify-center"
          style={{ 
            animation: 'gentle-pulse 2s infinite',
            boxShadow: '0 4px 20px rgba(79, 70, 229, 0.4)'
          }}
        >
          <MessageCircle size={24} />
        </Button>
      )}
    </div>
  );
};

export default FloatingChatbot;
