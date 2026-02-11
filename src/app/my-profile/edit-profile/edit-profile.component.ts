import { Component, effect, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { RoleDirective } from '../../directives/role.directive';
import { CommonService } from '../../services/common.service';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NoWhitespaceDirective } from '../../helper/validators';
import { CountryISO, NgxIntlTelInputModule, SearchCountryField } from 'ngx-intl-tel-input-gg';
import { ValidationErrorService } from '../../services/validation-error.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { CommonModule } from '@angular/common';
import { RoleService } from '../../services/role.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { NzSelectModule } from 'ng-zorro-antd/select';
declare var bootstrap: any;
@Component({
  selector: 'app-edit-profile',
  imports: [FormsModule, ReactiveFormsModule, NgxIntlTelInputModule, CommonModule, NzSelectModule, TranslateModule, ImageCropperComponent],
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
  NoOfDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  defaultServices: string[] = ['Leasing & Financing', 'Fair trade-in prices', 'Warranty & service packages']
  defaultAdvantages: string[] = ['Flexible financing options', 'Certified vehicles', 'Warranty & service packages']
  sellerTypes: any[] = [{
    label: 'PrivateSeller',
    label2: 'ForIndividualSellers',
    value: 'personal'
  }, {
    label: 'OfficialSeller',
    label2: 'ForBusinesses',
    value: 'business'
  }];
  constructor(private fb: FormBuilder, public validationErrorService: ValidationErrorService, private toastr: NzMessageService, private commonService: CommonService, private router: Router, private roleService: RoleService, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.Form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), NoWhitespaceDirective.validate]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      isWhatsappSameAsPhone: [false],
      whatsappNumber: ['', [Validators.required]],
      typeOfSeller: ['personal', [Validators.required]],
      address: ['', [Validators.required, NoWhitespaceDirective.validate]],
      legalForm: ['Sole Proprietorship'],
      companyName: [''],
      companyAddress: [''],
      vat: [''],
      city: ['', [Validators.required, NoWhitespaceDirective.validate]],
      pincode: ['', [Validators.required, NoWhitespaceDirective.validate]],
      websiteUrl: [''],
      tagline: [''],
      description: [''],

      openingTimes: this.fb.array([]),
      advantages: this.fb.array([]),
      services: this.fb.array([]),
      teamMembers: this.fb.array([])
    });
    this.addDefaultRows();

    effect(() => {
      this.userData = this.commonService.userData()
      this.role = this.roleService.currentLoggedInRole()
      if (this.userData()) {

      }
    })
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

  imageChangedEvent: any = '';
  croppedImage: any = '';
  croppedImageBlob: any = '';
  onProfileImage(event: any): void {
    this.imageChangedEvent = event
    if (event.target.files && event.target.files[0]) {
      this.openModal()
    }
  }

  imageCropped(event: ImageCroppedEvent) {
    this.croppedImageBlob = event.blob
    this.croppedImage = event.objectUrl
  }

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

  get openingTimes() {
    return this.Form.get('openingTimes') as FormArray;
  }

  get advantages() {
    return this.Form.get('advantages') as FormArray;
  }

  get services() {
    return this.Form.get('services') as FormArray;
  }

  get teamMembers() {
    return this.Form.get('teamMembers') as FormArray;
  }

  addDefaultRows() {

    this.NoOfDays.forEach((day) => {
      this.openingTimes.push(this.fb.group({
        day: [day],
        open: [''],
        close: ['']
      }));
    });

    this.defaultAdvantages.forEach((advantage) => {
      this.advantages.push(this.fb.group({
        advantage: [advantage]
      }));
    });

    this.defaultServices.forEach((service) => {
      this.services.push(this.fb.group({ service: [service], isActive: [1] }));
    });

    this.teamMembers.push(
      this.fb.group({
        id: [''],
        fullName: [''],
        role: [''],
        phoneNumber: [''],
        email: [''],
        languages: ['']
      })
    );
  }

  addAdvantage() {
    this.advantages.push(this.fb.group({
      advantage: ['']
    }));
  }

  removeAdvantage(index: number) {
    this.advantages.removeAt(index);
  }

  addService() {
    this.services.push(this.fb.group({ service: [''], isActive: [1] }));
  }

  removeService(index: number) {
    this.services.removeAt(index);
  }

  addTeamMember() {
    this.teamMembers.push(
      this.fb.group({
        id: [''],
        fullName: [''],
        role: [''],
        phoneNumber: [''],
        email: [''],
        languages: ['']
      })
    );
  }

  removeTeamMember(index: number) {
    this.teamMembers.removeAt(index);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
