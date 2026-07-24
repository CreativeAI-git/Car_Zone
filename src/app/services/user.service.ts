import { Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class UserService {

    constructor(private firestore: Firestore) { }

    async createUserProfile(user: { uid: string | number; name?: string; avatarUrl?: string | null }) {
        const uidStr = String(user.uid);
        if (!uidStr) return;

        const userRef = doc(this.firestore, 'users', uidStr);
        
        await setDoc(userRef, {
            id: uidStr,
            name: user.name ?? '',
            online: true,
            lastSeen: serverTimestamp(),
            avatarUrl: user.avatarUrl ?? null,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
        }, { merge: true });
    }

    async updateUserProfile(uid: string | number, name: string, avatarUrl: string | null) {
        const uidStr = String(uid);
        if (!uidStr) return;

        const userRef = doc(this.firestore, 'users', uidStr);
        const userDoc = await getDoc(userRef);

        const payload: any = {
            name: name ?? '',
            avatarUrl: avatarUrl ?? null,
            updatedAt: serverTimestamp(),
        };

        if (userDoc.exists()) {
            await updateDoc(userRef, payload);
            console.log('User updated');
        } else {
            await setDoc(userRef, {
                id: uidStr,
                ...payload,
                online: true,
                lastSeen: serverTimestamp(),
                createdAt: serverTimestamp(),
            });
            console.log('New user created');
        }

        // Sync nested info in all chat rooms
        const chatsRef = collection(this.firestore, 'chats');
        const q = query(chatsRef, where('participants', 'array-contains', uidStr));
        const chatsSnap = await getDocs(q);

        if (chatsSnap.empty) return;

        const CHUNK_SIZE = 499;
        const docs = chatsSnap.docs;

        for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
            const batch = writeBatch(this.firestore);
            const chunk = docs.slice(i, i + CHUNK_SIZE);

            chunk.forEach(chatDoc => {
                const docRef = doc(this.firestore, 'chats', chatDoc.id);
                batch.update(docRef, {
                    [`participantsInfo.${uidStr}.name`]: name ?? '',
                    [`participantsInfo.${uidStr}.avatarUrl`]: avatarUrl ?? null,
                });
            });

            await batch.commit();
        }
    }

    getUserSnapshot(uid: string | number, callback: (userData: any) => void) {
        const uidStr = String(uid);
        if (!uidStr) {
            callback(null);
            return () => {};
        }

        const userRef = doc(this.firestore, 'users', uidStr);
        return onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data());
            } else {
                callback(null);
            }
        }, (err) => {
            console.error('User snapshot error:', err);
            callback(null);
        });
    }
}
