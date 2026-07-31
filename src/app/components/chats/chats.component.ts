import { Component, effect, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { ChatService } from '../../services/chat.service';
import { UserService } from '../../services/user.service';
import { Subscription } from 'rxjs';
import { CommonService } from '../../services/common.service';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoaderService } from '../../services/loader.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChfFormatPipe } from '../../pipes/chf-format.pipe';
import { RouterLink } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { DocumentMessageComponent } from './document-message/document-message.component';
import { ChatMessage } from '../../models/chat.model';

@Component({
  selector: 'app-chats',
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ChfFormatPipe,
    RouterLink,
    DocumentMessageComponent
  ],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.css'
})
export class ChatsComponent implements OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('messageInput') messageInputEl!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('imageInput') imageInputEl!: ElementRef<HTMLInputElement>;
  @ViewChild('videoInput') videoInputEl!: ElementRef<HTMLInputElement>;
  @ViewChild('documentInput') documentInputEl!: ElementRef<HTMLInputElement>;

  inputValue = '';
  messages: any[] = [];
  hasMore = true;
  lastVisibleDoc: any = null;
  isLoadingOlderMessages = false;
  roomId = '';
  currentUserId = '';
  currentChat: any = null;
  chatList: any[] = [];
  filteredChatList: any[] = [];
  sub1!: Subscription;
  unsubscribe!: () => void;
  userUnsubscribe!: () => void;
  otherUserData: any = null;
  userData: any;
  sellerCarList: any[] = [];
  currentCar: any = {};

  // Media & Recording state
  isRecording = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  recordingTimer: any = null;
  recordingDuration = 0;
  selectedPreviewMedia: { url: string; type: 'image' | 'video' } | null = null;
  selectedPreviewDocument: { url: string; fileName: string; mimeType: string } | null = null;

  constructor(
    private chatService: ChatService,
    private userService: UserService,
    private commonService: CommonService,
    public location: Location,
    private loader: LoaderService,
    private translate: TranslateService,
    private nzMessage: NzMessageService
  ) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    effect(() => {
      this.userData = this.commonService.userData();
      const sellerData = JSON.parse(sessionStorage.getItem('sellerData') || '{}') || this.commonService.sellerData();
      if (this.userData) {
        this.currentUserId = this.userData.id;

        if (this.sub1) this.sub1.unsubscribe();
        this.sub1 = this.chatService.getChatList(this.userData.id).subscribe(list => {
          const uniqueChatsMap = new Map<string, any>();
          list.forEach(item => {
            const otherUid = item.participants?.find((p: any) => String(p) !== String(this.userData.id)) || '';
            const otherInfo = item.participantsInfo?.[otherUid] || {};
            const unreadCount = item.unreadCount?.[this.userData.id] || 0;
            const mappedItem = {
              ...item,
              name: otherInfo.name || '',
              avatar: otherInfo.avatarUrl || '',
              carImage: item.carDetail?.image || item.carDetail?.carImage || '',
              carName: item.carDetail?.make || item.carDetail?.carName || '',
              Seen: unreadCount === 0,
              mgsCount: unreadCount
            };
            const key = otherUid || item.id;
            if (!uniqueChatsMap.has(key)) {
              uniqueChatsMap.set(key, mappedItem);
            }
          });
          this.chatList = Array.from(uniqueChatsMap.values());
          this.filteredChatList = this.chatList;
          console.log(this.chatList);

        });

        if (sellerData && sellerData.name) {
          this.loader.show();
          setTimeout(() => {
            const existingChat = this.chatList.find(chat => chat.participants?.includes(String(sellerData.id)));
            if (existingChat) {
              this.openChat(existingChat, sellerData.carId);
            } else {
              this.getSellerCars(sellerData.id, sellerData.carId);
              this.roomId = this.chatService.buildChatId(this.userData.id, sellerData.id);
              this.currentChat = {
                id: sellerData.id,
                name: sellerData.name,
                avatar: sellerData.profileImage,
                carImage: sellerData.carImage,
                carName: sellerData.carName
              };
              this.messages = [];
              this.hasMore = true;
              this.listenRealTime();
            }
            this.loader.hide();
          }, 1500);
        }
      }
    });
  }

  getSellerCars(sellerId: any, carId: any) {
    this.commonService.get('user/fetchOtherCarListByOtherSellerId?id=' + sellerId).subscribe((res: any) => {
      if (carId) {
        this.sellerCarList = res.data.filter((car: any) => car.id != carId);
        this.currentCar = res.data.find((car: { id: any; }) => car.id == carId);
      } else {
        this.currentCar = null;
        this.sellerCarList = res.data;
        this.currentCar = res.data[0] || null;
      }
    });
  }

  openChat(item: any, carId?: any) {
    const otherUid = item.participants?.find((p: any) => String(p) !== String(this.userData.id)) || item.id;
    if (carId) {
      this.getSellerCars(otherUid, carId);
    } else {
      this.currentCar = null;
      this.sellerCarList = [];
    }
    this.currentChat = {
      ...item,
      id: otherUid
    };
    this.roomId = item.id;

    if (this.userUnsubscribe) this.userUnsubscribe();
    this.userUnsubscribe = this.userService.getUserSnapshot(otherUid, (userDoc) => {
      this.otherUserData = userDoc;
      if (userDoc) {
        if (userDoc.name) this.currentChat.name = userDoc.name;
        if (userDoc.avatarUrl) this.currentChat.avatar = userDoc.avatarUrl;
        this.currentChat.online = !!userDoc.online;
        this.currentChat.lastSeen = userDoc.lastSeen;
      }
    });

    this.messages = [];
    this.hasMore = true;
    this.lastVisibleDoc = null;

    this.listenRealTime();
    this.chatService.markAllMessagesSeen(this.userData.id, this.roomId, this.messages);
  }

  async loadMessages() {
    const result = await this.chatService.fetchMessagesPaginated(this.roomId, 20);
    this.messages = result.messages.reverse();
    this.lastVisibleDoc = result.lastVisible;
    this.hasMore = result.hasMore;
    this.scrollToBottom();
  }

  listenRealTime() {
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = this.chatService.listenToMessages(this.roomId, this.currentUserId, update => {
      if (update.type === 'initial') {
        const pendingMsgs = this.messages.filter(m => m.status === 'sending' || m.status === 'failed');
        const initialMsgs = update.data.reverse();
        const existingIds = new Set(initialMsgs.map((m: any) => m.id));
        const filteredPending = pendingMsgs.filter(m => !existingIds.has(m.id));

        this.messages = [...initialMsgs, ...filteredPending];
        this.scrollToBottom();
        console.log('messages', this.messages);
      } else if (update.type === 'received' || update.type === 'sent') {
        const clientMsgId = update.data.clientMessageId;
        if (clientMsgId) {
          this.messages = this.messages.filter(m => m.id !== clientMsgId && m.clientMessageId !== clientMsgId);
        }
        const exists = this.messages.some(m => m.id === update.data.id);
        if (!exists) {
          this.messages.push(update.data);
          this.scrollToBottom();
        }
      } else if (update.type === 'modified') {
        const idx = this.messages.findIndex(m => m.id === update.data.id);
        if (idx !== -1) this.messages[idx] = update.data;
      } else if (update.type === 'removed') {
        this.messages = this.messages.filter(m => m.id !== update.data.id);
      }
    });
  }

  onChatScroll(event: Event) {
    const element = event.target as HTMLElement;
    if (!element || this.isLoadingOlderMessages || !this.hasMore || !this.roomId) return;

    if (element.scrollTop < 50) {
      this.loadOlderMessages(element);
    }
  }

  async loadOlderMessages(scrollEl?: HTMLElement) {
    if (this.isLoadingOlderMessages || !this.hasMore || !this.roomId) return;
    this.isLoadingOlderMessages = true;

    const previousScrollHeight = scrollEl ? scrollEl.scrollHeight : 0;
    const oldestMsgWithDoc = this.messages.find(m => m.snapshotDoc);
    const startDoc = oldestMsgWithDoc ? oldestMsgWithDoc.snapshotDoc : this.lastVisibleDoc;

    const result = await this.chatService.fetchMessagesPaginated(this.roomId, 20, startDoc);

    if (result.messages && result.messages.length > 0) {
      this.lastVisibleDoc = result.lastVisible;
      this.hasMore = result.hasMore;

      const existingIds = new Set(this.messages.map(m => m.id));
      const olderMessages = result.messages.filter(m => !existingIds.has(m.id)).reverse();

      if (olderMessages.length > 0) {
        this.messages = [...olderMessages, ...this.messages];

        if (scrollEl) {
          setTimeout(() => {
            const newScrollHeight = scrollEl.scrollHeight;
            scrollEl.scrollTop = newScrollHeight - previousScrollHeight;
          }, 50);
        }
      }
    } else {
      this.hasMore = false;
    }

    this.isLoadingOlderMessages = false;
  }

  async sendMessage() {
    if (!this.inputValue.trim()) return;

    await this.chatService.sendMessage(this.inputValue, this.userData, this.currentChat, this.roomId, this.currentCar);
    this.inputValue = '';
    if (this.messageInputEl) {
      this.messageInputEl.nativeElement.style.height = '48px';
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  adjustHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = '48px';
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, 48), 120);
    textarea.style.height = `${newHeight}px`;
  }

  scrollToBottom() {
    if (this.scrollContainer) {
      setTimeout(() => {
        try {
          this.scrollContainer.nativeElement.scrollTo({
            top: this.scrollContainer.nativeElement.scrollHeight,
            behavior: 'smooth'
          });
        } catch (e) { }
      }, 100);
    }
  }

  filterChatList(event: any) {
    const searchTerm = event.target.value.trim();
    if (!searchTerm) {
      this.filteredChatList = this.chatList;
    } else {
      this.filteredChatList = this.chatList.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }

  getChatCarTitle(item: any): string {
    return item.carDetail?.make || item.carDetail?.carName || item.carName || '';
  }

  getChatPreview(item: any): string {
    const msg = item.lastMessage;
    if (!msg) return '';
    if (msg.text) return msg.text;
    if (msg.type === 'image') return '📷 Photo';
    if (msg.type === 'video') return '🎥 Video';
    if (msg.type === 'audio') return '🎤 Audio';
    if (msg.type === 'document') return `📄 ${msg.fileName || 'Document'}`;
    return '';
  }

  triggerImageUpload() {
    if (this.imageInputEl) {
      this.imageInputEl.nativeElement.click();
    }
  }

  triggerVideoUpload() {
    if (this.videoInputEl) {
      this.videoInputEl.nativeElement.click();
    }
  }

  triggerDocumentUpload() {
    if (this.documentInputEl) {
      this.documentInputEl.nativeElement.click();
    }
  }

  onDocumentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
    if (!allowedExtensions.includes(ext)) {
      this.nzMessage.error('Unsupported file format. Supported formats: PDF (.pdf), Word (.doc, .docx), Excel (.xls, .xlsx)');
      input.value = '';
      return;
    }

    this.uploadDocumentFile(file);
    input.value = '';
  }

  getMimeTypeFromExt(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls': return 'application/vnd.ms-excel';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default: return 'application/octet-stream';
    }
  }

  uploadDocumentFile(file: File) {
    if (!this.roomId || !this.currentChat) return;

    const tempId = 'temp_' + Date.now();
    const localUrl = URL.createObjectURL(file);
    const mimeType = file.type || this.getMimeTypeFromExt(file.name);

    const pendingMsg: ChatMessage = {
      id: tempId,
      clientMessageId: tempId,
      chatId: this.roomId,
      senderId: this.currentUserId,
      sendBy: this.currentUserId,
      type: 'document',
      mediaUrl: localUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: mimeType,
      status: 'sending',
      uploadState: 'start',
      progress: 0,
      createdAt: Date.now(),
      _rawFile: file
    };

    this.messages.push(pendingMsg);
    this.scrollToBottom();

    const formData = new FormData();
    formData.append('attachment_type', 'document');
    formData.append('chatAttachment', file, file.name);

    this.chatService.uploadAttachment(formData).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          pendingMsg.uploadState = 'uploading';
          pendingMsg.progress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          const res = event.body;
          const mediaUrl = res?.data?.attachment_url || res?.data?.url || res?.attachment_url || res?.url || res?.data || '';
          if (mediaUrl) {
            this.chatService.sendMediaMessage({
              chatId: this.roomId,
              currentUser: this.userData,
              otherUser: this.currentChat,
              type: 'document',
              mediaUrl,
              fileName: file.name,
              fileSize: file.size,
              mimeType: mimeType,
              clientMessageId: tempId,
              currentCar: this.currentCar
            }).then(() => {
              pendingMsg.uploadState = 'complete';
              pendingMsg.status = 'sent';
              pendingMsg.mediaUrl = mediaUrl;
            }).catch((err) => {
              console.error('Failed to send document message to Firestore', err);
              pendingMsg.uploadState = 'failed';
              pendingMsg.status = 'failed';
              this.nzMessage.error('Failed to send document message');
            });
          } else {
            console.error('Failed to get attachment URL from upload response', res);
            pendingMsg.uploadState = 'failed';
            pendingMsg.status = 'failed';
            this.nzMessage.error('Document upload failed');
          }
        }
      },
      error: (err) => {
        console.error('Error uploading document chat attachment:', err);
        pendingMsg.uploadState = 'failed';
        pendingMsg.status = 'failed';
        this.nzMessage.error('Document upload failed');
      }
    });
  }

  retryDocumentUpload(msg: ChatMessage) {
    if (msg._rawFile) {
      this.messages = this.messages.filter(m => m.id !== msg.id);
      this.uploadDocumentFile(msg._rawFile);
    } else {
      this.nzMessage.error('File context lost. Please re-select the document file.');
    }
  }

  openDocumentPreview(msg: ChatMessage) {
    if (!msg || !msg.mediaUrl) return;
    window.open(msg.mediaUrl, '_blank');
  }

  onFileSelected(event: Event, type: 'image' | 'video') {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.uploadMediaFile(file, type);
    input.value = '';
  }

  uploadMediaFile(file: File | Blob, type: 'image' | 'video' | 'audio', fileName?: string, duration?: number) {
    if (!this.roomId || !this.currentChat) return;

    const tempId = 'temp_' + Date.now();
    const localUrl = URL.createObjectURL(file);
    const resolvedFileName = fileName || (file instanceof File ? file.name : `${type}_${Date.now()}.${type === 'audio' ? 'm4a' : type === 'image' ? 'jpg' : 'mp4'}`);

    const pendingMsg: any = {
      id: tempId,
      chatId: this.roomId,
      senderId: this.currentUserId,
      sendBy: this.currentUserId,
      type,
      mediaUrl: localUrl,
      fileName: resolvedFileName,
      fileSize: file.size,
      duration: duration || 0,
      status: 'sending',
      upload: 'pending',
      progress: 0,
      createdAt: Date.now()
    };

    this.messages.push(pendingMsg);
    this.scrollToBottom();

    const formData = new FormData();
    formData.append('attachment_type', type);
    formData.append('chatAttachment', file, resolvedFileName);

    this.chatService.uploadAttachment(formData).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          pendingMsg.progress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          const res = event.body;
          const mediaUrl = res?.data?.attachment_url || res?.data?.url || res?.attachment_url || res?.url || res?.data || '';
          if (mediaUrl) {
            this.chatService.sendMediaMessage({
              chatId: this.roomId,
              currentUser: this.userData,
              otherUser: this.currentChat,
              type,
              mediaUrl,
              fileName: resolvedFileName,
              fileSize: file.size,
              duration: duration || 0,
              clientMessageId: tempId,
              currentCar: this.currentCar
            }).then(() => {
              this.messages = this.messages.filter(m => m.id !== tempId);
            });
          } else {
            console.error('Failed to get attachment URL from upload response', res);
            this.messages = this.messages.filter(m => m.id !== tempId);
          }
        }
      },
      error: (err) => {
        console.error('Error uploading chat attachment:', err);
        this.messages = this.messages.filter(m => m.id !== tempId);
      }
    });
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.recordingDuration = 0;
      this.isRecording = true;

      this.recordingTimer = setInterval(() => {
        this.recordingDuration++;
      }, 1000);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Microphone access is required to record voice messages.');
    }
  }

  stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) return;

    this.mediaRecorder.onstop = () => {
      clearInterval(this.recordingTimer);
      const duration = this.recordingDuration;
      this.isRecording = false;
      this.recordingDuration = 0;

      const audioBlob = new Blob(this.audioChunks, { type: 'audio/m4a' });
      const tracks = this.mediaRecorder?.stream.getTracks();
      tracks?.forEach(track => track.stop());

      if (audioBlob.size > 0) {
        this.uploadMediaFile(audioBlob, 'audio', `voice_${Date.now()}.m4a`, duration);
      }
    };

    this.mediaRecorder.stop();
  }

  cancelRecording() {
    if (this.mediaRecorder && this.isRecording) {
      clearInterval(this.recordingTimer);
      const tracks = this.mediaRecorder.stream.getTracks();
      tracks.forEach(track => track.stop());
      this.isRecording = false;
      this.recordingDuration = 0;
      this.audioChunks = [];
    }
  }

  formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  toggleAudio(msg: any, audioEl: HTMLAudioElement) {
    if (!audioEl) return;
    if (msg.isPlaying) {
      audioEl.pause();
      msg.isPlaying = false;
    } else {
      this.messages.forEach(m => {
        if (m.isPlaying && m !== msg) {
          m.isPlaying = false;
        }
      });
      audioEl.play();
      msg.isPlaying = true;
    }
  }

  onAudioTimeUpdate(msg: any, audioEl: HTMLAudioElement) {
    if (!audioEl) return;
    msg.currentTime = audioEl.currentTime;
    msg.duration = audioEl.duration || msg.duration || 0;
    msg.progress = audioEl.duration ? (audioEl.currentTime / audioEl.duration) * 100 : 0;
  }

  onAudioEnded(msg: any) {
    msg.isPlaying = false;
    msg.currentTime = 0;
    msg.progress = 0;
  }

  seekAudio(msg: any, audioEl: HTMLAudioElement, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    if (audioEl && audioEl.duration) {
      audioEl.currentTime = (value / 100) * audioEl.duration;
      msg.progress = value;
      msg.currentTime = audioEl.currentTime;
    }
  }

  toggleVideo(msg: any, videoEl: HTMLVideoElement) {
    if (!videoEl) return;
    if (msg.isPlayingVideo) {
      videoEl.pause();
      msg.isPlayingVideo = false;
    } else {
      videoEl.play();
      msg.isPlayingVideo = true;
    }
  }

  onVideoEnded(msg: any) {
    msg.isPlayingVideo = false;
  }

  isActiveChat(item: any): boolean {
    return item.id === this.roomId;
  }

  getCurrentCarImage(): string {
    return this.currentCar?.carImages?.[0] || this.currentChat?.carDetail?.image || this.currentChat?.carImage || '';
  }

  getCurrentCarTitle(): string {
    if (this.currentCar?.brandName) {
      return `${this.currentCar.brandName} ${this.currentCar.carModel || ''}`;
    }
    return this.currentChat?.carDetail?.make || this.currentChat?.carName || '';
  }

  closeCurrentChat() {
    this.currentChat = null;
    this.roomId = '';
    this.otherUserData = null;
    if (this.unsubscribe) this.unsubscribe();
    if (this.userUnsubscribe) this.userUnsubscribe();
  }

  timeAgo(dateString: string): string {
    if (!dateString) return '';
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  }

  openFullscreenVideo(videoEl?: HTMLVideoElement, url?: string) {
    if (videoEl && videoEl.requestFullscreen) {
      videoEl.requestFullscreen().catch(() => {
        if (url) {
          this.selectedPreviewMedia = { url, type: 'video' };
        }
      });
    } else if (url) {
      this.selectedPreviewMedia = { url, type: 'video' };
    }
  }

  ngOnDestroy() {
    if (this.unsubscribe) this.unsubscribe();
    if (this.userUnsubscribe) this.userUnsubscribe();
    if (this.sub1) this.sub1.unsubscribe();
    this.cancelRecording();
  }
}
