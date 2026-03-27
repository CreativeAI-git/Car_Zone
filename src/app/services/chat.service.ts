import { Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { collection, doc, query, orderBy, getDocs, addDoc, writeBatch, increment, onSnapshot, serverTimestamp, QueryDocumentSnapshot, DocumentData, Unsubscribe } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { CommonService } from './common.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
      private MESSAGES_LIMIT = 20;

      // per-room state
      private lastDocMap = new Map<string, QueryDocumentSnapshot<DocumentData> | null>();
      private unsubscribeMap = new Map<string, Unsubscribe>();
      private processedIdsMap = new Map<string, Set<string>>();

      constructor(private firestore: Firestore, private service: CommonService) { }

      // ---------------- Send message ----------------
      async sendMessage(inputValue: string, currentUser: any, otherUser: any, roomId: string) {
            if (!inputValue?.trim()) return;

            const senderId = String(currentUser.id);
            const receiverId = String(otherUser.id);
            const key = this.generateRandomString();

            // build message WITHOUT client-side createdAt (serverTimestamp will be used)
            const myMsg = {
                  sendBy: senderId,
                  sendTo: receiverId,
                  avatar: currentUser.profileImage || '',
                  name: currentUser.fullName || currentUser.name || '',
                  type: 'text',
                  seen: false,
                  key,
                  msg: inputValue.trim(),
                  // no createdAt here: serverTimestamp will be added on addDoc
            };

            // prepare usersList objects (use serverTimestamp in write)
            const userList = {
                  id: receiverId,
                  Seen: true,
                  name: otherUser.name,
                  senderId,
                  avatar: otherUser.avatar,
                  lastMsg: inputValue.trim(),
                  createdAt: serverTimestamp(),
                  carImage: otherUser.carImage,
                  carName: otherUser.carName,
            };

            const otherUserList = {
                  id: senderId,
                  Seen: false,
                  lastMsg: inputValue.trim(),
                  senderId,
                  createdAt: serverTimestamp(),
                  mgsCount: increment(1),
                  avatar: currentUser.profileImage || '',
                  name: currentUser.fullName || currentUser.name || '',
            };
            await this.uploadMessage(myMsg, userList, otherUserList, senderId, receiverId, roomId);
      }

      private async uploadMessage(
            myMsg: any,
            userList: any,
            otherUserList: any,
            senderId: string,
            receiverId: string,
            roomId: string
      ) {
            try {
                  const chatRef = doc(this.firestore, 'chatroom', roomId);
                  const userRef = doc(this.firestore, 'users', senderId, 'usersList', roomId);
                  const otherUserRef = doc(this.firestore, 'users', receiverId, 'usersList', roomId);
                  const chatMessagesRef = collection(chatRef, 'chats');

                  const batch = writeBatch(this.firestore);
                  batch.set(userRef, userList, { merge: true });
                  batch.set(otherUserRef, otherUserList, { merge: true });

                  // add message with server timestamp
                  await Promise.all([
                        addDoc(chatMessagesRef, { ...myMsg, createdAt: serverTimestamp() }),
                        batch.commit(),
                  ]);
                  sessionStorage.removeItem('sellerData');
                  this.service.sellerData.set(null)
            } catch (err) {
                  console.error('uploadMessage error:', err);
                  throw err;
            }
      }

      // ---------------- Pagination fetch ----------------
      // currentMessages expected in "newest-first" order (desc). Component can reverse on render.
      async fetchMessages(roomId: string) {
            try {
                  const chatRef = collection(this.firestore, 'chatroom', roomId, 'chats');

                  // Get all messages ordered by creation time (ascending or descending as per your UI)
                  const q = query(chatRef, orderBy('createdAt', 'desc'));

                  const snapshot = await getDocs(q);

                  if (!snapshot.empty) {
                        const messages = snapshot.docs.map((d) => {
                              const data = d.data() as any;
                              const createdAt =
                                    data.createdAt && (data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt);
                              return { id: d.id, ...data, createdAt };
                        });

                        return { messages, hasMore: false }; // no pagination needed
                  } else {
                        return { messages: [], hasMore: false };
                  }
            } catch (err) {
                  console.error('fetchMessages error:', err);
                  return { messages: [], hasMore: false };
            }
      }

      // ---------------- Real-time listener ----------------
      // callback receives { type: 'initial'|'received'|'sent'|'modified'|'removed', data: any }
      listenToMessages(roomId: string, currentUserId: string, callback: (update: any) => void) {
            // stop old listener for this room
            this.stopListening(roomId);

            const chatsQuery = query(collection(this.firestore, 'chatroom', roomId, 'chats'), orderBy('createdAt', 'desc'));
            let isInitialLoad = true;
            const processed = new Set<string>();
            this.processedIdsMap.set(roomId, processed);

            const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
                  // collect initial batch (added docs)
                  const initialBatch: any[] = [];

                  snapshot.docChanges().forEach((change) => {
                        const dataRaw = change.doc.data() as any;
                        const createdAt = dataRaw.createdAt && (dataRaw.createdAt.toMillis ? dataRaw.createdAt.toMillis() : dataRaw.createdAt);
                        const data = { id: change.doc.id, ...dataRaw, createdAt };

                        if (isInitialLoad && change.type === 'added') {
                              initialBatch.push(data);
                              return;
                        }

                        // after initial load - handle mutations
                        if (change.type === 'added') {
                              if (!processed.has(data.id)) {
                                    const type = String(data.sendBy) === String(currentUserId) ? 'sent' : 'received';
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
                        // sort initial batch ascending by createdAt so consumer can render oldest->newest if required
                        initialBatch.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
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
                  const db = this.firestore;

                  // Reference to the user document inside 'usersList'
                  const userListRef = doc(collection(db, 'users', String(userId), 'usersList'), String(roomId));

                  // Update 'Seen' and 'mgsCount' fields
                  const initialBatch = writeBatch(db);
                  initialBatch.update(userListRef, { Seen: true, mgsCount: 0 });
                  await initialBatch.commit();

                  // Filter unseen messages for this user
                  const unseenMessages = messages.filter(
                        (msg: any) => msg.sendTo === userId && !msg.seen
                  );

                  if (unseenMessages.length > 0) {
                        const batch = writeBatch(db);

                        unseenMessages.forEach((msg: any) => {
                              const msgRef = doc(collection(db, 'chatroom', String(roomId), 'chats'), String(msg.id));
                              batch.update(msgRef, { seen: true });
                        });

                        await batch.commit();
                  }
            } catch (error) {
                  console.error('Error updating seen status and message count:', error);
            }

      }

      stopListening(roomId: string) {
            const unsub = this.unsubscribeMap.get(roomId);
            if (unsub) {
                  try { unsub(); } catch (e) { /* ignore */ }
                  this.unsubscribeMap.delete(roomId);
            }
            // clear processed ids for the room as well
            this.processedIdsMap.delete(roomId);
      }

      resetPagination(roomId: string) {
            this.lastDocMap.set(roomId, null);
      }

      // ---------------- Chat list (real-time) ----------------
      getChatList(userId: string): Observable<any[]> {
            return new Observable((observer) => {
                  const userDocRef = doc(this.firestore, `users/${userId}`);
                  const usersListRef = collection(userDocRef, 'usersList');
                  const q = query(usersListRef, orderBy('createdAt', 'desc'));

                  const unsubscribe = onSnapshot(q, (snapshot) => {
                        const list = snapshot.docs.map(d => {
                              const data: any = d.data();
                              const createdAt = data.createdAt && (data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt);
                              return { id: d.id, ...data, createdAt };
                        });
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

      // ---------------- utilities ----------------
      private generateRandomString(length = 12) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      }
}
