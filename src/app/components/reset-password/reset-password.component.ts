import { Component, effect } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup, Validators, FormControl } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../services/common.service';
import { ValidationErrorService } from '../../services/validation-error.service';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';
import { passwordMismatchValidator, strongPasswordValidator } from '../../helper/validators';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, ReactiveFormsModule, SubmitButtonComponent, CommonModule, TranslateModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {
  private destroy$ = new Subject<void>()
  Form: FormGroup;
  loading: boolean = false
  isShowNewPassword: boolean = false;
  isShowConfPassword: boolean = false;
  email: string | undefined
  constructor(private commonService: CommonService, public validationErrorService: ValidationErrorService, private toastr: NzMessageService, private translate: TranslateService, private modal: ModalService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    effect(() => {
      if (this.commonService.currentUser()) {
        this.email = this.commonService.currentUser()?.email
      } else {
        this.email = JSON.parse(localStorage.getItem('currentUser') || '{}').email
      }
    })

    this.Form = new FormGroup({
      newPassword: new FormControl('', [Validators.required, strongPasswordValidator]),
      confirmPassword: new FormControl('', Validators.required),
    }, {
      validators: [
        passwordMismatchValidator()
      ]
    });
  }

  onSubmit() {
    if (this.Form.invalid) {
      this.Form.markAllAsTouched();
      return;
    }

    this.loading = true
    let formData = {
      email: this.email,
      new_password: this.Form.value.newPassword,
      confirm_password: this.Form.value.confirmPassword
    }

    this.commonService.post('user/resetPassword', formData).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.loading = false
        this.toastr.success(res.message)
        this.modal.openSignInModal()
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
