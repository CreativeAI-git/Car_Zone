import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CommonService } from './common.service';
import { RoleService } from './role.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
      constructor(private router: Router, private roleService: RoleService) { }

      setValues(token: string, userInfo: any) {
            localStorage.setItem('CarZoneToken', token)
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
      }

      getToken() {
            return localStorage.getItem('CarZoneToken');
      };

      getUserInfo() {
            return JSON.parse(localStorage.getItem('userInfo') || '{}');
      }

      isLogedIn() {
            return this.getToken() !== null
      }

      logout(): void {
            localStorage.removeItem('CarZoneToken');
            localStorage.removeItem('userInfo');
            localStorage.removeItem('app_role');
            localStorage.removeItem('loggedInRole');
            this.roleService.setRole('buyer');
            this.roleService.setLoggedInRole('buyer');
      };
}