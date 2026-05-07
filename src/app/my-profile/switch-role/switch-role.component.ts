import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CommonService } from '../../services/common.service';
import { RoleService, UserType } from '../../services/role.service';

declare global {
  interface Window {
    initMainUi?: () => void;
  }
}

@Component({
  selector: 'app-switch-role',
  imports: [CommonModule, TranslateModule],
  templateUrl: './switch-role.component.html',
  styleUrl: './switch-role.component.css'
})
export class SwitchRoleComponent {
  private destroy$ = new Subject<void>();
  private roleService = inject(RoleService);
  protected readonly currentLoggedInUserType = this.roleService.currentLoggedInUserType;
  protected readonly currentUserType = this.roleService.currentUserType;
  loading = false;

  constructor(
    private authService: AuthService,
    private commonService: CommonService,
    private router: Router,
    private toster: NzMessageService,
    private translate: TranslateService
  ) {
    this.translate.use(localStorage.getItem('lang') || 'en');
  }

  get isCompanyType(): boolean {
    const userType = this.authService.isLogedIn() ? this.currentLoggedInUserType() : this.currentUserType();
    return userType === 'company';
  }

  onUserTypeToggle(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.switchUserType(isChecked ? 'company' : 'private');
  }

  switchUserType(userType: UserType) {
    if (!userType) {
      return;
    }

    if (!this.authService.isLogedIn()) {
      this.persistUserType(userType);
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    this.commonService.post('user/changeMode', { userType })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.success) {
            this.persistUserType(userType);
            window.initMainUi?.();
            this.commonService.getProfile();
            this.toster.success(res.message || this.translate.instant('common.saveChanges'));
            this.loading = false;
            // this.router.navigate(['/']);
            return;
          }

          this.toster.error(res?.message || this.translate.instant('common.tryAgainLater'));
          this.loading = false;
        },
        error: (error: any) => {
          this.loading = false;
          this.toster.error(error?.message || this.translate.instant('common.tryAgainLater'));
        }
      });
  }

  private persistUserType(userType: UserType) {
    this.roleService.setUserType(userType);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
