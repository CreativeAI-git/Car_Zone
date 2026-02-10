// role.service.ts
import { Injectable, signal } from '@angular/core';

export type UserRole = 'buyer' | 'seller' | undefined;

@Injectable({
      providedIn: 'root',
})
export class RoleService {
      private role = signal<UserRole>('buyer');
      currentRole = this.role.asReadonly();

      private loggedInRole = signal<UserRole>('buyer');
      currentLoggedInRole = this.loggedInRole.asReadonly();


      constructor() {
            const role = localStorage.getItem('loggedInRole')
            if (role) {
                  this.setLoggedInRole(role as UserRole)
            }
      }

      setRole(role: UserRole) {
            this.role.set(role);
      }

      getRole(): UserRole {
            return this.role();
      }

      setLoggedInRole(role: UserRole) {
            this.loggedInRole.set(role);
      }

      getLoggedInRole(): UserRole {
            return this.loggedInRole();
      }
}
