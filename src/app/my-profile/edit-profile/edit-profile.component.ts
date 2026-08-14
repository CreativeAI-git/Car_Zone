import { Component, effect, ElementRef, ViewChild } from '@angular/core';
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
import { SubmitButtonComponent } from "../../components/shared/submit-button/submit-button.component";
import { VerificationStatusModalComponent } from "../../components/shared/verification-status-modal/verification-status-modal.component";
declare var bootstrap: any;
@Component({
  selector: 'app-edit-profile',
  imports: [FormsModule, ReactiveFormsModule, NgxIntlTelInputModule, CommonModule, NzSelectModule, TranslateModule, ImageCropperComponent, SubmitButtonComponent, VerificationStatusModalComponent],
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
  selectedCountry = CountryISO.Switzerland;
  allowedCountries: CountryISO[] = [
    CountryISO.Switzerland,
    CountryISO.France,
    CountryISO.Germany,
    CountryISO.Italy,
    CountryISO.Spain
  ];
  loading: boolean = false
  profileImage: any
  imagePreview: any
  NoOfDays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  defaultServices: string[] = ['profile.defaultServiceLeasingAndFinancing', 'profile.defaultServiceFairTradeInPrices', 'profile.defaultServiceWarrantyAndServicePackages']
  defaultAdvantages: string[] = ['profile.defaultAdvantageFlexibleFinancingOptions', 'profile.defaultAdvantageCertifiedVehicles', 'profile.defaultAdvantageWarrantyAndServicePackages']
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
  constructor(private fb: FormBuilder, public validationErrorService: ValidationErrorService, private toastr: NzMessageService, private commonService: CommonService, private roleService: RoleService, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.Form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), NoWhitespaceDirective.validate]],
      email: ['', [Validators.required, Validators.email]],
      businessPhone: [''],
      mobilePhone: [''],
      whatsappNumber: [''],
      userType: ['private', [Validators.required]],
      address: [''],
      legalForm: ['Sole Proprietorship'],
      companyName: [''],
      companyAddress: [''],
      commercialRegisterNumber: [''],
      city: [''],
      pincode: [''],
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
      if (this.userData) {
        const userType = this.resolveUserType(this.userData);
        this.Form.patchValue({
          fullName: this.userData.fullName,
          email: this.userData.email,
          businessPhone: this.userData.businessPhone,
          mobilePhone: this.userData.mobilePhone,
          whatsappNumber: this.userData.whatsappNumber,
          address: this.userData.fullAddress,
          city: this.userData.city,
          pincode: this.userData.pincode,
          websiteUrl: this.userData.websiteUrl,
          tagline: this.userData.tagline,
          description: this.userData.description,
          advantages: this.userData.advantages,
          services: this.userData.services,
          companyName: this.userData.companyName,
          companyAddress: this.userData.companyAddress,
          commercialRegisterNumber: this.userData.commercialRegisterNumber || this.userData.commercial_register_number,
          legalForm: this.userData.legalForm,
          userType: this.userData.account_type,
        })
        this.applyUserTypeValidators(userType);
        this.imagePreview = this.userData.profileImage
        this.patchServices(this.userData.services);
        this.patchAdvantages(this.userData.advantages);
        this.patchTeamMembers(this.userData.teamMembers);
        this.patchOpeningTimes(this.userData.openingTimes);
        this.coverPreview = this.userData.coverImage
        this.showroomPreviews = this.userData.showroomImages
        this.videoPreview = this.userData.showroomVideos ? this.userData?.showroomVideos[0] : null
      }
    })
  }

  patchAdvantages(data: any[]) {
    this.advantages.clear();
    data?.forEach(adv => {
      this.advantages.push(
        this.fb.group({
          advantage: [adv]
        })
      );
    });
  }

  patchServices(data: any[]) {
    this.services.clear();
    data?.forEach(service => {
      this.services.push(
        this.fb.group({
          service_name: [service.service_name],
          isActive: [service.isActive]
        })
      );
    });
  }

  patchTeamMembers(data: any[]) {
    this.teamMembers.clear();
    data?.forEach((member) => {
      this.teamMembers.push(
        this.fb.group({
          id: [member.id],
          tempKey: [member.id],
          fullName: [member.fullName],
          role: [member.role],
          phoneNumber: [member.phoneNumber],
          email: [member.email],
          languages: [member.languages]
        })
      );
      this.memberPreviews[member.id] = member.profilePhoto;
    });
  }

  patchOpeningTimes(data: any[]) {
    this.openingTimes.clear();
    this.NoOfDays.forEach((day: string) => {
      const matchedDay = data?.find(
        (d: any) => d.day.toLowerCase() === day.toLowerCase()
      );

      this.openingTimes.push(
        this.fb.group({
          day: [day],
          open_time: [matchedDay ? matchedDay.open_time : ''],
          close_time: [matchedDay ? matchedDay.close_time : ''],
          is_closed: [matchedDay ? matchedDay.is_closed : 0]
        })
      );
    });
  }

  ngOnInit(): void {
    this.Form.get('userType')?.valueChanges.subscribe((value) => {
      this.applyUserTypeValidators(value);
    })
    this.applyUserTypeValidators(this.Form.get('userType')?.value);
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

    const displayName = this.isCompanyUserType ? this.Form.value.companyName : this.Form.value.fullName;
    this.appendIfExists(formData, 'fullName', displayName);
    this.appendIfExists(formData, 'email', this.Form.value.email);
    this.appendIfExists(formData, 'account_type', this.Form.value.userType);

    if (!this.isCompanyUserType) {
      if (this.profileImage) {
        formData.append('profileImage', this.profileImage);
      }

      this.submitProfileUpdate(formData);
      return;
    }

    this.appendIfExists(formData, 'businessPhone', this.getPhoneValue(this.Form.value.businessPhone));
    this.appendIfExists(formData, 'mobilePhone', this.getPhoneValue(this.Form.value.mobilePhone));
    this.appendIfExists(formData, 'whatsappNumber', this.getPhoneValue(this.Form.value.whatsappNumber));

    if (this.profileImage) {
      formData.append('profileImage', this.profileImage);
    }

    this.appendIfExists(formData, 'legalForm', this.Form.value.legalForm);
    this.appendIfExists(formData, 'companyName', this.Form.value.companyName);
    this.appendIfExists(formData, 'companyAddress', this.Form.value.companyAddress);
    this.appendIfExists(formData, 'fullAddress', this.Form.value.address);
    this.appendIfExists(formData, 'city', this.Form.value.city);
    this.appendIfExists(formData, 'pincode', this.Form.value.pincode);
    this.appendIfExists(formData, 'commercialRegisterNumber', this.Form.value.commercialRegisterNumber);
    this.appendIfExists(formData, 'tagline', this.Form.value.tagline);
    this.appendIfExists(formData, 'websiteUrl', this.Form.value.websiteUrl);
    this.appendIfExists(formData, 'description', this.Form.value.description);

    if (this.Form.value.openingTimes?.length) {
      formData.append('openingTimes', JSON.stringify(this.Form.value.openingTimes));
    }

    if (this.Form.value.advantages?.length) {
      formData.append('advantages', JSON.stringify(this.Form.value.advantages));
    }

    if (this.Form.value.services?.length) {
      formData.append('services', JSON.stringify(this.Form.value.services));
    }

    if (this.coverImage) {
      formData.append('coverImage', this.coverImage);
    }

    if (this.selectedVideo) {
      formData.append('showroomVideos', this.selectedVideo);
    }

    if (this.showroomImages?.length > 0) {
      this.showroomImages.forEach((image: any) => {
        formData.append('showroomImages', image);
      });
    }
    if (this.Form.value.teamMembers) {
      let teamMembers: any[] = []
      this.Form.value.teamMembers.forEach((member: any) => {
        const file = this.memberImages[member.tempKey];
        const memberPayload: any = {
          id: member.id,
          fullName: member.fullName,
          role: member.role,
          phoneNumber: member.phoneNumber,
          email: member.email,
          languages: member.languages
        };
        if (file && memberPayload.fullName) {
          memberPayload.tempKey = member.tempKey;
          formData.append(`member_${member.tempKey}`, file);
        }
        if (memberPayload.fullName) {
          teamMembers.push(memberPayload);
        }
      });

      formData.append('teamMembers', JSON.stringify(teamMembers));
    }

    this.submitProfileUpdate(formData);
  }

  submitProfileUpdate(formData: FormData) {
    const isFirstTimeCompanySwitch = this.isFirstTimeCompanySwitch();

    this.commonService.post('user/editProfile', formData).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.loading = false
        if (isFirstTimeCompanySwitch) {
          this.openCompanyRequestSuccessModal();
        } else {
          this.toastr.success(res.message)
        }
        this.commonService.getProfile()
      },
      error: (error) => {
        this.loading = false
        this.toastr.error(error?.message || this.translate.instant('profile.unableToUpdateProfile'))
      }
    })
  }

  appendIfExists(formData: FormData, key: string, value: any) {
    if (
      value !== null &&
      value !== undefined &&
      value !== '' &&
      !(typeof value === 'string' && value.trim() === '')
    ) {
      formData.append(key, value);
    }
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

  get isCompanyUserType(): boolean {
    return this.Form.get('userType')?.value === 'company';
  }

  get profileDisplayName(): string {
    if (this.isCompanyUserType) {
      return this.Form.get('companyName')?.value || this.userData?.companyName || this.userData?.fullName || '';
    }

    return this.Form.get('fullName')?.value || this.userData?.fullName || '';
  }

  private applyUserTypeValidators(userType: 'private' | 'company') {
    const privateOnlyRequiredControls = ['fullName'];
    const companyOnlyRequiredControls = ['businessPhone', 'city', 'pincode', 'companyName', 'companyAddress'];
    const companyOptionalPhoneControls = ['mobilePhone', 'whatsappNumber'];
    const optionalCompanyControls = ['legalForm', 'vat', 'websiteUrl', 'tagline', 'description', 'address'];

    if (userType === 'company') {
      privateOnlyRequiredControls.forEach((controlName) => this.clearControlValidators(controlName));
      this.setControlValidators('businessPhone', [Validators.required]);
      this.setControlValidators('city', [Validators.required, NoWhitespaceDirective.validate]);
      this.setControlValidators('pincode', [Validators.required, NoWhitespaceDirective.validate]);
      this.setControlValidators('companyName', [Validators.required, NoWhitespaceDirective.validate]);
      this.setControlValidators('companyAddress', [Validators.required, NoWhitespaceDirective.validate]);
      companyOptionalPhoneControls.forEach((controlName) => this.clearControlValidators(controlName));
      optionalCompanyControls.forEach((controlName) => this.clearControlValidators(controlName));
      return;
    }

    this.setControlValidators('fullName', [Validators.required, Validators.minLength(3), Validators.maxLength(20), NoWhitespaceDirective.validate]);
    companyOnlyRequiredControls.forEach((controlName) => this.clearControlValidators(controlName));
    companyOptionalPhoneControls.forEach((controlName) => this.clearControlValidators(controlName));
    optionalCompanyControls.forEach((controlName) => this.clearControlValidators(controlName));
  }

  private getPhoneValue(phone: any): string {
    return phone?.e164Number || phone?.internationalNumber || phone?.number || phone || '';
  }

  private setControlValidators(controlName: string, validators: any[]) {
    const control = this.Form.get(controlName);
    control?.setValidators(validators);
    control?.updateValueAndValidity({ emitEvent: false });
  }

  private clearControlValidators(controlName: string) {
    const control = this.Form.get(controlName);
    control?.clearValidators();
    control?.updateValueAndValidity({ emitEvent: false });
  }

  private resolveUserType(userData: any): 'private' | 'company' {
    const normalizedType = this.roleService.normalizeUserType(
      userData?.account_type
    );
    if (normalizedType === 'company') {
      return 'company';
    }
    return userData?.companyName || userData?.companyAddress ? 'company' : 'private';
  }

  private isFirstTimeCompanySwitch(): boolean {
    const previousUserType = this.resolveUserType(this.userData);
    const selectedUserType = this.roleService.normalizeUserType(this.Form.get('userType')?.value);

    return previousUserType === 'private' && selectedUserType === 'company';
  }

  private openCompanyRequestSuccessModal() {
    const modalElement = document.getElementById('companyRequestSuccessModal');
    if (!modalElement) {
      return;
    }

    const modal = new bootstrap.Modal(modalElement, {
      backdrop: 'static',
      keyboard: false
    });
    modal.show();
  }

  addDefaultRows() {
    const tempKey = Math.random().toString(36).substring(2, 7);

    this.NoOfDays.forEach((_day) => {
      this.openingTimes.push(this.fb.group({
        day: [_day],
        open_time: [''],
        close_time: ['']
      }));
    });

    this.defaultAdvantages.forEach((advantage) => {
      this.advantages.push(this.fb.group({
        advantage: [this.translate.instant(advantage)]
      }));
    });

    this.defaultServices.forEach((service) => {
      this.services.push(this.fb.group({ service_name: [this.translate.instant(service)], isActive: [1] }));
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
    this.services.push(this.fb.group({ service_name: [''], isActive: [1] }));
  }

  removeService(index: number) {
    this.services.removeAt(index);
  }

  addTeamMember() {
    const tempKey = Math.random().toString(36).substring(2, 7);
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
        alert(this.translate.instant('profile.onlyMp4VideosAreAllowed'));
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
