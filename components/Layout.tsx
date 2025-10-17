import { ReactNode } from 'react';
import Breadcrumb from './Breadcrumb';
import ChatInterface from './ChatInterface';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
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
    </div>
  );
}

