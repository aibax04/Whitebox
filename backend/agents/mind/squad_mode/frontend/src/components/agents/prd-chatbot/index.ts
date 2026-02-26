// Main component
export { default as PRDChatbot } from './PRDChatbot';

// Components
export { ChatSidebar } from './components/ChatSidebar';
export { ChatMessages } from './components/ChatMessages';
export { ChatInput } from './components/ChatInput';
export { LivePRDPreview } from './components/LivePRDPreview';

// Hooks
export { useChatSessions } from './hooks/useChatSessions';
export { useMessages } from './hooks/useMessages';

// Types
export * from './types';

// Utils
export * from './utils/fileUtils';
export * from './utils/analysisUtils';
