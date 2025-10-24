'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Breadcrumb from './Breadcrumb';
import ChatBubble from './ChatBubble';
import STMEditor from './STMEditor';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [showDebug, setShowDebug] = useState(false);
  const [chatWidth, setChatWidth] = useState(33.33); // Start at 1/3 (33.33%)
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Pages where chat should be hidden
  const hideChatPages = ['/usage'];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Shift+D (Mac) or Ctrl+Shift+D (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebug(prev => !prev);
      }
      // Close with Escape
      if (e.key === 'Escape' && showDebug) {
        setShowDebug(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDebug]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      
      // Calculate chat width as percentage (inverted since chat is on right)
      const newChatWidth = ((containerWidth - mouseX) / containerWidth) * 100;
      
      // Constrain between 20% and 60%
      const constrainedWidth = Math.min(Math.max(newChatWidth, 20), 60);
      setChatWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const contentWidth = 100 - chatWidth;

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Breadcrumb at the top */}
      <div style={{ flexShrink: 0 }}>
        <Breadcrumb />
      </div>
      
      {/* Main content area with content and chat side by side */}
      <div 
        ref={containerRef}
        style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', position: 'relative' }} 
        className="main-content-bg"
      >
        {/* Main content on the left - flexible width with independent scroll */}
        <div className="content-area" style={{ width: hideChatPages.includes(router.pathname) ? '100%' : `${contentWidth}%`, overflowY: 'auto', flexShrink: 0 }}>
          {children}
        </div>
        
        {/* Resizable divider - only show when chat is visible */}
        {!hideChatPages.includes(router.pathname) && (
          <div
            onMouseDown={handleMouseDown}
            className="resize-divider desktop-only"
            style={{
              width: '8px',
              flexShrink: 0,
              cursor: 'col-resize',
              position: 'relative',
              zIndex: 10,
            }}
          >
            <div 
              className="resize-handle"
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: '2px',
                transform: 'translateX(-50%)',
                backgroundColor: 'transparent',
                transition: 'background-color 0.2s ease',
              }}
            />
          </div>
        )}
        
        {/* Unified Chat - desktop side panel OR mobile bubble - hide on certain pages */}
        {!hideChatPages.includes(router.pathname) && <ChatBubble chatWidth={chatWidth} />}
      </div>

      {/* Debug Popup for MindCache STM */}
      {showDebug && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setShowDebug(false)}
        >
          <div 
            className="bg-black border-2 border-green-400 rounded-lg p-6 w-[90vw] h-[90vh] max-w-6xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-green-300 font-mono text-xl">MindCache STM Debug</h2>
                <p className="text-gray-400 text-xs font-mono mt-1">
                  Press Cmd+Shift+D or Esc to close
                </p>
              </div>
              <button
                onClick={() => setShowDebug(false)}
                className="text-green-600 hover:text-red-400 font-mono text-2xl leading-none px-2"
                title="Close (Esc)"
              >
                ×
              </button>
            </div>
            
            <STMEditor />
          </div>
        </div>
      )}
    </div>
  );
}
