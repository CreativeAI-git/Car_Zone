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
  imageChangedEvent: any = '';
  croppedImage: any = '';
  croppedImageBlob: any = '';
  memberImages: { [key: string]: File } = {};
  memberPreviews: { [key: string]: string } = {};
  showroomImages: any[] = [];
  showroomPreviews: any[] = [];
  selectedVideo: File | null = null;
  videoPreview: string | null = null;
  coverImage: any;
  coverPreview: any;
  currentImageType!: 'profile' | 'cover' | 'member';
  currentMemberIndex!: number | null;
  constructor(private fb: FormBuilder, public validationErrorService: ValidationErrorService, private toastr: NzMessageService, private commonService: CommonService, private router: Router, private roleService: RoleService, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.Form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), NoWhitespaceDirective.validate]],
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
      if (this.userData) {

        this.Form.patchValue({
          fullName: this.userData.fullName,
          phoneNumber: this.userData.countryCode + this.userData.phoneNumber,
          whatsappNumber: this.userData.countryCode + this.userData.whatsappNumber,
          isWhatsappSameAsPhone: this.userData.isWhatsappSameAsPhone,
          address: this.userData.address,
          city: this.userData.city,
          pincode: this.userData.pincode,
          websiteUrl: this.userData.websiteUrl,
          tagline: this.userData.tagline,
          description: this.userData.description,
          openingTimes: this.userData.openingTimes,
          advantages: this.userData.advantages,
          services: this.userData.services,
          teamMembers: this.userData.teamMembers,
          companyName: this.userData.companyName,
          companyAddress: this.userData.companyAddress,
          vat: this.userData.vat,
          typeOfSeller: this.userData.roleData.filter((role: any) => role.role === 'seller')[0]?.seller_type || 'personal',
        })
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

  onProfileImage(event: any): void {
    if (event.target.files && event.target.files[0]) {
      this.currentImageType = 'profile';
      this.currentMemberIndex = null;
      this.imageChangedEvent = event;
      this.openModal();
    }
  }

  imageCropped(event: ImageCroppedEvent) {
    this.croppedImageBlob = event.blob
    this.croppedImage = event.objectUrl
  }

  onDone() {
    const croppedFile = new File(
      [this.croppedImageBlob],
      'cropped.jpg',
      { type: 'image/jpeg' }
    );

    const previewUrl = URL.createObjectURL(croppedFile);

    switch (this.currentImageType) {

      case 'profile':
        this.profileImage = croppedFile;
        this.imagePreview = previewUrl;
        break;

      case 'cover':
        this.coverImage = croppedFile;
        this.coverPreview = previewUrl;
        break;

      case 'member':
        if (this.currentMemberIndex !== null) {
          const tempKey = this.teamMembers.at(this.currentMemberIndex).get('tempKey')?.value;
          if (tempKey) {
            this.memberImages[tempKey] = croppedFile;
            this.memberPreviews[tempKey] = previewUrl;
          }
        }
        break;
    }
    this.closeBtn.nativeElement.click();
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
    formData.append('phoneNumber', this.Form.value.phoneNumber.e164Number.slice(this.Form.value.phoneNumber.dialCode.length));
    if (this.profileImage) {
      formData.append('profileImage', this.profileImage);
    }
    formData.append('legalForm', this.Form.value.legalForm);
    formData.append('companyName', this.Form.value.companyName);
    formData.append('companyAddress', this.Form.value.companyAddress);
    formData.append('city', this.Form.value.city);
    formData.append('pincode', this.Form.value.pincode);
    formData.append('vat', this.Form.value.vat);
    formData.append('sellerType', this.Form.value.typeOfSeller);
    formData.append('countryCode', this.Form.value.phoneNumber.dialCode);
    formData.append('isSeller', this.role === 'seller' ? '1' : '0');
    formData.append('tagline', this.Form.value.tagline);
    formData.append('websiteUrl', this.Form.value.websiteUrl);
    formData.append('description', this.Form.value.description);
    formData.append('openingTimes', JSON.stringify(this.Form.value.openingTimes));
    formData.append('advantages', JSON.stringify(this.Form.value.advantages));
    formData.append('services', JSON.stringify(this.Form.value.services));
    if (this.coverImage) {
      formData.append('coverImage', this.coverImage);
    }
    if (this.selectedVideo) {
      formData.append('showroomVideos', this.selectedVideo);
    }
    if (this.showroomImages.length > 0) {
      this.showroomImages.forEach((image: any) => {
        formData.append('showroomImages', image);
      })
    }
    if (this.Form.value.teamMembers) {
      let teamMembers: any[] = []
      this.Form.value.teamMembers.forEach((member: any, index: number) => {
        teamMembers.push({
          tempKey: member.tempKey,
          fullName: member.fullName,
          role: member.role,
          phoneNumber: member.phoneNumber,
          email: member.email,
          languages: member.languages
        })
        const file = this.memberImages[member.tempKey];

        if (file) {
          formData.append(`member_${member.tempKey}`, file);
        }
      })
      formData.append('teamMembers', JSON.stringify(teamMembers));
    }

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
    const tempKey = 'tmp_' + Math.random().toString(36).substring(2, 7);;

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
        tempKey: [tempKey],
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
    const tempKey = 'tmp_' + Math.random().toString(36).substring(2, 7);
    this.teamMembers.push(
      this.fb.group({
        id: [''],
        tempKey: [tempKey],
        fullName: [''],
        role: [''],
        phoneNumber: [''],
        email: [''],
        languages: ['']
      })
    );
  }

  removeTeamMember(index: number) {
    const tempKey = this.teamMembers.at(index).get('tempKey')?.value;
    this.teamMembers.removeAt(index);
    if (tempKey && this.memberImages[tempKey]) {
      delete this.memberImages[tempKey];
      delete this.memberPreviews[tempKey];
    }
  }

  onMemberProfileChange(event: any, index: number) {
    if (event.target.files && event.target.files[0]) {
      this.currentImageType = 'member';
      this.currentMemberIndex = index;
      this.imageChangedEvent = event;
      this.openModal();
    }
  }

  onCoverImageChange(event: any): void {
    if (event.target.files && event.target.files[0]) {
      this.currentImageType = 'cover';
      this.currentMemberIndex = null;
      this.imageChangedEvent = event;
      this.openModal();
    }
  }

  removeCoverImage() {
    this.coverImage = null;
    this.coverPreview = null;
  }

  onShowroomImagesChange(event: any) {
    const files: FileList = event.target.files;

    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {

      this.showroomImages.push(file);

      const reader = new FileReader();

      reader.onload = (e: any) => {
        this.showroomPreviews.push(e.target.result);
      };

      reader.readAsDataURL(file);
    });
  }

  removeShowroomImage(index: number) {
    this.showroomImages.splice(index, 1);
    this.showroomPreviews.splice(index, 1);
  }


  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'video/mp4') {
        alert('Only MP4 videos are allowed');
        return;
      }
      this.selectedVideo = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.videoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeFile() {
    this.selectedVideo = null;
    this.videoPreview = null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
