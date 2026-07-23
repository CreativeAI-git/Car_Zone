import { Component, effect, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { ChatService } from '../../services/chat.service';
import { Subscription } from 'rxjs';
import { CommonService } from '../../services/common.service';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoaderService } from '../../services/loader.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChfFormatPipe } from '../../pipes/chf-format.pipe';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-chats',
  imports: [CommonModule, FormsModule, TranslateModule, ChfFormatPipe, RouterLink],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.css'
})
export class ChatsComponent implements OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('messageInput') messageInputEl!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('imageInput') imageInputEl!: ElementRef<HTMLInputElement>;
  @ViewChild('videoInput') videoInputEl!: ElementRef<HTMLInputElement>;

  inputValue = '';
  messages: any[] = [];
  hasMore = true;
  roomId = '';
  currentUserId = '';
  currentChat: any = null;
  chatList: any[] = [];
  filteredChatList: any[] = [];
  sub1!: Subscription;
  unsubscribe!: () => void;
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

  constructor(
    private chatService: ChatService,
    private commonService: CommonService,
    public location: Location,
    private loader: LoaderService,
    private translate: TranslateService
  ) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    effect(() => {
      this.userData = this.commonService.userData();
      const sellerData = JSON.parse(sessionStorage.getItem('sellerData') || '{}') || this.commonService.sellerData();
      if (this.userData) {
        this.currentUserId = this.userData.id;

        if (this.sub1) this.sub1.unsubscribe();
        this.sub1 = this.chatService.getChatList(this.userData.id).subscribe(list => {
          this.chatList = list.map(item => {
            const otherUid = item.participants?.find((p: any) => String(p) !== String(this.userData.id)) || '';
            const otherInfo = item.participantsInfo?.[otherUid] || {};
            const unreadCount = item.unreadCount?.[this.userData.id] || 0;
            return {
              ...item,
              name: otherInfo.name || '',
              avatar: otherInfo.avatarUrl || '',
              carImage: item.carDetail?.carImage || '',
              carName: item.carDetail?.carName || '',
              Seen: unreadCount === 0,
              mgsCount: unreadCount
            };
          });
          this.filteredChatList = this.chatList;
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

  openChat(item: any, carId: any) {
    const otherUid = item.participants?.find((p: any) => String(p) !== String(this.userData.id)) || item.id;
    this.getSellerCars(otherUid, carId);
    this.currentChat = item;
    this.roomId = item.id;

    this.messages = [];
    this.hasMore = true;

    this.listenRealTime();
    this.chatService.markAllMessagesSeen(this.userData.id, this.roomId, this.messages);
  }

  async loadMessages() {
    const result = await this.chatService.fetchMessages(this.roomId);
    this.messages = result.messages;
    this.hasMore = result.hasMore;
    this.scrollToBottom();
  }

  listenRealTime() {
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = this.chatService.listenToMessages(this.roomId, this.currentUserId, update => {
      if (update.type === 'initial') {
        this.messages = update.data;
        this.scrollToBottom();
      } else if (update.type === 'received' || update.type === 'sent') {
        this.messages.push(update.data);
        this.scrollToBottom();
      } else if (update.type === 'modified') {
        const idx = this.messages.findIndex(m => m.id === update.data.id);
        if (idx !== -1) this.messages[idx] = update.data;
      } else if (update.type === 'removed') {
        this.messages = this.messages.filter(m => m.id !== update.data.id);
      }
    });


  }

  async sendMessage() {
    if (!this.inputValue.trim()) return;

    await this.chatService.sendMessage(this.inputValue, this.userData, this.currentChat, this.roomId);
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
    return item.carDetail?.carName || item.carName || '';
  }

  getChatPreview(item: any): string {
    const msg = item.lastMessage;
    if (!msg) return '';
    if (msg.text) return msg.text;
    if (msg.type === 'image') return '📷 Photo';
    if (msg.type === 'video') return '🎥 Video';
    if (msg.type === 'audio') return '🎤 Audio';
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
              clientMessageId: tempId
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  isActiveChat(item: any): boolean {
    return item.id === this.roomId;
  }

  getCurrentCarImage(): string {
    return this.currentCar?.carImages?.[0] || this.currentChat?.carImage || '';
  }

  getCurrentCarTitle(): string {
    if (this.currentCar?.brandName) {
      return `${this.currentCar.brandName} ${this.currentCar.carModel || ''}`;
    }
    return this.currentChat?.carName || '';
  }

  closeCurrentChat() {
    this.currentChat = null;
    this.roomId = '';
    if (this.unsubscribe) this.unsubscribe();
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

  ngOnDestroy() {
    if (this.unsubscribe) this.unsubscribe();
    if (this.sub1) this.sub1.unsubscribe();
    this.cancelRecording();
  }
}
