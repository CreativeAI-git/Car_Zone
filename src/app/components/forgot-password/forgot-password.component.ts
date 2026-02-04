import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonService } from '../../services/common.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ValidationErrorService } from '../../services/validation-error.service';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, ReactiveFormsModule, SubmitButtonComponent, TranslateModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  private destroy$ = new Subject<void>()
  Form: FormGroup;
  loading: boolean = false

  constructor(private commonService: CommonService, private fb: FormBuilder, public validationErrorService: ValidationErrorService, private toastr: NzMessageService, private translate: TranslateService, public modal: ModalService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.Form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    })
  }

  onSubmit() {
    if (this.Form.invalid) {
      this.Form.markAllAsTouched();
      return;
    }

    this.loading = true
    let formData = {
      email: this.Form.value.email,
    }

    this.commonService.post('user/forgotPassword', formData).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.loading = false
        this.toastr.success(res.message)
        sessionStorage.setItem('email', this.Form.value.email)
        sessionStorage.setItem('isForgotPassword', '1')
        this.modal.openOtpVerificationModal()
      },
      error: (error) => {
        this.loading = false
        this.toastr.error(error)
      }
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
