import React from 'react';
import { FileText, Upload, FileType } from 'lucide-react';
import { Message } from '../types';
import { Button } from '@/components/ui/button';
import attachment from '@/assets/images/requirement_asst/attachment.png';
import files_1 from '@/assets/images/requirement_asst/files_1.png';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onFileUpload?: () => void;
  onTemplateSelect?: () => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  messagesEndRef,
  onFileUpload,
  onTemplateSelect
}) => {
  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full space-y-6">
          <h1 className="text-white text-2xl font-normal">
            How can I help you today?
          </h1>
          <div className="flex gap-4">
            <Button
              onClick={onFileUpload}
              className="bg-transparent hover:bg-squadrun-primary/80 text-white px-6 py-3 rounded-lg flex items-center gap-2 border"
            >
              <img src={attachment} alt="Upload" className="w-4 h-4" />
              Upload a Document
            </Button>
            <Button
              onClick={onTemplateSelect}
              className="bg-transparent hover:bg-squadrun-primary/80 text-white px-6 py-3 rounded-lg flex items-center gap-2 border"
            >
              <img src={files_1} alt="Select Template" className="w-4 h-4" />
              Select a Template
            </Button>
          </div>
        </div>
      )}
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-3xl rounded-lg p-4 ${
              message.type === 'user'
                ? 'bg-squadrun-primary text-white'
                : 'bg-squadrun-dark border-none text-white'
            }`}
          >
            {message.fileAttachment && (
              <div className="mb-2 p-2 bg-squadrun-primary/20 rounded border border-squadrun-primary/30">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4" />
                  <span>Attached: {message.fileAttachment.name}</span>
                </div>
              </div>
            )}
            <div className="whitespace-pre-wrap">{message.content}</div>
            <div className="text-xs opacity-60 mt-2">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-squadrun-dark border border-squadrun-primary/20 text-white rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-squadrun-primary"></div>
              <span>Thinking...</span>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
