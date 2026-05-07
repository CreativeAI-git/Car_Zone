// role.service.ts
import { Injectable, signal } from '@angular/core';

export type UserType = 'private' | 'company';

@Injectable({
      providedIn: 'root',
})
export class RoleService {
      private readonly storageKey = 'userType';
      private userType = signal<UserType>('private');
      currentUserType = this.userType.asReadonly();
      currentLoggedInUserType = this.userType.asReadonly();

      constructor() {
            const storedUserType =
                  localStorage.getItem(this.storageKey) ||
                  localStorage.getItem('loggedInUserType') ||
                  localStorage.getItem('selectedUserType') ||
                  localStorage.getItem('loggedInRole');

            if (storedUserType) {
                  this.setUserType(this.normalizeUserType(storedUserType));
            }
      }

      normalizeUserType(value: string | null | undefined): UserType {
            switch ((value || '').toLowerCase()) {
                  case 'company':
                  case 'seller':
                  case 'business':
                        return 'company';
                  case 'private':
                  case 'buyer':
                  case 'personal':
                  default:
                        return 'private';
            }
      }

      setUserType(userType: UserType) {
            const normalizedUserType = this.normalizeUserType(userType);
            this.userType.set(normalizedUserType);
            localStorage.setItem(this.storageKey, normalizedUserType);
            localStorage.removeItem('selectedUserType');
            localStorage.removeItem('loggedInUserType');
            localStorage.removeItem('loggedInRole');
      }

      getUserType(): UserType {
            return this.userType();
      }

      setLoggedInUserType(userType: UserType) {
            this.setUserType(userType);
      }

      getLoggedInUserType(): UserType {
            return this.userType();
      }
}
