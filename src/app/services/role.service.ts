// role.service.ts
import { Injectable, signal } from '@angular/core';

export type UserType = 'private' | 'company';

@Injectable({
      providedIn: 'root',
})
export class RoleService {
      private userType = signal<UserType>('private');
      currentUserType = this.userType.asReadonly();

      private loggedInUserType = signal<UserType>('private');
      currentLoggedInUserType = this.loggedInUserType.asReadonly();


      constructor() {
            const selectedUserType = localStorage.getItem('selectedUserType');
            const loggedInUserType = localStorage.getItem('loggedInUserType') || localStorage.getItem('loggedInRole');

            if (selectedUserType) {
                  this.setUserType(this.normalizeUserType(selectedUserType));
            }

            if (loggedInUserType) {
                  this.setLoggedInUserType(this.normalizeUserType(loggedInUserType));
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
            this.userType.set(userType);
            localStorage.setItem('selectedUserType', userType);
      }

      getUserType(): UserType {
            return this.userType();
      }

      setLoggedInUserType(userType: UserType) {
            this.loggedInUserType.set(userType);
            localStorage.setItem('loggedInUserType', userType);
      }

      getLoggedInUserType(): UserType {
            return this.loggedInUserType();
      }
}
