import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CommonService } from '../../services/common.service';
import { RoleService, UserRole } from '../../services/role.service';

@Component({
  selector: 'app-switch-role',
  imports: [CommonModule, TranslateModule],
  templateUrl: './switch-role.component.html',
  styleUrl: './switch-role.component.css'
})
export class SwitchRoleComponent {
  private destroy$ = new Subject<void>();
  private roleService = inject(RoleService);
  protected readonly currentLoggedInRole = this.roleService.currentLoggedInRole;
  protected readonly currentRole = this.roleService.currentRole;
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

  get isSellerMode(): boolean {
    const role = this.authService.isLogedIn() ? this.currentLoggedInRole() : this.currentRole();
    return role === 'seller';
  }

  onRoleToggle(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.switchRole(isChecked ? 'seller' : 'buyer');
  }

  switchRole(role: UserRole) {
    if (!role) {
      return;
    }

    if (!this.authService.isLogedIn()) {
      this.persistRole(role);
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    this.commonService.post('user/changeMode', { isSeller: role === 'seller' ? 1 : 0 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.success) {
            this.persistRole(role);
            this.reloadMainScript();
            this.commonService.getProfile();
            this.toster.success(res.message || this.translate.instant('common.saveChanges'));
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

  private persistRole(role: UserRole) {
    this.roleService.setRole(role);
    this.roleService.setLoggedInRole(role);
    localStorage.setItem('loggedInRole', role);
  }

  private reloadMainScript() {
    const existingScript = document.querySelector('script[src="js/main.js"]');
    if (existingScript) {
      existingScript.remove();
    }

    const scriptElement = document.createElement('script');
    scriptElement.src = 'js/main.js';
    scriptElement.async = true;
    document.body.appendChild(scriptElement);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
