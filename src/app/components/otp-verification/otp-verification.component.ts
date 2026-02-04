import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzInputOtpComponent } from 'ng-zorro-antd/input';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';
import { CommonService } from '../../services/common.service';
import { Subject, takeUntil } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../services/user.service';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-otp-verification',
  imports: [CommonModule, NzInputOtpComponent, FormsModule, ReactiveFormsModule, SubmitButtonComponent, TranslateModule],
  templateUrl: './otp-verification.component.html',
  styleUrl: './otp-verification.component.css'
})
export class OtpVerificationComponent {
  private destroy$ = new Subject<void>();
  isResendDisabled: boolean = false;
  countdown: number = 60;
  interval: any;
  email: string | undefined
  otp: string = '';
  loading: boolean = false
  isForgotPassword: string | undefined
  userName: string
  constructor(private toster: NzMessageService, private commonService: CommonService, private translate: TranslateService, private userService: UserService, private modal: ModalService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.email = sessionStorage.getItem('email') || ''
    this.userName = sessionStorage.getItem('userName') || ''
    this.isForgotPassword = sessionStorage.getItem('isForgotPassword') || ''
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
    let formData = {
      email: this.email,
      otp: this.otp,
      isForgotPasswordPage: Number(this.isForgotPassword)
    }
    this.commonService.post('user/otpVerified', formData).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.loading = false
        this.toster.success(res.message)
        if (this.isForgotPassword === '1') {
          this.modal.openResetPasswordModal()
        } else {
          // this.userService.handleAddOrUpdateUser(res.data.userId, this.userName, '')
          this.modal.openSignInModal()
        }
      },
      error: (error) => {
        this.loading = false
        this.toster.error(error)
      }
    })
  }
}
