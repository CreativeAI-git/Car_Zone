import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, first, Subject, takeUntil } from 'rxjs';
import { carData } from '../../../helper/carData';
import { CommonService } from '../../../services/common.service';
import { NoWhitespaceDirective } from '../../../helper/validators';
import { ValidationErrorService } from '../../../services/validation-error.service';
import { CarPreviewComponent } from './car-preview/car-preview.component';
import { ChfFormatPipe } from '../../../pipes/chf-format.pipe';
import { SearchCountryField, CountryISO, NgxIntlTelInputModule } from 'ngx-intl-tel-input-gg';

@Component({
  selector: 'app-list-your-car',
  imports: [FormsModule, NzSelectModule, ReactiveFormsModule, NgxIntlTelInputModule, CommonModule, ChfFormatPipe, TranslateModule, CarPreviewComponent],
  templateUrl: './list-your-car.component.html',
  styleUrl: './list-your-car.component.css'
})
export class ListYourCarComponent {
  private destroy$ = new Subject<void>();
  carFormOne!: FormGroup;
  carImages: File[] = [];
  carImagePreviews: { file: File | null; url: string; isRemote?: boolean }[] = [];
  selectedReel: File | null = null;
  reelPreviewUrl: string | null = null;
  reelThumbnail: File | null = null;
  reelThumbnailPreviewUrl: string | null = null;
  loading: boolean = false;
  submitError: string | null = null;
  fuelTypes: any[] = [];
  transmissions: any[] = [];
  conditions: any[] = [];
  driveTypes: any[] = [];
  bodyTypes: any[] = [];
  carColors: any[] = [];
  carState: any[] = [];
  warrantyList: any[] = [];
  warrantyTypes: any[] = [];
  energyEfficiencyOptions: any[] = []
  featuresList = [
    { value: 'Wheelchair accessible', labelKey: 'vehicle.wheelchairAccessible' },
    { value: 'Direct/Parallel Import', labelKey: 'vehicle.directParallelImport' },
    { value: 'Racing Car', labelKey: 'vehicle.racingCar' },
    { value: 'Tuning', labelKey: 'vehicle.tuning' }
  ];
  extraFeaturesList = [
    { value: '8 Tires', labelKey: 'vehicle.eightTires' }
  ];
  months = carData.months;
  years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i)
  private nextBtnListener?: (event: Event) => void;
  private submitInProgress = false;
  currentFormStep: number = 1;
  lastIntertedData: any = null;
  showPreview: boolean = false;
  SearchCountryField = SearchCountryField
  CountryISO = CountryISO;
  selectedCountry = CountryISO.Sweden;
  doors = [
    { id: 1, label: '1' },
    { id: 2, label: '2' },
    { id: 3, label: '3' },
    { id: 4, label: '4' },
    { id: 5, label: '5' },
    { id: 6, label: '6' },
    { id: 7, label: '7' }
  ]
  constructor(
    private service: CommonService,
    private message: NzMessageService,
    private fb: FormBuilder,
    private translate: TranslateService,
    public validationErrorService: ValidationErrorService
  ) {
    this.initForm();
  }

  private get currentLang(): string {
    return localStorage.getItem('lang') || this.translate.currentLang || 'en';
  }

  ngOnInit(): void {
    this.loadScript();
    this.getFuelTypes();
    this.getTransmissions();
    this.getDriveTypes();
    this.getBodyTypes();
    this.getVhicleConditions();
    this.getCarState();
    this.getWarrantyList()
    this.getWarrantyTypes();
    this.getCarColors();
    this.getEnergyEfficiency();
    this.getLastInsertedData();
  }

  ngAfterViewInit(): void {
    this.bindStepValidation();
  }

  ngOnDestroy(): void {
    if (this.nextBtnListener) {
      const nextBtn = document.getElementById('nextBtn');
      nextBtn?.removeEventListener('click', this.nextBtnListener, true);
    }
    this.cleanupAllPreviews();
  }

  private initForm(): void {
    this.carFormOne = this.fb.group({
      car_id: [null],
      carModel: ['', [Validators.required, NoWhitespaceDirective.validate]],
      brandName: ['', [Validators.required, NoWhitespaceDirective.validate]],
      version: ['', [Validators.required, NoWhitespaceDirective.validate]],
      registration_month: ['', [Validators.required]],
      registration_year: ['', [Validators.required]],
      sittingCapacity: [null, [Validators.required]],
      body_type_id: ['', [Validators.required]],
      drive_type_id: ['', [Validators.required]],
      selectYear: ['', [Validators.required]],
      carMileage: [null, [Validators.required, Validators.min(1)]],
      fuel_type_id: ['', Validators.required],
      powerOutput: ['', [Validators.required]],
      doors: [''],
      transmission_id: ['', Validators.required],
      state_id: ['', Validators.required],
      mfk_warrenty_id: ['', Validators.required],
      warranty_type_id: [''],
      warranty_from: [''],
      warranty_to: [''],
      last_mfk_date: [''],
      engineType: [''],
      co2Emission: [''],
      carCondition: ['', Validators.required],
      consuption: ['', Validators.required],
      exterior_color_id: ['', Validators.required],
      interior_color_id: ['', Validators.required],
      is_metallic: [false],
      is_swiss_vehicle: [false],
      is_accident_vehicle: [false],
      is_fresh_from_service: [false],
      height_mm: [''],
      length_mm: [''],
      width_mm: [''],
      braked_towing_capacity_kg: [''],
      energy_efficiency: [''],
      type_approval: [''],
      carFeatures: [[]],
      extras: [[]],
      description: ['', [Validators.maxLength(1000)]],
      additional_title_999: ['', [Validators.maxLength(1000)]],
      vin_number: [''],
      registration_master_number: [''],
      selling_price: ['', [Validators.required, Validators.min(1)]],
      new_price: ['', [Validators.min(1)]],
      isLeasing: [false],
      leasing_value: ['', Validators.min(0)],
      banking_partner: [''],
      annual_interest_rate: ['', Validators.min(0)],
      residual_value: [''],
      first_name: ['', [Validators.required, NoWhitespaceDirective.validate]],
      last_name: [''],
      street: [''],
      house_number: [''],
      postal_code: ['', Validators.pattern('[0-9]{4,6}')],
      city: ['', [Validators.required, NoWhitespaceDirective.validate]],
      po_box: ['', [Validators.pattern('[0-9]{4,6}')]],
      country: ['', Validators.required],
      phone_number: ['', [Validators.required]],
      // country_code: [''],
    });
  }

  private bindStepValidation(): void {
    const nextBtn = document.getElementById('nextBtn');
    if (!nextBtn) return;

    this.nextBtnListener = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const currentStep = this.getCurrentStep();
      this.currentFormStep = currentStep;
      this.submitCurrentStep();
    };
    nextBtn.addEventListener('click', this.nextBtnListener, true);
  }

  private getCurrentStep(): number {
    const activeStep = document.querySelector('.ct_form_step.active') as HTMLElement | null;
    const stepAttr = activeStep?.dataset?.['step'];
    const step = stepAttr ? Number(stepAttr) : 1;
    return Number.isNaN(step) ? 1 : step;
  }

  private getTotalSteps(): number {
    return document.querySelectorAll('.ct_form_step').length || 1;
  }

  private goToStep(step: number): void {
    const totalSteps = this.getTotalSteps();
    if (step < 1 || step > totalSteps) return;

    const currentStepEl = document.querySelector(`.ct_form_step[data-step="${this.currentFormStep}"]`);
    const nextStepEl = document.querySelector(`.ct_form_step[data-step="${step}"]`);

    currentStepEl?.classList.remove('active');
    nextStepEl?.classList.add('active');
    this.currentFormStep = step;
    this.updateStepper();
  }

  private updateStepper(): void {
    document.querySelectorAll('.ct_step_circle').forEach((el, index) => {
      el.classList.toggle('active', index + 1 === this.currentFormStep);
    });
    const btnText = document.getElementById('btnText');
    if (btnText) {
      btnText.innerText = this.translate.instant(
        this.currentFormStep === this.getTotalSteps() ? 'common.submit' : 'common.next'
      );
    }
  }

  private getStepControlNames(step: number): string[] {
    const stepEl = document.querySelector(`.ct_form_step[data-step="${step}"]`);
    if (!stepEl) return [];
    const names = Array.from(stepEl.querySelectorAll('[formControlName]'))
      .map((el) => el.getAttribute('formControlName'))
      .filter((name): name is string => !!name);
    return Array.from(new Set(names));
  }

  private isStepValid(step: number): boolean {
    const controls = this.getStepControlNames(step);
    if (controls.length === 0) return true;
    return controls.every((name) => {
      const control = this.carFormOne.get(name);
      return control ? control.valid : true;
    });
  }

  private markStepTouched(step: number): void {
    const controls = this.getStepControlNames(step);
    controls.forEach((name) => {
      const control = this.carFormOne.get(name);
      if (!control) return;
      control.markAsTouched({ onlySelf: true });
      control.markAsDirty({ onlySelf: true });
      control.updateValueAndValidity({ onlySelf: true });
    });
  }

  onCarImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    Array.from(input.files).forEach(file => {
      this.carImages.push(file);
      this.carImagePreviews.push({ file, url: URL.createObjectURL(file), isRemote: false });
    });
    input.value = '';
  }

  onCarReelSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (this.reelPreviewUrl) {
      URL.revokeObjectURL(this.reelPreviewUrl);
    }
    this.selectedReel = file;
    this.reelPreviewUrl = URL.createObjectURL(file);
    input.value = '';
  }

  onReelThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (this.reelThumbnailPreviewUrl) {
      URL.revokeObjectURL(this.reelThumbnailPreviewUrl);
    }
    this.reelThumbnail = file;
    this.reelThumbnailPreviewUrl = URL.createObjectURL(file);
    input.value = '';
  }

  removeCarImage(index: number): void {
    const preview = this.carImagePreviews[index];
    if (!preview) return;

    if (preview.isRemote && preview.url) {
      this.deleteRemoteCarImage(preview.url, index);
      return;
    }

    if (preview.url) {
      URL.revokeObjectURL(preview.url);
    }
    if (preview.file) {
      const fileIndex = this.carImages.indexOf(preview.file);
      if (fileIndex > -1) {
        this.carImages.splice(fileIndex, 1);
      }
    }
    this.carImagePreviews.splice(index, 1);
  }

  removeReel(): void {
    this.selectedReel = null;
    if (this.reelPreviewUrl) {
      URL.revokeObjectURL(this.reelPreviewUrl);
      this.reelPreviewUrl = null;
    }
  }

  removeReelThumbnail(): void {
    this.reelThumbnail = null;
    if (this.reelThumbnailPreviewUrl) {
      URL.revokeObjectURL(this.reelThumbnailPreviewUrl);
      this.reelThumbnailPreviewUrl = null;
    }
  }

  private cleanupAllPreviews(): void {
    this.carImagePreviews.forEach((item) => {
      if (!item.isRemote) {
        URL.revokeObjectURL(item.url);
      }
    });
    this.carImagePreviews = [];
    if (this.reelPreviewUrl) {
      URL.revokeObjectURL(this.reelPreviewUrl);
      this.reelPreviewUrl = null;
    }
    if (this.reelThumbnailPreviewUrl) {
      URL.revokeObjectURL(this.reelThumbnailPreviewUrl);
      this.reelThumbnailPreviewUrl = null;
    }
  }

  private appendIfValue(formData: FormData, key: string, value: any): void {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' && value.trim() === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    if (typeof value === 'boolean') {
      formData.append(key, value ? '1' : '0');
      return;
    }
    formData.append(key, value instanceof Blob ? value : String(value));
  }

  private buildFormData(): FormData {
    const formData = new FormData();
    const formValue = this.carFormOne?.getRawValue
      ? this.carFormOne.getRawValue()
      : this.carFormOne?.value || {};

    const fieldMap: Record<string, string> = {
      bodyTypes: 'body_type',
      consuption: 'consumption'
    };

    Object.keys(formValue).forEach((key) => {
      if (key === 'carImages' || key === 'carReel' || key === 'reelThumbnails') return;
      const apiKey = fieldMap[key] || key;

      if (apiKey === 'phone_number' && formValue[key]) {
        if (formValue[key].e164Number) {
          const phone = formValue[key].e164Number
            .slice(formValue[key].dialCode.length);
          formData.append('country_code', formValue[key].dialCode || '');
          formData.append('phone_number', phone || '');
        }
        return;
      } else {
        this.appendIfValue(formData, apiKey, formValue[key]);
      }
    });

    formData.append('page', this.currentFormStep.toString());
    if (this.carImages.length > 0) {
      this.carImages.forEach((file) => formData.append('carImages', file));
    }
    if (this.selectedReel) {
      formData.append('carReel', this.selectedReel);
    }
    if (this.reelThumbnail) {
      formData.append('reelThumbnails', this.reelThumbnail);
    }

    if (this.currentFormStep === 6) {
      formData.append('is_final_submit', '1');
    }

    return formData;
  }

  onSubmit(): void {
    if (!this.carFormOne) return;
    if (this.submitInProgress) return;
    this.submitCurrentStep();
  }

  private submitCurrentStep(): void {
    if (this.submitInProgress) return;

    this.currentFormStep = this.getCurrentStep();
    this.markStepTouched(this.currentFormStep);
    if (!this.isStepValid(this.currentFormStep)) {
      return;
    }

    this.submitError = null;
    this.loading = true;
    this.submitInProgress = true;
    const formData = this.buildFormData();

    this.service.listYourCar(formData).pipe(
      finalize(() => {
        this.loading = false;
        this.submitInProgress = false;
      })
    ).subscribe({
      next: (res: any) => {
        if (this.currentFormStep === this.getTotalSteps()) {
          this.message.success(res?.message || this.translate.instant('vehicle.carListedSuccessfully'));
          this.carFormOne.reset();
          this.cleanupAllPreviews();
          this.carImages = [];
          this.selectedReel = null;
          this.reelThumbnail = null;
          this.currentFormStep = 1;
          this.goToStep(1);
          return;
        }
        const totalSteps = this.getTotalSteps();
        if (this.currentFormStep < totalSteps) {
          if (this.currentFormStep === 5) {
            this.carImages = [];
            this.selectedReel = null;
            this.reelThumbnail = null;
          }
          this.goToStep(this.currentFormStep + 1);
          this.getLastInsertedData();
        }
      },
      error: (error: any) => {
        const errMsg = error?.message || this.translate.instant('vehicle.failedToListCar');
        this.submitError = errMsg;
        this.message.error(errMsg);
      }
    });
  }

  onFeatureChange(event: any) {
    const features = this.carFormOne.get('carFeatures')?.value || [];

    if (event.target.checked) {
      features.push(event.target.value);
    } else {
      const index = features.indexOf(event.target.value);
      if (index > -1) {
        features.splice(index, 1);
      }
    }

    this.carFormOne.patchValue({
      carFeatures: features
    });
  }

  onExtraFeatureChange(event: any) {
    const extras = this.carFormOne.get('extras')?.value || [];

    if (event.target.checked) {
      extras.push(event.target.value);
    } else {
      const index = extras.indexOf(event.target.value);
      if (index > -1) {
        extras.splice(index, 1);
      }
    }

    this.carFormOne.patchValue({
      extras: extras
    });
  }

  prevStep(): void {
    if (this.currentFormStep > 1) {
      this.goToStep(this.currentFormStep - 1);
    }
  }
  loadScript() {
    const existingScript = document.querySelector('script[src="js/multistep-form.js"]');
    if (existingScript) {
      existingScript.remove();
    }
    const scriptElement = document.createElement('script');
    scriptElement.src = 'js/multistep-form.js';
    scriptElement.async = true;
    document.body.appendChild(scriptElement);
  }

  getLastInsertedData(): void {
    this.service.get('user/latest-draft-car').pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.lastIntertedData = res?.data.data || null;
        if (this.lastIntertedData) {
          this.currentFormStep = this.lastIntertedData.page + 1;
          this.carFormOne.patchValue(this.lastIntertedData);
          this.carFormOne.patchValue({
            phone_number: this.lastIntertedData.country_code + this.lastIntertedData.phone_number,
            warranty_from: this.lastIntertedData.warranty_from ? this.formatDate(this.lastIntertedData.warranty_from) : '',
            warranty_to: this.lastIntertedData.warranty_to ? this.formatDate(this.lastIntertedData.warranty_to) : '',
            last_mfk_date: this.lastIntertedData.last_mfk_date ? this.formatDate(this.lastIntertedData.last_mfk_date) : ''
          });

          // Draft media now lives on the server, so clear any stale local files
          // to avoid re-sending removed or already-uploaded images on the next submit.
          this.carImages = [];
          this.selectedReel = null;
          this.reelThumbnail = null;
          this.carImagePreviews = (this.lastIntertedData.carImages || []).map((img: any) => ({
            file: null,
            url: img.url,
            isRemote: true
          }));
          this.reelPreviewUrl = this.lastIntertedData.carReel ? this.lastIntertedData.carReel : null;
          this.reelThumbnailPreviewUrl = this.lastIntertedData.reelThumbnails ? this.lastIntertedData.reelThumbnails : null;
        }
      },
      error: (error) => {
        console.error('Error fetching last inserted data:', error);
      }
    });
  }

  private deleteRemoteCarImage(imageUrl: string, index: number): void {
    this.loading = true;
    this.service.post<any, { imageUrl: string }>('user/deleteCar-image', { imageUrl }).pipe(
      finalize(() => {
        this.loading = false;
      }),
      first()
    ).subscribe({
      next: (res: any) => {
        this.carImagePreviews.splice(index, 1);
      },
      error: (error: any) => {
        const errMsg = error?.message || this.translate.instant('vehicle.failedToDeleteImage');
        this.message.error(errMsg);
      }
    });
  }

  formatDate(date: string) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  getFuelTypes() {
    this.service.get(`user/fuel?lang=${this.currentLang}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const data = res?.data || {};

        this.fuelTypes = [
          {
            label: 'filters.standard',
            options: (data.standard || []).map((x: any) => ({
              label: x.label,
              value: x.id
            }))
          },
          {
            label: 'common.hybrid',
            options: (data.hybrid || []).map((x: any) => ({
              label: x.label,
              value: x.id
            }))
          },
          {
            label: 'filters.gas',
            options: (data.gas || []).map((x: any) => ({
              label: x.label,
              value: x.id
            }))
          },
          {
            label: 'common.other',
            options: (data.other || []).map((x: any) => ({
              label: x.label,
              value: x.id
            }))
          }
        ];
      },
      error: (error) => {
        console.error('Error fetching fuel types:', error);
      }
    });
  }


  getTransmissions() {
    this.service.get(`user/transmission?lang=${this.currentLang}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.transmissions = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching transmissions:', error);
      }
    });
  }

  getDriveTypes() {
    this.service.get(`user/drive?lang=${this.currentLang}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.driveTypes = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching drive types:', error);
      }
    });
  }

  getBodyTypes() {
    this.service.get(`user/body-type?lang=${this.currentLang}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.bodyTypes = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching body types:', error);
      }
    });
  }

  getVhicleConditions() {
    this.service.get(`user/vehicle-conditions?lang=${this.currentLang}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.conditions = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching vehicle conditions:', error);
      }
    });
  }

  getCarState() {
    this.service.get(`user/vichel-state?lang=${this.currentLang}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.carState = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching car state:', error);
      }
    });
  }

  getWarrantyList() {
    this.service.get(`user/warranty?lang=${this.currentLang}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.warrantyList = (res?.data || []).sort((a: { id: number; }, b: { id: number; }) => a.id - b.id);
      },
      error: (error) => {
        console.error('Error fetching warranty list:', error);
      }
    });
  }

  getWarrantyTypes() {
    this.service.get(`user/warranty-quality?lang=${this.currentLang}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.warrantyTypes = res?.data || [];
      },
      error: (error) => {
        console.error('Error fetching warranty types:', error);
      }
    });
  }

  getCarColors() {
    this.service.get(`user/colors?lang=${this.currentLang}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.carColors = res?.data || [];
      },
      error: (error) => {
        console.error('Error fetching car colors:', error);
      }
    });
  }

  getEnergyEfficiency() {
    this.service.get(`user/energy-efficiency?lang=${this.currentLang}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.energyEfficiencyOptions = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching energy efficiency options:', error);
      }
    });
  }
}
