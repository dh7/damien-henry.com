'use client';

import { ReactNode, useState, useEffect } from 'react';
import Breadcrumb from './Breadcrumb';
import ChatInterface from './ChatInterface';
import STMEditor from './STMEditor';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [showDebug, setShowDebug] = useState(false);

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

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Breadcrumb at the top */}
      <div style={{ flexShrink: 0 }}>
        <Breadcrumb />
      </div>
      
      {/* Main content area with content and chat side by side */}
      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden' }} className="main-content-bg">
        {/* Main content on the left - flexible width with independent scroll */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
        
        {/* Chat Interface on the right - fixed width with independent scroll */}
        <div style={{ width: '384px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px' }}>
          <ChatInterface />
        </div>
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

