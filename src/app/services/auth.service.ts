import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CommonService } from './common.service';
import { RoleService } from './role.service';
import { ModalService } from './modal.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
      constructor(
            private router: Router,
            private roleService: RoleService,
            private commonService: CommonService,
            private modalService: ModalService
      ) { }

      setValues(token: string, userInfo: any) {
            localStorage.setItem('CarZoneToken', token)
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
      }

      async handleLoginSuccess(authData: any) {
            const token =
                  authData?.jwt_token ||
                  authData?.token ||
                  authData?.access_token;
            const userInfo =
                  authData?.userId ||
                  authData?.user?.id ||
                  authData?.id;

            if (!token || !userInfo) {
                  throw new Error('Missing authentication data');
            }

            this.setValues(token, userInfo);

            const userType = this.roleService.normalizeUserType(
                  authData?.account_type ||
                  authData?.userType ||
                  authData?.role ||
                  authData?.user?.account_type ||
                  authData?.user?.userType ||
                  authData?.user?.role
            );

            this.roleService.setUserType(userType);
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('currentUser');
            this.commonService.currentUser.set(null);
            await this.modalService.closeActiveModal();
            this.commonService.getProfile();
      }

      async handleAuthResponse(response: any): Promise<boolean> {
            const authData = response?.data || response;

            try {
                  await this.handleLoginSuccess(authData);
                  return true;
            } catch {
                  return false;
            }
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
            localStorage.removeItem('loggedInRole');
            localStorage.removeItem('loggedInUserType');
            localStorage.removeItem('selectedUserType');
            localStorage.removeItem('userType');
            this.roleService.setUserType('private');
      };
}
