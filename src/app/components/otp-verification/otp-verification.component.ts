import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzInputOtpComponent } from 'ng-zorro-antd/input';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';
import { CommonService } from '../../services/common.service';
import { Subject, takeUntil } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../services/user.service';
import { ModalService } from '../../services/modal.service';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-otp-verification',
  imports: [CommonModule, NzInputOtpComponent, FormsModule, ReactiveFormsModule, SubmitButtonComponent, TranslateModule],
  templateUrl: './otp-verification.component.html',
  styleUrl: './otp-verification.component.css'
})
export class OtpVerificationComponent {
  private destroy$ = new Subject<void>();
  private roleService = inject(RoleService);
  isResendDisabled: boolean = false;
  countdown: number = 60;
  interval: any;
  email: string | undefined
  otp: string = '';
  loading: boolean = false
  isForgotPassword: string | undefined
  password: string | undefined
  accountType: string | undefined
  constructor(
    private toster: NzMessageService,
    private commonService: CommonService,
    private translate: TranslateService,
    private userService: UserService,
    private modal: ModalService,
    private authService: AuthService
  ) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    effect(() => {
      const currentUser = this.getCurrentUserContext();
      this.email = currentUser?.email
      this.password = currentUser?.password
      this.accountType = currentUser?.account_type
      this.isForgotPassword = currentUser?.isForgotPassword
    })
  }

  ngOnInit(): void {
    this.startCountdown()
  }

  startCountdown() {
    this.isResendDisabled = true;
    this.countdown = 60;

    this.interval = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--
      } else {
        this.isResendDisabled = false;
        clearInterval(this.interval);
      }
    }, 1000);
  }

  restrictToNumbers(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }
  resendOtp() {
    this.commonService.post('user/resendOtp', { email: this.email }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.toster.success(res.message)
        this.startCountdown()
      },
      error: (error) => {
        this.toster.error(error)
      }
    })
  }

  verifyOtp() {
    this.loading = true
    const signupUserType = this.roleService.normalizeUserType(
      this.accountType || this.roleService.getUserType()
    );
    let formData = {
      email: this.email,
      otp: this.otp,
      isForgotPasswordPage: Number(this.isForgotPassword)
    }
    this.commonService.post('user/otpVerified', formData).pipe(takeUntil(this.destroy$)).subscribe({
      next: async (res: any) => {
        this.loading = false
        this.otp = ''

        if (this.isForgotPassword === '1') {
          this.modal.openResetPasswordModal()
          return;
        }

        const hasLoggedInFromVerifyResponse = await this.authService.handleAuthResponse(res);
        if (hasLoggedInFromVerifyResponse) {
          this.showPostVerificationSuccessModal(signupUserType);
          return;
        }

        this.loginAfterOtpVerification(signupUserType);
      },
      error: (error) => {
        this.loading = false
        this.toster.error(error)
      }
    })
  }

  private getCurrentUserContext() {
    return this.commonService.currentUser()
      || JSON.parse(sessionStorage.getItem('currentUser') || 'null')
      || JSON.parse(localStorage.getItem('currentUser') || 'null');
  }



  private loginAfterOtpVerification(signupUserType: 'private' | 'company') {
    if (!this.email || !this.password) {
      this.toster.error('Unable to complete login automatically. Please sign in manually.')
      return;
    }

    const loginPayload = {
      email: this.email,
      password: this.password,
      fcmToken: localStorage.getItem('fcm_token') || '',
      userType: this.roleService.normalizeUserType(this.accountType || this.roleService.getUserType())
    };

    this.loading = true;
    this.commonService.post('user/signIn', loginPayload).pipe(takeUntil(this.destroy$)).subscribe({
      next: async (loginRes: any) => {
        this.loading = false;
        await this.authService.handleLoginSuccess(loginRes.data);
        this.showPostVerificationSuccessModal(signupUserType);
      },
      error: (error) => {
        this.loading = false;
        this.toster.error(error)
      }
    });
  }

  private showPostVerificationSuccessModal(userType: 'private' | 'company') {
    if (userType === 'company') {
      this.modal.openVerificationSubmittedModal();
    } else {
      this.modal.openAccountVerifiedModal();
    }
  }
}
