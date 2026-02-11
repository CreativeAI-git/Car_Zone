import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { QuillModule } from 'ngx-quill';
import { NoWhitespaceDirective, strongPasswordValidator, passwordMatchValidator, passwordMismatchValidator } from '../../helper/validators';
import { ValidationErrorService } from '../../services/validation-error.service';
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input-gg';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';
import { CommonService } from '../../services/common.service';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-seller-sign-up',
  imports: [ReactiveFormsModule, CommonModule, NzSelectModule, QuillModule, FormsModule, NgxIntlTelInputModule, SubmitButtonComponent, TranslateModule],
  templateUrl: './seller-sign-up.component.html',
  styleUrl: './seller-sign-up.component.css'
})
export class SellerSignUpComponent {
  private destroy$ = new Subject<void>();
  Form: FormGroup;
  formStep: number = 1;
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO;
  selectedCountry = CountryISO.Sweden;
  loading: boolean = false
  isShowPassword: boolean = false
  isShowConfirmPassword: boolean = false
  sellerTypes: any[] = [{
    label: 'PrivateSeller',
    label2: 'ForIndividualSellers',
    value: 'personal'
  }, {
    label: 'OfficialSeller',
    label2: 'ForBusinesses',
    value: 'business'
  }];

  submitted: boolean = false;

  selectedSellerType: string = 'personal';
  constructor(private fb: FormBuilder, public validationErrorService: ValidationErrorService, private toastr: NzMessageService, private commonService: CommonService, private translate: TranslateService, public modal: ModalService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.Form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), NoWhitespaceDirective.validate]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      isWhatsappSameAsPhone: [false],
      whatsappNumber: ['', [Validators.required]],
      typeOfSeller: ['personal', [Validators.required]],
      password: ['', [Validators.required, strongPasswordValidator]],
      confirmPassword: ['', [Validators.required]],
      address: ['', [Validators.required, NoWhitespaceDirective.validate]],
      legalForm: ['Sole Proprietorship'],
      companyName: [''],
      companyAddress: [''],
      city: ['', [Validators.required, NoWhitespaceDirective.validate]],
      pincode: ['', [Validators.required, NoWhitespaceDirective.validate]],
      vat: [''],
      termsAndConditions: [false, [Validators.required]],
    }, {
      validators: [
        passwordMatchValidator(),
        passwordMismatchValidator()
      ]
    });

  }

  ngOnInit(): void {
    this.Form.get('typeOfSeller')?.valueChanges.subscribe((value) => {
      if (value === 'business') {
        this.Form.get('companyName')?.setValidators([Validators.required, NoWhitespaceDirective.validate]);
        this.Form.get('companyAddress')?.setValidators([Validators.required, NoWhitespaceDirective.validate]);
        this.Form.get('companyName')?.updateValueAndValidity();
        this.Form.get('companyAddress')?.updateValueAndValidity();
        this.Form.get('address')?.clearValidators();
        this.Form.get('address')?.updateValueAndValidity();
      } else {
        this.Form.get('companyName')?.clearValidators();
        this.Form.get('companyAddress')?.clearValidators();
        this.Form.get('companyName')?.updateValueAndValidity();
        this.Form.get('companyAddress')?.updateValueAndValidity();
        this.Form.get('address')?.setValidators([Validators.required, NoWhitespaceDirective.validate]);
        this.Form.get('address')?.updateValueAndValidity();
      }
    })
    this.Form.get('isWhatsappSameAsPhone')?.valueChanges.subscribe((value) => {
      if (value) {
        this.Form.get('phoneNumber')?.setValue(this.Form.get('whatsappNumber')?.value);
      } else {
        this.Form.get('phoneNumber')?.setValue('');
      }
    })
  }

  nextStep() {
    if (this.Form.get('fullName')?.invalid || this.Form.get('email')?.invalid || this.Form.get('phoneNumber')?.invalid || this.Form.get('whatsappNumber')?.invalid || this.Form.get('password')?.invalid || this.Form.get('confirmPassword')?.invalid) {
      this.Form.get('fullName')?.markAsTouched();
      this.Form.get('email')?.markAsTouched();
      this.Form.get('whatsappNumber')?.markAsTouched();
      this.Form.get('phoneNumber')?.markAsTouched();
      this.Form.get('password')?.markAsTouched();
      this.Form.get('confirmPassword')?.markAsTouched();
      return
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

    let formData = {
      fullName: this.Form.value.fullName,
      email: this.Form.value.email,
      phoneNumber: this.Form.value.phoneNumber.number,
      typeOfSeller: this.Form.value.typeOfSeller,
      whatsappNumber: this.Form.value.whatsappNumber.number,
      isWhatsappSameAsPhone: this.Form.value.isWhatsappSameAsPhone,
      password: this.Form.value.password,
      address: this.Form.value.address,
      legalForm: this.Form.value.legalForm,
      companyName: this.Form.value.companyName,
      companyAddress: this.Form.value.companyAddress,
      city: this.Form.value.city,
      pincode: this.Form.value.pincode,
      vat: this.Form.value.vat,
      countryCode: this.Form.value.phoneNumber.dialCode,
      language: 'en',
      isSeller: 1
    }

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
