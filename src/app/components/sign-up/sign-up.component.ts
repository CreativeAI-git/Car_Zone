import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { QuillModule } from 'ngx-quill';
import { NoWhitespaceDirective, passwordMismatchValidator } from '../../helper/validators';
import { ValidationErrorService } from '../../services/validation-error.service';
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input-gg';
import { CommonService } from '../../services/common.service';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ModalService } from '../../services/modal.service';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';
import { RoleService } from '../../services/role.service';

@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule, CommonModule, NzSelectModule, QuillModule, FormsModule, NgxIntlTelInputModule, TranslateModule, SubmitButtonComponent],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css'
})
export class SignUpComponent {
  private roleService = inject(RoleService);
  destroy$ = new Subject<void>();
  formStep: number = 1;
  Form: FormGroup;
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO;
  selectedCountry = CountryISO.Sweden;
  loading: boolean = false
  isShowPassword: boolean = false
  isShowConfirmPassword: boolean = false
  submitted: boolean = false
  userType = this.roleService.currentUserType;

  constructor(private fb: FormBuilder, public validationErrorService: ValidationErrorService, private toastr: NzMessageService, private commonService: CommonService, private router: Router, private translate: TranslateService, public modal: ModalService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.Form = this.fb.group({
      fullName: [''],
      companyName: [''],
      commercialRegisterNumber: [''],
      email: ['', [Validators.required, Validators.email]],
      businessPhone: [''],
      mobilePhone: [''],
      whatsappNumber: [''],
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
      companyAddress: [''],
      city: ['', [Validators.required, NoWhitespaceDirective.validate]],
      postalCode: ['', [Validators.required, NoWhitespaceDirective.validate]],
      termsAndConditions: [false, [Validators.required]],
    }, {
      validators: [
        passwordMismatchValidator()
      ]
    });

    effect(() => {
      const selectedUserType = this.userType();
      this.formStep = 1;
      this.submitted = false;
      this.applyUserTypeValidators(selectedUserType);
    });
  }

  ngOnInit(): void {
  }

  nextStep() {
    const firstStepControls = this.isCompanyUserType
      ? ['companyName', 'email', 'businessPhone', 'password', 'confirmPassword']
      : ['fullName', 'email', 'password', 'confirmPassword'];

    const hasInvalidField = firstStepControls.some((controlName) => {
      const control = this.Form.get(controlName);
      control?.markAsTouched();
      return !!control?.invalid;
    });

    if (hasInvalidField) {
      return;
    }

    this.formStep = this.formStep + 1
  }

  onSubmit() {
    if (this.Form.invalid) {
      this.Form.markAllAsTouched();
      return;
    }
    if (!this.Form.get('termsAndConditions')?.value) {
      this.submitted = true;
      return;
    }

    this.loading = true

    const formData = this.isCompanyUserType
      ? {
        account_type: 'company',
        companyName: this.Form.value.companyName,
        commercialRegisterNumber: this.Form.value.commercialRegisterNumber,
        companyAddress: this.Form.value.companyAddress,
        city: this.Form.value.city,
        postalCode: this.Form.value.postalCode,
        email: this.Form.value.email,
        businessPhone: this.getPhoneValue(this.Form.value.businessPhone),
        mobilePhone: this.getPhoneValue(this.Form.value.mobilePhone),
        whatsappNumber: this.getPhoneValue(this.Form.value.whatsappNumber),
        password: this.Form.value.password,
        language: 'en'
      }
      : {
        account_type: 'private',
        fullName: this.Form.value.fullName,
        email: this.Form.value.email,
        password: this.Form.value.password,
        confirm_password: this.Form.value.confirmPassword,
        language: 'en'
      };

    this.commonService.post('user/signUp', formData).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.loading = false
        this.toastr.success(res.message)
        let currentUser = {
          email: this.Form.value.email,
          isForgotPassword: '0'
        }
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser))
        this.commonService.currentUser.set(currentUser)
        this.Form.reset()
        this.modal.openOtpVerificationModal()
      },
      error: (error) => {
        this.loading = false
        this.toastr.error(error)
      }
    })
  }

  get isCompanyUserType(): boolean {
    return this.userType() === 'company';
  }

  private applyUserTypeValidators(userType: 'private' | 'company') {
    const fullName = this.Form.get('fullName');
    const companyName = this.Form.get('companyName');
    const commercialRegisterNumber = this.Form.get('commercialRegisterNumber');
    const businessPhone = this.Form.get('businessPhone');
    const mobilePhone = this.Form.get('mobilePhone');
    const whatsappNumber = this.Form.get('whatsappNumber');
    const companyAddress = this.Form.get('companyAddress');
    const city = this.Form.get('city');
    const postalCode = this.Form.get('postalCode');

    if (userType === 'company') {
      fullName?.clearValidators();
      companyName?.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(50), NoWhitespaceDirective.validate]);
      commercialRegisterNumber?.clearValidators();
      businessPhone?.setValidators([Validators.required]);
      mobilePhone?.clearValidators();
      whatsappNumber?.clearValidators();
      companyAddress?.setValidators([Validators.required, NoWhitespaceDirective.validate]);
      city?.clearValidators();
      postalCode?.clearValidators();
    } else {
      fullName?.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(20), NoWhitespaceDirective.validate]);
      companyName?.clearValidators();
      commercialRegisterNumber?.clearValidators();
      businessPhone?.clearValidators();
      mobilePhone?.clearValidators();
      whatsappNumber?.clearValidators();
      companyAddress?.clearValidators();
      city?.clearValidators();
      postalCode?.clearValidators();
    }

    ['fullName', 'companyName', 'commercialRegisterNumber', 'businessPhone', 'mobilePhone', 'whatsappNumber', 'companyAddress', 'city', 'postalCode'].forEach((controlName) => {
      this.Form.get(controlName)?.updateValueAndValidity();
    });
  }

  private getPhoneValue(phone: any): string {
    return phone?.e164Number || phone?.internationalNumber || phone?.number || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
