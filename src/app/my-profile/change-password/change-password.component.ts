import { Component } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonService } from '../../services/common.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { passwordMatchValidator, passwordMismatchValidator, strongPasswordValidator } from '../../helper/validators';
import { CommonModule } from '@angular/common';
import { ValidationErrorService } from '../../services/validation-error.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SubmitButtonComponent } from '../../components/shared/submit-button/submit-button.component';

@Component({
  selector: 'app-change-password',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SubmitButtonComponent, TranslateModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css'
})
export class ChangePasswordComponent {
  Form!: FormGroup
  isShowCurrentPassword: boolean = false;
  isShowNewPassword: boolean = false;
  isShowConfPassword: boolean = false;
  loading: boolean = false
  constructor(private service: CommonService, private toster: NzMessageService, public validationErrorService: ValidationErrorService, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.initForm()
  }

  initForm() {
    this.Form = new FormGroup({
      password: new FormControl('', Validators.required),
      newPassword: new FormControl('', [Validators.required, strongPasswordValidator]),
      confirmPassword: new FormControl('', Validators.required),
    }, {
      validators: [
        passwordMatchValidator(),
        passwordMismatchValidator()
      ]
    });
  }

  onSubmit() {
    if (this.Form.invalid) {
      this.Form.markAllAsTouched();
      return
    }
    this.loading = true
    let formData = {
      old_password: this.Form.value.password,
      new_password: this.Form.value.newPassword,
      confirm_password: this.Form.value.confirmPassword
    }
    this.service.post<any, any>('user/changePassword', formData).subscribe({
      next: (res: any) => {
        if (res.status) {
          this.toster.success(res.message);
          this.Form.reset();
          this.loading = false
        } else {
          this.toster.error(res.message);
          this.loading = false
        }
      },
      error: (error) => {
        this.toster.error(error);
        this.loading = false
      }
    })
  }
}
