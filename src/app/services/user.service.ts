import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, serverTimestamp, getDoc, updateDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class UserService {

    // constructor(private firestore: Firestore) { }

    // handleAddUserInFirestore(userId: string, userName: string) {
    //     const userRef = doc(this.firestore, `users/${userId}`);

    //     return setDoc(userRef, {
    //         id: userId,
    //         name: userName,
    //         status: 'Online',
    //         createdAt: serverTimestamp(),
    //     });
    // }

    // async handleAddOrUpdateUser(userId: string, userName: string, profileImage: string) {
    //     try {
    //         const userRef = doc(this.firestore, `users/${userId}`);
    //         const userSnap = await getDoc(userRef);

    //         const payload: any = {
    //             name: userName,
    //             updatedAt: serverTimestamp(),
    //         };

    //         if (profileImage !== '') {
    //             payload.avatar = profileImage;
    //         }

    //         if (userSnap.exists()) {
    //             // 🔹 Update existing user
    //             await updateDoc(userRef, payload);
    //             console.log("User updated");
    //         } else {
    //             // 🔹 Create new user
    //             await setDoc(userRef, {
    //                 id: userId,
    //                 name: userName,
    //                 status: 'Online',
    //                 usersList: [],
    //                 avatar: profileImage || '',
    //                 createdAt: serverTimestamp(),
    //             });

    //             console.log("New user created");
    //         }

    //     } catch (error) {
    //         console.error("Error in Firestore operation:", error);
    //     }
    // }
}
