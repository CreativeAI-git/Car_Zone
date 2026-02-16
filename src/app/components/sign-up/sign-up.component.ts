import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { QuillModule } from 'ngx-quill';
import { NoWhitespaceDirective, strongPasswordValidator, passwordMismatchValidator } from '../../helper/validators';
import { ValidationErrorService } from '../../services/validation-error.service';
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input-gg';
import { CommonService } from '../../services/common.service';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ModalService } from '../../services/modal.service';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';

@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule, CommonModule, NzSelectModule, QuillModule, FormsModule, NgxIntlTelInputModule, TranslateModule, SubmitButtonComponent],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css'
})
export class SignUpComponent {
  destroy$ = new Subject<void>();
  formStep: number = 2;
  Form: FormGroup;
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO;
  selectedCountry = CountryISO.Sweden;
  loading: boolean = false
  isShowPassword: boolean = false
  isShowConfirmPassword: boolean = false
  submitted: boolean = false
  constructor(private fb: FormBuilder, public validationErrorService: ValidationErrorService, private toastr: NzMessageService, private commonService: CommonService, private router: Router, private translate: TranslateService, public modal: ModalService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.Form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), NoWhitespaceDirective.validate]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      isWhatsappSameAsPhone: [false],
      whatsappNumber: ['', [Validators.required]],
      password: ['', [Validators.required, strongPasswordValidator]],
      confirmPassword: ['', [Validators.required]],
      address: ['', [Validators.required, NoWhitespaceDirective.validate]],
      city: ['', [Validators.required, NoWhitespaceDirective.validate]],
      pincode: ['', [Validators.required, NoWhitespaceDirective.validate]],
      termsAndConditions: [false, [Validators.required]],
    }, {
      validators: [
        passwordMismatchValidator()
      ]
    });
  }

  ngOnInit(): void {
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

    this.loading = true

    let formData = {
      fullName: this.Form.value.fullName,
      email: this.Form.value.email,
      phoneNumber: this.Form.value.phoneNumber.number,
      whatsappNumber: this.Form.value.whatsappNumber.number,
      isWhatsappSameAsPhone: this.Form.value.isWhatsappSameAsPhone,
      password: this.Form.value.password,
      address: this.Form.value.address,
      city: this.Form.value.city,
      pincode: this.Form.value.pincode,
      countryCode: this.Form.value.phoneNumber.dialCode,
      whatsappCountryCode: this.Form.value.whatsappNumber.dialCode,
      language: 'en',
      isSeller: 0
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

  // onSubmit() {
  //   if (this.Form.invalid) {
  //     this.Form.markAllAsTouched();
  //     return;
  //   }

  //   this.loading = true;

  //   const formData = {
  //     fullName: this.Form.value.fullName,
  //     email: this.Form.value.email,
  //     phoneNumber: this.Form.value.phoneNumber.number,
  //     password: this.Form.value.password,
  //     address: this.Form.value.address,
  //     latitude: this.lat,
  //     longitude: this.lng,
  //     countryCode: this.Form.value.phoneNumber.dialCode,
  //     language: 'en',
  //     isSeller: 0
  //   };

  //   // Step 1: Register user on your backend
  //   this.commonService.post('user/signUp', formData).pipe(takeUntil(this.destroy$)).subscribe({
  //     next: async (res: any) => {
  //       try {
  //         // Step 2: Create user in Firebase
  //         const auth = getAuth();
  //         const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

  //         // Step 3: Update Firebase profile with full name
  //         await updateProfile(userCredential.user, {
  //           displayName: formData.fullName
  //         });

  //         console.log('User created in Firebase:', userCredential.user);

  //       } catch (firebaseError: any) {
  //         console.error('Firebase signup error:', firebaseError);
  //       }

  //       this.loading = false;
  //       this.toastr.success(res.message);
  //       sessionStorage.setItem('email', this.Form.value.email);
  //       sessionStorage.setItem('isForgotPassword', '0');
  //       this.router.navigate(['/otp-verification']);
  //     },
  //     error: (error) => {
  //       this.loading = false;
  //       this.toastr.error(error);
  //     }
  //   });
  // }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
