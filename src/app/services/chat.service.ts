import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Firestore } from '@angular/fire/firestore';
import { collection, doc, query, where, orderBy, limit, getDoc, getDocs, setDoc, updateDoc, writeBatch, increment, onSnapshot, serverTimestamp, QueryDocumentSnapshot, DocumentData, Unsubscribe } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { CommonService } from './common.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
      private MESSAGES_LIMIT = 50;

      // per-room state
      private lastDocMap = new Map<string, QueryDocumentSnapshot<DocumentData> | null>();
      private unsubscribeMap = new Map<string, Unsubscribe>();
      private processedIdsMap = new Map<string, Set<string>>();

      constructor(
            private firestore: Firestore,
            private service: CommonService,
            private http: HttpClient
      ) { }

      buildChatId(uidA: string | number, uidB: string | number): string {
            const toUidString = (uid: any) => uid == null ? '' : String(uid);
            const a = toUidString(uidA);
            const b = toUidString(uidB);
            return [a, b].sort((x, y) => Number(x) - Number(y) || x.localeCompare(y)).join('_');
      }

      async getOrCreateChat(currentUser: any, otherUser: any, carDetail?: any): Promise<string> {
            const currentUid = String(currentUser.id || currentUser.uid);
            let otherUid = String(otherUser.id || otherUser.uid);

            if (otherUser.participants && Array.isArray(otherUser.participants)) {
                  const found = otherUser.participants.find((p: any) => String(p) !== currentUid);
                  if (found) otherUid = String(found);
            }

            const chatId = this.buildChatId(currentUid, otherUid);

            const ref = doc(this.firestore, 'chats', chatId);
            const snap = await getDoc(ref);

            const otherUserAvatar = otherUser.profileImage || otherUser.avatarUrl || otherUser.avatar || '';
            const otherUserName = otherUser.fullName || otherUser.name || '';
            const currentUserAvatar = currentUser.profileImage || currentUser.avatarUrl || currentUser.avatar || '';
            const currentUserName = currentUser.fullName || currentUser.name || '';

            if (!snap.exists()) {
                  const newChat = {
                        participants: [currentUid, otherUid].sort(),
                        participantsInfo: {
                              [currentUid]: {
                                    name: currentUserName,
                                    avatarUrl: currentUserAvatar,
                              },
                              [otherUid]: {
                                    name: otherUserName,
                                    avatarUrl: otherUserAvatar,
                              },
                        },
                        lastMessage: null,
                        carDetail: carDetail || {},
                        unreadCount: {
                              [currentUid]: 0,
                              [otherUid]: 0,
                        },
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                  };
                  await setDoc(ref, newChat);
            } else {
                  const updateData: any = {
                        participantsInfo: {
                              [currentUid]: {
                                    name: currentUserName,
                                    avatarUrl: currentUserAvatar,
                              },
                              [otherUid]: {
                                    name: otherUserName,
                                    avatarUrl: otherUserAvatar,
                              },
                        }
                  };
                  if (carDetail) {
                        updateData.carDetail = carDetail;
                  }
                  await updateDoc(ref, updateData);
            }

            return chatId;
      }

      // ---------------- Send message ----------------
      async sendMessage(inputValue: string, currentUser: any, otherUser: any, roomId: string) {
            if (!inputValue?.trim()) return;

            const senderUid = String(currentUser.id || currentUser.uid);
            const recipientUid = String(otherUser.id || otherUser.uid);
            const chatId = roomId;

            // Ensure the parent chat document exists in Firestore first
            await this.getOrCreateChat(currentUser, otherUser);

            const batch = writeBatch(this.firestore);

            const messagesCol = collection(this.firestore, 'chats', chatId, 'messages');
            const messageRef = doc(messagesCol);
            
            const messageData = {
                  chatId,
                  senderId: senderUid,
                  type: 'text',
                  text: inputValue.trim(),
                  mediaUrl: '',
                  thumbnailUrl: '',
                  fileName: '',
                  fileSize: 0,
                  duration: 0,
                  status: 'sent',
                  createdAt: serverTimestamp(),
                  readBy: [senderUid],
            };

            batch.set(messageRef, messageData);

            const chatRef = doc(this.firestore, 'chats', chatId);
            batch.update(chatRef, {
                  lastMessage: {
                        text: inputValue.trim(),
                        type: 'text',
                        senderId: senderUid,
                        createdAt: serverTimestamp(),
                  },
                  updatedAt: serverTimestamp(),
                  [`unreadCount.${recipientUid}`]: increment(1),
            });

            await batch.commit();
            return messageRef.id;
      }

      // ---------------- Upload attachment ----------------
      uploadAttachment(formData: FormData): Observable<HttpEvent<any>> {
            return this.http.post<any>(this.service.baseUrl + 'user/upload-chat-attachment', formData, {
                  reportProgress: true,
                  observe: 'events'
            });
      }

      // ---------------- Send media message ----------------
      async sendMediaMessage(params: {
            chatId: string;
            currentUser: any;
            otherUser: any;
            type: 'image' | 'video' | 'audio';
            mediaUrl: string;
            thumbnailUrl?: string;
            fileName?: string;
            fileSize?: number;
            duration?: number;
            clientMessageId?: string;
      }) {
            const senderUid = String(params.currentUser.id || params.currentUser.uid);
            const recipientUid = String(params.otherUser.id || params.otherUser.uid);
            const chatId = params.chatId;

            await this.getOrCreateChat(params.currentUser, params.otherUser);

            const batch = writeBatch(this.firestore);
            const messagesCol = collection(this.firestore, 'chats', chatId, 'messages');
            const messageRef = doc(messagesCol);

            let previewText = '';
            if (params.type === 'image') previewText = '📷 Photo';
            else if (params.type === 'video') previewText = '🎥 Video';
            else if (params.type === 'audio') previewText = '🎤 Audio';

            const messageData = {
                  chatId,
                  senderId: senderUid,
                  type: params.type,
                  text: previewText,
                  mediaUrl: params.mediaUrl || '',
                  thumbnailUrl: params.thumbnailUrl || '',
                  fileName: params.fileName || '',
                  fileSize: params.fileSize || 0,
                  duration: params.duration || 0,
                  status: 'sent',
                  createdAt: serverTimestamp(),
                  readBy: [senderUid],
            };

            batch.set(messageRef, messageData);

            const chatRef = doc(this.firestore, 'chats', chatId);
            batch.update(chatRef, {
                  lastMessage: {
                        text: previewText,
                        type: params.type,
                        senderId: senderUid,
                        createdAt: serverTimestamp(),
                  },
                  updatedAt: serverTimestamp(),
                  [`unreadCount.${recipientUid}`]: increment(1),
            });

            await batch.commit();
            return messageRef.id;
      }

      // ---------------- Fetch messages (one-time) ----------------
      async fetchMessages(roomId: string) {
            try {
                  const chatRef = collection(this.firestore, 'chats', roomId, 'messages');
                  const q = query(chatRef, orderBy('createdAt', 'desc'));
                  const snapshot = await getDocs(q);

                  if (!snapshot.empty) {
                        const messages = snapshot.docs.map((d) => {
                              const data = d.data() as any;
                              const createdAt = this.toMillis(data.createdAt);
                              return {
                                    id: d.id,
                                    ...data,
                                    sendBy: data.senderId || data.sendBy,
                                    msg: data.text || data.msg,
                                    createdAt
                              };
                        });

                        return { messages, hasMore: false };
                  } else {
                        return { messages: [], hasMore: false };
                  }
            } catch (err) {
                  console.error('fetchMessages error:', err);
                  return { messages: [], hasMore: false };
            }
      }

      // ---------------- Real-time listener ----------------
      listenToMessages(roomId: string, currentUserId: string, callback: (update: any) => void) {
            this.stopListening(roomId);

            const messagesRef = collection(this.firestore, 'chats', roomId, 'messages');
            const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(this.MESSAGES_LIMIT));
            let isInitialLoad = true;
            const processed = new Set<string>();
            this.processedIdsMap.set(roomId, processed);

            const unsubscribe = onSnapshot(q, (snapshot) => {
                  const initialBatch: any[] = [];

                  snapshot.docChanges().forEach((change) => {
                        const dataRaw = change.doc.data() as any;
                        const createdAt = this.toMillis(dataRaw.createdAt);
                        const data = {
                              id: change.doc.id,
                              ...dataRaw,
                              sendBy: dataRaw.senderId || dataRaw.sendBy,
                              msg: dataRaw.text || dataRaw.msg,
                              createdAt
                        };

                        if (isInitialLoad && change.type === 'added') {
                              initialBatch.push(data);
                              return;
                        }

                        if (change.type === 'added') {
                              if (!processed.has(data.id)) {
                                    const type = String(data.senderId) === String(currentUserId) ? 'sent' : 'received';
                                    callback({ type, data });
                                    processed.add(data.id);
                              }
                        } else if (change.type === 'modified') {
                              callback({ type: 'modified', data });
                        } else if (change.type === 'removed') {
                              callback({ type: 'removed', data });
                        }
                  });

                  if (isInitialLoad) {
                        initialBatch.sort((a, b) => this.toMillis(a.createdAt) - this.toMillis(b.createdAt));
                        initialBatch.forEach(item => processed.add(item.id));
                        callback({ type: 'initial', data: initialBatch });
                        isInitialLoad = false;
                  }
            }, (err) => {
                  console.error('onSnapshot error for room', roomId, err);
            });

            this.unsubscribeMap.set(roomId, unsubscribe);
            return unsubscribe;
      }

      async markAllMessagesSeen(userId: string, roomId: string, messages: any[] = []) {
            try {
                  const uid = String(userId);
                  const chatRef = doc(this.firestore, 'chats', roomId);
                  await updateDoc(chatRef, {
                        [`unreadCount.${uid}`]: 0
                  });
            } catch (error) {
                  console.error('Error updating seen status:', error);
            }
      }

      stopListening(roomId: string) {
            const unsub = this.unsubscribeMap.get(roomId);
            if (unsub) {
                  try { unsub(); } catch (e) { /* ignore */ }
                  this.unsubscribeMap.delete(roomId);
            }
            this.processedIdsMap.delete(roomId);
      }

      resetPagination(roomId: string) {
            this.lastDocMap.set(roomId, null);
      }

      // ---------------- Chat list (real-time) ----------------
      getChatList(userId: string): Observable<any[]> {
            return new Observable((observer) => {
                  const currentUid = String(userId);
                  const candidates = this.buildUidCandidates(currentUid);
                  if (candidates.length === 0) {
                        observer.next([]);
                        return;
                  }

                  const chatsRef = collection(this.firestore, 'chats');
                  const q = candidates.length === 1
                        ? query(chatsRef, where('participants', 'array-contains', candidates[0]))
                        : query(chatsRef, where('participants', 'array-contains-any', candidates));

                  const unsubscribe = onSnapshot(q, (snapshot) => {
                        const list = snapshot.docs.map(d => {
                              const data: any = d.data();
                              const createdAt = this.toMillis(data.updatedAt || data.createdAt);
                              return { id: d.id, ...data, createdAt };
                        }).sort((a, b) => this.toMillis(b.updatedAt || b.createdAt) - this.toMillis(a.updatedAt || a.createdAt));
                        observer.next(list);
                  }, (err) => {
                        console.error('getChatList onSnapshot error:', err);
                        observer.error(err);
                  });

                  return () => {
                        try { unsubscribe(); } catch (e) { }
                  };
            });
      }

      private buildUidCandidates(uid: any): any[] {
            const candidates: any[] = [];
            const uidString = uid == null ? '' : String(uid);
            if (uidString) candidates.push(uidString);
            const asNumber = Number(uid);
            if (uid != null && uid !== '' && Number.isFinite(asNumber) && asNumber !== uid) {
                  candidates.push(asNumber);
            }
            return [...new Set(candidates)];
      }

      private toMillis(value: any): number {
            if (!value) return 0;
            if (typeof value.toMillis === 'function') return value.toMillis();
            if (typeof value.seconds === 'number') return value.seconds * 1000;
            if (value instanceof Date) return value.getTime();
            return 0;
      }
}
