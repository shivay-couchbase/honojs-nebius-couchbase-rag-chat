import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Rocket, Star, Moon } from 'lucide-react';
import { createRoot } from "react-dom/client";
import ReactMarkdown from 'react-markdown';
import "./styles.css";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([{
    id: 1,
    role: "assistant",
    content: "Greetings, explorer! I'm your AI guide about Star Wars. How can I assist you in your journey through space?"
  }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now(), role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) throw new Error("Network error");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      const assistantMessageId = Date.now() + 1;
      setMessages(prev => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

      let imageUrl: string | undefined;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        
        // Check if the text contains an image URL marker
        if (text.includes('!IMAGE_URL!')) {
          const imageUrlMatch = text.match(/!IMAGE_URL!(.*?)!IMAGE_URL!/);
          if (imageUrlMatch && imageUrlMatch[1]) {
            imageUrl = imageUrlMatch[1];
            
            // Update the message with the image URL
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, imageUrl: imageUrl }
                : msg
            ));
            
            // Remove the image URL marker from the content
            const cleanedText = text.replace(/!IMAGE_URL!(.*?)!IMAGE_URL!\n\n/, '');
            
            // Update the message content
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: msg.content + cleanedText }
                : msg
            ));
          }
        } else {
          // Regular text update
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: msg.content + text }
              : msg
          ));
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        content: "Sorry, there was an error processing your request."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key to submit, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) form.requestSubmit();
    }
  };

  // Generate random space objects for background
  const spaceObjects = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    type: i % 3 === 0 ? 'star' : i % 3 === 1 ? 'planet' : 'rocket',
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: `${Math.random() * 1.5 + 0.5}rem`,
    delay: `${Math.random() * 5}s`,
    duration: `${Math.random() * 10 + 10}s`
  }));

  return (
    <div className="cosmic-container">
      {/* Space background with stars */}
      <div className="space-background">
        {spaceObjects.map((obj) => (
          <div 
            key={obj.id}
            className={`space-object ${obj.type}`}
            style={{
              top: obj.top,
              left: obj.left,
              fontSize: obj.size,
              animationDelay: obj.delay,
              animationDuration: obj.duration
            }}
          >
            {obj.type === 'star' ? (
              <Star className="twinkle" />
            ) : obj.type === 'planet' ? (
              <Moon className="orbit" />
            ) : (
              <Rocket className="float" />
            )}
          </div>
        ))}
      </div>

      <div className="chat-container">
        <div className="chat-header">
          <div className="logo-container">
            <Rocket size={24} className="rocket-icon" />
            <h2>Starwars Planets AI Guide</h2>
          </div>
          <div className="powered-by">
            <span className="pulse-dot"></span>
            Powered by Nebius AI
          </div>
        </div>
        
        <div className="messages-container">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.role}`}>
              <div className={`message ${msg.role}`}>
                <div className={`message-icon ${msg.role}`}>
                  {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                </div>
                <div className="message-content">
                  {msg.role === 'assistant' && msg.imageUrl && (
                    <div className="message-image">
                      <img src={msg.imageUrl} alt="Generated illustration" />
                    </div>
                  )}
                  {msg.role === 'assistant' ? (
                    <div className="markdown-content">
                      <ReactMarkdown>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="loading-indicator">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-container">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the Starwars Planets..."
              className="message-input"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="send-button"
              aria-label="Send message"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="input-hint">Press Enter to send, Shift+Enter for new line</div>
        </form>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="app-container">
      <Chat />
    </div>
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const domNode = document.getElementById("root");
  if (!domNode) {
    throw new Error("Failed to find the root element");
  }
  const root = createRoot(domNode);
  root.render(<App />);
});
