export interface DocumentMessage {
  id?: string;
  chatId: string;
  senderId: string;
  otherUserId?: string;
  type: 'document';
  clientMessageId?: string;
  mediaUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: 'sending' | 'sent' | 'failed';
  uploadState?: 'start' | 'uploading' | 'complete' | 'failed';
  progress?: number;
  createdAt: any;
  sendBy?: string;
  text?: string;
}

export interface ChatMessage {
  id?: string;
  chatId: string;
  senderId: string;
  otherUserId?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  text?: string;
  msg?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
  status?: 'sending' | 'sent' | 'failed';
  uploadState?: 'start' | 'uploading' | 'complete' | 'failed';
  progress?: number;
  clientMessageId?: string;
  createdAt: any;
  sendBy?: string;
  isPlaying?: boolean;
  isPlayingVideo?: boolean;
  currentTime?: number;
  _rawFile?: File;
}

export interface PaginationResult {
  messages: ChatMessage[];
  lastVisible: any;
  hasMore: boolean;
}
