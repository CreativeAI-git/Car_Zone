import { Component, effect, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { RoleDirective } from '../../directives/role.directive';
import { CommonService } from '../../services/common.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NoWhitespaceDirective } from '../../helper/validators';
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input-gg';
import { ValidationErrorService } from '../../services/validation-error.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { CommonModule } from '@angular/common';
import { RoleService } from '../../services/role.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
declare var bootstrap: any;
@Component({
  selector: 'app-edit-profile',
  imports: [FormsModule, ReactiveFormsModule, NgxIntlTelInputModule, CommonModule, TranslateModule],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.css'
})
export class EditProfileComponent {
  @ViewChild('closeBtn') closeBtn!: ElementRef<HTMLButtonElement>;
  private destroy$ = new Subject<void>();
  userData: any
  Form: FormGroup;
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO;
  selectedCountry = CountryISO.Sweden;
  loading: boolean = false
  profileImage: any
  imagePreview: any
  role: any
  constructor(private fb: FormBuilder, public validationErrorService: ValidationErrorService, private toastr: NzMessageService, private commonService: CommonService, private router: Router, private roleService: RoleService, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.Form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), NoWhitespaceDirective.validate]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      typeOfSeller: ['personal', [Validators.required]],
      legalForm: ['Sole Proprietorship'],
      companyName: [''],
      companyAddress: [''],
      city: [''],
      pincode: [''],
      vat: [''],
    });

    effect(() => {
      this.userData = this.commonService.userData
      this.role = this.roleService.currentRole()
      if (this.userData()) {
        this.Form.patchValue({
          fullName: this.userData().fullName,
          email: this.userData().email,
          phoneNumber: this.userData().countryCode + this.userData().phoneNumber,
          legalForm: this.userData().legalForm,
          companyName: this.userData().companyName,
          companyAddress: this.userData().companyAddress,
          city: this.userData().city,
          pincode: this.userData().pincode,
          vat: this.userData().vat !== 'null' ? this.userData().vat : '',
          typeOfSeller: this.userData().roleData.filter((role: any) => role.role === 'seller')[0]?.seller_type || 'personal',
        })
      }
    })
  }

  ngOnInit(): void {
    this.Form.get('typeOfSeller')?.valueChanges.subscribe((value) => {
      if (value === 'business') {
        this.Form.get('companyName')?.setValidators([Validators.required]);
        this.Form.get('companyAddress')?.setValidators([Validators.required]);
        this.Form.get('city')?.setValidators([Validators.required]);
        this.Form.get('pincode')?.setValidators([Validators.required]);
        this.Form.get('companyName')?.updateValueAndValidity();
        this.Form.get('companyAddress')?.updateValueAndValidity();
        this.Form.get('city')?.updateValueAndValidity();
        this.Form.get('pincode')?.updateValueAndValidity();
      } else {
        this.Form.get('companyName')?.clearValidators();
        this.Form.get('companyAddress')?.clearValidators();
        this.Form.get('city')?.clearValidators();
        this.Form.get('pincode')?.clearValidators();
        this.Form.get('companyName')?.updateValueAndValidity();
        this.Form.get('companyAddress')?.updateValueAndValidity();
        this.Form.get('city')?.updateValueAndValidity();
        this.Form.get('pincode')?.updateValueAndValidity();
      }
    })
  }

  imageChangedEvent: any = '';
  croppedImage: any = '';
  croppedImageBlob: any = '';
  onProfileImage(event: any): void {
    this.imageChangedEvent = event
    if (event.target.files && event.target.files[0]) {
      this.openModal()
    }
  }

  // imageCropped(event: ImageCroppedEvent) {
  //   this.croppedImageBlob = event.blob
  //   this.croppedImage = event.objectUrl
  // }

  onDone() {
    this.imagePreview = this.croppedImage
    this.profileImage = new File([this.croppedImageBlob], 'profile.jpg', {
      type: 'image/jpg'
    })
    this.closeBtn.nativeElement.click()
  }

  openModal() {
    const modalElement = document.getElementById('ct_feedback_detail_modal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  onSubmit() {
    if (this.Form.invalid) {
      this.Form.markAllAsTouched();
      return;
    }
    this.loading = true

    let formData = new FormData();
    formData.append('fullName', this.Form.value.fullName);
    formData.append('email', this.Form.value.email);
    formData.append('phoneNumber', this.Form.value.phoneNumber.e164Number.slice(this.Form.value.phoneNumber.dialCode.length));
    formData.append('legalForm', this.Form.value.legalForm);
    formData.append('companyName', this.Form.value.companyName);
    formData.append('companyAddress', this.Form.value.companyAddress);
    formData.append('city', this.Form.value.city);
    formData.append('pincode', this.Form.value.pincode);
    formData.append('vat', this.Form.value.vat);
    formData.append('typeOfSeller', this.Form.value.typeOfSeller);
    formData.append('profileImage', this.profileImage);
    formData.append('countryCode', this.Form.value.phoneNumber.dialCode);
    formData.append('isSeller', this.role === 'seller' ? '1' : '0');

    this.commonService.post('user/editProfile', formData).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.loading = false
        this.toastr.success(res.message)
        this.commonService.getProfile()
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
