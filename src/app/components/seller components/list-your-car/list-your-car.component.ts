import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
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
import { Router } from '@angular/router';

type StepOneTabKey = 'make-models' | 'type-approval' | 'serial-number';
type StepOneViewState = 'search-form' | 'result-list';

interface StepOneSelectOption {
  label: string;
  value: string | number;
  raw: any;
}

interface StepOneFilterOption {
  label: string;
  value: string;
}

interface StepOneResultFilters {
  make: string | null;
  model: string | null;
  horsepower: string | null;
  doors: string | null;
  fuel: string | null;
  transmission: string | null;
}

interface StepOneResultFilterOptions {
  make: StepOneFilterOption[];
  model: StepOneFilterOption[];
  horsepower: StepOneFilterOption[];
  doors: StepOneFilterOption[];
  fuel: StepOneFilterOption[];
  transmission: StepOneFilterOption[];
}

interface StepOneVehicleCard {
  id: string | number;
  title: string;
  subtitle: string;
  engine: string;
  transmission: string;
  fuel: string;
  dateRange: string;
  doors: string;
  seats: string;
  raw: any;
}

interface VehicleDetailItem {
  label: string;
  value: string;
}

interface VehicleDetailsView {
  title: string;
  subtitle: string;
  leftItems: VehicleDetailItem[];
  rightItems: VehicleDetailItem[];
  equipmentCount: number;
  equipment: string[];
  raw: any;
}

@Component({
  selector: 'app-list-your-car',
  imports: [FormsModule, NzSelectModule, ReactiveFormsModule, NgxIntlTelInputModule, CommonModule, ChfFormatPipe, TranslateModule, CarPreviewComponent],
  templateUrl: './list-your-car.component.html',
  styleUrl: './list-your-car.component.css'
})
export class ListYourCarComponent {
  private destroy$ = new Subject<void>();
  private readonly stepControlMap: Record<number, string[]> = {
    2: [
      'brandName',
      'version',
      'carModel',
      'fuel_type_id',
      'transmission_id',
      'drive_type_id',
      'body_type_id',
      'powerOutput',
      'doors',
      'carCondition',
      'carMileage',
      'state_id',
      'mfk_warrenty_id',
      'warranty_from',
      'warranty_to',
      'warranty_type_id',
      'last_mfk_date',
      'exterior_color_id',
      'interior_color_id',
      'is_metallic',
      'is_swiss_vehicle',
      'is_accident_vehicle',
      'is_fresh_from_service',
      'height_mm',
      'width_mm',
      'length_mm',
      'braked_towing_capacity_kg',
      'energy_efficiency',
      'type_approval',
      'vin_number',
      'registration_master_number',
      'additional_title_999',
      'description'
    ],
    3: [
      'selling_price',
      'new_price',
      'isLeasing',
      'banking_partner',
      'annual_interest_rate',
      'residual_value',
      'leasing_value'
    ],
    4: [
      'first_name',
      'last_name',
      'street',
      'house_number',
      'postal_code',
      'po_box',
      'city',
      'country',
      'phone_number'
    ],
    5: [],
    6: []
  };
  private readonly stepOneTabControlMap: Record<StepOneTabKey, string[]> = {
    'make-models': ['registration_month', 'registration_year', 'brandName', 'carModel'],
    'type-approval': ['registration_month', 'registration_year'],
    'serial-number': ['registration_month', 'registration_year']
  };
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
  private submitInProgress = false;
  activeVehicleTab: StepOneTabKey = 'make-models';
  stepOneViewState: StepOneViewState = 'search-form';
  brandOptions: StepOneSelectOption[] = [];
  modelOptions: StepOneSelectOption[] = [];
  versionOptions: StepOneSelectOption[] = [];
  selectedBrandId: string | number | null = null;
  selectedModelId: string | number | null = null;
  stepOneSearchError: string | null = null;
  stepOneSearchMessage: string | null = null;
  stepOneIdentifierTouched = false;
  makeModelSelectionTouched = false;
  hasAttemptedMakeModelSearch = false;
  rnNumber = '';
  typeApprovalSearch = '';
  serialNumberSearch = '';
  allMatchedVehicles: StepOneVehicleCard[] = [];
  matchedVehicles: StepOneVehicleCard[] = [];
  selectedMatchedVehicle: StepOneVehicleCard | null = null;
  stepOneResultFilters: StepOneResultFilters = this.getDefaultStepOneResultFilters();
  stepOneResultFilterOptions: StepOneResultFilterOptions = this.getDefaultStepOneResultFilterOptions();
  stepOneApiFilters: Record<string, any> = {};
  selectedVehicleDetails: VehicleDetailsView | null = null;
  stepTwoVehicleSummary: VehicleDetailsView | null = null;
  equipmentExpanded = false;
  loadingBrands = false;
  loadingModels = false;
  loadingVersions = false;
  stepOneLookupLoading = false;
  private brandsLoaded = false;
  private modelOptionsCache = new Map<string | number, StepOneSelectOption[]>();
  private versionOptionsCache = new Map<string | number, StepOneSelectOption[]>();
  private versionFiltersCache = new Map<string | number, Record<string, any>>();
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
    public validationErrorService: ValidationErrorService,
    private router: Router
  ) {
    this.initForm();
  }

  private get currentLang(): string {
    return localStorage.getItem('lang') || this.translate.currentLang || 'en';
  }

  get activeIdentifierValue(): string {
    return this.activeVehicleTab === 'type-approval'
      ? this.typeApprovalSearch
      : this.serialNumberSearch;
  }

  get canShowVehicleDetails(): boolean {
    return !!this.selectedVehicleDetails;
  }

  get canShowStepTwoVehicleSummary(): boolean {
    return !!this.stepTwoVehicleSummary;
  }

  get isMakeModelSearchFormView(): boolean {
    return this.activeVehicleTab === 'make-models' && this.stepOneViewState === 'search-form';
  }

  get isMakeModelResultListView(): boolean {
    return this.activeVehicleTab === 'make-models' && this.stepOneViewState === 'result-list';
  }

  ngOnInit(): void {
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
    if (this.activeVehicleTab === 'make-models') {
      this.ensureBrandsLoaded();
    }
    this.carFormOne.get('registration_month')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.onRegistrationContextChange();
    });
    this.carFormOne.get('registration_year')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.onRegistrationContextChange();
    });
  }

  setActiveVehicleTab(tab: StepOneTabKey): void {
    if (this.activeVehicleTab === tab) return;
    this.activeVehicleTab = tab;
    this.stepOneSearchError = null;
    this.stepOneSearchMessage = null;
    this.stepOneIdentifierTouched = false;
    this.makeModelSelectionTouched = false;
    this.resetStepOneResults();

    if (tab === 'make-models') {
      this.ensureBrandsLoaded();
    }
  }

  ensureBrandsLoaded(): void {
    if (this.brandsLoaded || this.loadingBrands) return;

    this.loadingBrands = true;
    this.service.getBrandsList().pipe(
      finalize(() => {
        this.loadingBrands = false;
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res: any) => {
        this.brandOptions = this.normalizeSelectOptions(res, [
          'brands',
          'data',
          'results',
          'items'
        ], [
          'id',
          'brand_id',
          'make_id'
        ], [
          'label',
          'name',
          'title',
          'brand_name',
          'make_display',
          'make'
        ]);
        this.brandsLoaded = this.brandOptions.length > 0;
      },
      error: () => {
        this.brandOptions = [];
        this.message.error(this.translate.instant('vehicle.failedToLoadBrands'));
      }
    });
  }

  onBrandSelectionChange(brandId: string | number | null): void {
    this.selectedBrandId = brandId;
    this.selectedModelId = null;
    this.modelOptions = [];
    this.versionOptions = [];
    this.hasAttemptedMakeModelSearch = false;
    this.makeModelSelectionTouched = false;
    this.resetStepOneResults();

    const selectedBrand = this.findOptionByValue(this.brandOptions, brandId);
    this.carFormOne.patchValue({
      brandName: selectedBrand?.label || '',
      carModel: '',
      version: ''
    });

    if (!brandId) return;

    const cachedModels = this.modelOptionsCache.get(brandId);
    if (cachedModels) {
      this.modelOptions = cachedModels;
      return;
    }

    this.loadingModels = true;
    this.service.getModelsList(brandId).pipe(
      finalize(() => {
        this.loadingModels = false;
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res: any) => {
        const options = this.normalizeSelectOptions(res, [
          'models',
          'data',
          'results',
          'items'
        ], [
          'id',
          'model_id'
        ], [
          'label',
          'name',
          'title',
          'model_name',
          'model'
        ]);
        this.modelOptions = options;
        this.modelOptionsCache.set(brandId, options);
      },
      error: () => {
        this.modelOptions = [];
        this.message.error(this.translate.instant('vehicle.failedToLoadModels'));
      }
    });
  }

  onModelSelectionChange(modelId: string | number | null): void {
    this.selectedModelId = modelId;
    this.versionOptions = [];
    this.hasAttemptedMakeModelSearch = false;
    this.makeModelSelectionTouched = false;
    this.resetStepOneResults();

    const selectedModel = this.findOptionByValue(this.modelOptions, modelId);
    this.carFormOne.patchValue({ carModel: selectedModel?.label || '', version: '' });

    if (!modelId) return;

    const cachedVersions = this.versionOptionsCache.get(modelId);
    if (cachedVersions) {
      this.versionOptions = cachedVersions;
      this.stepOneApiFilters = this.versionFiltersCache.get(modelId) || {};
      return;
    }

    this.loadingVersions = true;
    this.service.getVersionsList(modelId).pipe(
      finalize(() => {
        this.loadingVersions = false;
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res: any) => {
        const options = this.normalizeSelectOptions(res, [
          'versions',
          'data',
          'results',
          'items'
        ], [
          'id',
          'version_id'
        ], [
          'label',
          'name',
          'title',
          'version_name',
          'version'
        ]);
        this.versionOptions = options;
        this.versionOptionsCache.set(modelId, options);
        this.stepOneApiFilters = this.extractFiltersFromPayload(res);
        this.versionFiltersCache.set(modelId, this.stepOneApiFilters);
      },
      error: () => {
        this.versionOptions = [];
        this.stepOneApiFilters = {};
        this.message.error(this.translate.instant('vehicle.failedToLoadVersions'));
      }
    });
  }

  onVehicleIdentifierInput(): void {
    this.stepOneIdentifierTouched = false;
    this.stepOneSearchError = null;
    this.stepOneSearchMessage = null;
    this.selectedVehicleDetails = null;
    this.equipmentExpanded = false;
  }

  onRegistrationContextChange(): void {
    this.stepOneSearchError = null;
    this.stepOneSearchMessage = null;

    if (this.activeVehicleTab === 'make-models') {
      this.hasAttemptedMakeModelSearch = false;
      this.makeModelSelectionTouched = false;
      this.resetStepOneResults();
      return;
    }

    this.selectedVehicleDetails = null;
    this.equipmentExpanded = false;
  }

  selectMatchedVehicle(vehicle: StepOneVehicleCard): void {
    this.makeModelSelectionTouched = false;
    this.stepOneSearchError = null;
    this.selectedMatchedVehicle = vehicle;
    this.selectedVehicleDetails = this.buildVehicleDetailsView(vehicle.raw);
    this.stepTwoVehicleSummary = this.buildStepTwoVehicleSummary(vehicle.raw);
    this.patchVehicleDataToForm(vehicle.raw);
    this.goToStep(2);
  }

  toggleEquipment(): void {
    this.equipmentExpanded = !this.equipmentExpanded;
  }

  editVehicleData(): void {
    this.stepOneSearchError = null;
    this.stepOneSearchMessage = null;
    this.selectedVehicleDetails = null;
    this.selectedMatchedVehicle = null;
    this.stepTwoVehicleSummary = null;
    this.equipmentExpanded = false;
  }

  editSelectedVehicleFromStepTwo(): void {
    this.editVehicleData();
    if (this.activeVehicleTab === 'make-models') {
      this.stepOneViewState = this.allMatchedVehicles.length ? 'result-list' : 'search-form';
    }
    this.goToStep(1);
  }

  goBackToMakeModelSearch(): void {
    this.stepOneSearchError = null;
    this.stepOneSearchMessage = null;
    this.makeModelSelectionTouched = false;
    this.stepOneViewState = 'search-form';
  }

  onStepOneResultFilterChange(): void {
    this.applyStepOneResultFilters();
  }

  ngAfterViewInit(): void {
    this.syncActiveStepClasses();
  }

  ngOnDestroy(): void {
    this.cleanupAllPreviews();
    this.destroy$.next();
    this.destroy$.complete();
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

  private getTotalSteps(): number {
    return document.querySelectorAll('.ct_form_step').length || 1;
  }

  private goToStep(step: number): void {
    const totalSteps = this.getTotalSteps();
    if (step < 1 || step > totalSteps) return;
    this.currentFormStep = step;
    this.syncActiveStepClasses();
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

  private syncActiveStepClasses(): void {
    document.querySelectorAll('.ct_form_step').forEach((element, index) => {
      const targetStep = index + 1;
      element.classList.toggle('active', targetStep === this.currentFormStep);
    });

    this.updateStepper();

    requestAnimationFrame(() => {
      document.querySelectorAll('.ct_form_step').forEach((element, index) => {
        const targetStep = index + 1;
        element.classList.toggle('active', targetStep === this.currentFormStep);
      });
      this.updateStepper();
    });
  }

  private getStepOneControlNames(): string[] {
    return this.stepOneTabControlMap[this.activeVehicleTab] || ['registration_month', 'registration_year'];
  }

  private getStepControlNames(step: number): string[] {
    if (step === 1) {
      return this.getStepOneControlNames();
    }

    const controls = this.stepControlMap[step] || [];
    return Array.from(new Set(controls));
  }

  private getStepControls(step: number): AbstractControl[] {
    return this.getStepControlNames(step)
      .map((name) => this.carFormOne.get(name))
      .filter((control): control is AbstractControl => !!control);
  }

  private markStepTouched(step: number): void {
    this.getStepControls(step).forEach((control) => {
      control.markAsTouched({ onlySelf: true });
      control.markAsDirty({ onlySelf: true });
      control.updateValueAndValidity({ onlySelf: true });
    });
  }

  private areStepControlsValid(step: number): boolean {
    return this.getStepControls(step).every((control) => control.valid);
  }

  private isStepOneFlowValid(markTouched: boolean = false): boolean {
    if (this.activeVehicleTab === 'type-approval' || this.activeVehicleTab === 'serial-number') {
      const hasIdentifier = !!this.activeIdentifierValue.trim();
      if (!hasIdentifier && markTouched) {
        this.stepOneIdentifierTouched = true;
      }
      return hasIdentifier;
    }

    if (this.activeVehicleTab === 'make-models' && this.stepOneViewState === 'result-list' && !this.selectedMatchedVehicle) {
      if (markTouched) {
        this.makeModelSelectionTouched = true;
        this.stepOneSearchError = this.translate.instant('vehicle.selectVehicleFromList');
      }
      return false;
    }

    return true;
  }

  private isStepValid(step: number, markTouched: boolean = false): boolean {
    if (markTouched) {
      this.markStepTouched(step);
    }

    const controlsValid = this.areStepControlsValid(step);
    if (!controlsValid) {
      return false;
    }

    if (step === 1) {
      return this.isStepOneFlowValid(markTouched);
    }

    return true;
  }

  private validateAllStepsBeforeFinalSubmit(): boolean {
    const stepsToValidate = [1, 2, 3, 4, 5];
    let firstInvalidStep: number | null = null;

    stepsToValidate.forEach((step) => {
      const isValid = this.isStepValid(step, true);
      if (!isValid && firstInvalidStep === null) {
        firstInvalidStep = step;
      }
    });

    if (firstInvalidStep !== null) {
      this.goToStep(firstInvalidStep);
      return false;
    }

    return true;
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

    if (this.currentFormStep === 1 && this.activeVehicleTab === 'make-models' && this.stepOneViewState === 'result-list') {
      this.handleStepOneSubmit();
      return;
    }

    this.submitCurrentStep();
  }

  private submitCurrentStep(): void {
    if (this.submitInProgress) return;

    if (this.currentFormStep === 1) {
      this.handleStepOneSubmit();
      return;
    }

    if (this.currentFormStep === this.getTotalSteps()) {
      if (!this.validateAllStepsBeforeFinalSubmit()) {
        return;
      }
    } else if (!this.isStepValid(this.currentFormStep, true)) {
      return;
    }

    this.submitFormStep();
  }

  private handleStepOneSubmit(): void {

    if (this.submitInProgress) return;

    if (!this.isStepValid(this.currentFormStep, true)) {
      return;
    }

    if (this.activeVehicleTab === 'make-models') {
      this.hasAttemptedMakeModelSearch = true;

      if (this.stepOneViewState === 'search-form') {
        this.loadMatchedVehicles();
        return;
      }
      if (this.selectedMatchedVehicle) {
        this.selectedVehicleDetails = this.buildVehicleDetailsView(this.selectedMatchedVehicle.raw);
        this.stepTwoVehicleSummary = this.buildStepTwoVehicleSummary(this.selectedMatchedVehicle.raw);
        this.patchVehicleDataToForm(this.selectedMatchedVehicle.raw);
        this.goToStep(2);
        return;
      }

      this.makeModelSelectionTouched = true;
      this.stepOneSearchError = this.translate.instant('vehicle.selectVehicleFromList');
      return;
    }

    if (this.activeVehicleTab === 'type-approval') {
      this.lookupVehicleByTypeApproval();
      return;
    }

    if (this.activeVehicleTab === 'serial-number') {
      this.lookupVehicleByVin();
      return;
    }

    this.submitFormStep();
  }

  private submitFormStep(): void {
    if (this.submitInProgress) return;

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
          return;
        }
        if (this.currentFormStep === 6) {
          this.router.navigate(['/my-profile/my-listings']);
        }
      },
      error: (error: any) => {
        const errMsg = error?.message || this.translate.instant('vehicle.failedToListCar');
        this.submitError = errMsg;
        this.message.error(errMsg);
      }
    });
  }

  private loadMatchedVehicles(): void {
    this.stepOneSearchError = null;
    this.stepOneSearchMessage = null;
    this.selectedVehicleDetails = null;
    this.selectedMatchedVehicle = null;
    this.equipmentExpanded = false;
    const rawMatches = this.versionOptions.map((item) => this.getVersionVehiclePayload(item.raw));
    const sourceItems = rawMatches.length ? rawMatches : [];

    this.allMatchedVehicles = sourceItems
      .map((item: any, index: number) => this.normalizeVehicleCard(item, index))
      .filter((item: StepOneVehicleCard | null): item is StepOneVehicleCard => !!item);

    this.stepOneResultFilterOptions = this.buildStepOneResultFilterOptions(this.allMatchedVehicles, this.stepOneApiFilters);
    this.stepOneResultFilters = this.getDefaultStepOneResultFilters();
    this.stepOneViewState = 'result-list';
    this.applyStepOneResultFilters();

    if (!this.allMatchedVehicles.length) {
      this.stepOneSearchMessage = this.translate.instant('vehicle.noVehiclesFoundForSelection');
    }
  }

  private lookupVehicleFromIdentifiers(): void {
    if (this.stepOneLookupLoading) return;

    this.stepOneSearchError = null;
    this.stepOneSearchMessage = null;
    this.selectedVehicleDetails = null;
    this.equipmentExpanded = false;

    this.carFormOne.patchValue({
      type_approval: this.activeVehicleTab === 'type-approval' ? this.typeApprovalSearch.trim() : '',
      vin_number: this.activeVehicleTab === 'serial-number' ? this.serialNumberSearch.trim() : '',
      registration_master_number: this.activeVehicleTab === 'serial-number' ? this.serialNumberSearch.trim() : ''
    });

    const formData = this.buildFormData();
    this.stepOneLookupLoading = true;
    this.loading = true;

    this.service.listYourCar(formData).pipe(
      finalize(() => {
        this.stepOneLookupLoading = false;
        this.loading = false;
      }),
      first()
    ).subscribe({
      next: () => {
        this.fetchLatestDraftData();
      },
      error: (error: any) => {
        const errMsg = error?.message || this.translate.instant('vehicle.failedToFetchVehicleDetails');
        this.stepOneSearchError = errMsg;
        this.message.error(errMsg);
      }
    });
  }

  private lookupVehicleByTypeApproval(): void {
    if (this.stepOneLookupLoading) return;

    const typeApprovalValue = this.typeApprovalSearch.trim();
    if (!typeApprovalValue) {
      this.stepOneIdentifierTouched = true;
      return;
    }

    this.stepOneSearchError = null;
    this.stepOneSearchMessage = null;
    this.selectedVehicleDetails = null;
    this.equipmentExpanded = false;
    this.stepOneLookupLoading = true;
    this.loading = true;

    this.carFormOne.patchValue({
      type_approval: typeApprovalValue
    });

    this.service.getVehicleByTypeApproval(typeApprovalValue).pipe(
      finalize(() => {
        this.stepOneLookupLoading = false;
        this.loading = false;
      }),
      first()
    ).subscribe({
      next: (res: any) => {
        const vehiclePayload = this.extractTypeApprovalVehicle(res);
        if (!vehiclePayload) {
          this.stepOneSearchMessage = this.translate.instant('vehicle.noVehicleDetailsFound');
          return;
        }
        this.selectedVehicleDetails = this.buildVehicleDetailsView(vehiclePayload);
        this.stepTwoVehicleSummary = this.buildStepTwoVehicleSummary(vehiclePayload);
        this.patchVehicleDataToForm(vehiclePayload);
        this.goToStep(2);
      },
      error: (error: any) => {
        const errMsg = error?.message || this.translate.instant('vehicle.failedToFetchVehicleDetails');
        this.stepOneSearchError = errMsg;
        this.message.error(errMsg);
      }
    });
  }

  private lookupVehicleByVin(): void {
    if (this.stepOneLookupLoading) return;

    const vinValue = this.serialNumberSearch.trim();
    if (!vinValue) {
      this.stepOneIdentifierTouched = true;
      return;
    }

    this.stepOneSearchError = null;
    this.stepOneSearchMessage = null;
    this.selectedVehicleDetails = null;
    this.equipmentExpanded = false;
    this.stepOneLookupLoading = true;
    this.loading = true;

    this.carFormOne.patchValue({
      vin_number: vinValue,
      registration_master_number: vinValue
    }, { emitEvent: false });

    this.service.getVehicleByVin(vinValue).pipe(
      finalize(() => {
        this.stepOneLookupLoading = false;
        this.loading = false;
      }),
      first()
    ).subscribe({
      next: (res: any) => {
        const vehiclePayload = this.extractTypeApprovalVehicle(res);
        if (!vehiclePayload) {
          this.stepOneSearchMessage = this.translate.instant('vehicle.noVehicleDetailsFound');
          return;
        }

        this.selectedVehicleDetails = this.buildVehicleDetailsView(vehiclePayload);
        this.stepTwoVehicleSummary = this.buildStepTwoVehicleSummary(vehiclePayload);
        this.patchVehicleDataToForm(vehiclePayload);
        this.goToStep(2);
      },
      error: (error: any) => {
        const errMsg = error?.message || this.translate.instant('vehicle.failedToFetchVehicleDetails');
        this.stepOneSearchError = errMsg;
        this.message.error(errMsg);
      }
    });
  }

  private fetchLatestDraftData(): void {
    this.service.get('user/latest-draft-car').pipe(
      first()
    ).subscribe({
      next: (res: any) => {
        const draftData = res?.data?.data || null;
        if (!draftData) {
          this.stepOneSearchMessage = this.translate.instant('vehicle.noVehicleDetailsFound');
          return;
        }

        this.patchDraftData(draftData, false);
        this.selectedVehicleDetails = this.buildVehicleDetailsView(draftData);
        this.stepTwoVehicleSummary = this.buildStepTwoVehicleSummary(draftData);
        this.equipmentExpanded = false;

        if (!this.selectedVehicleDetails.leftItems.length && !this.selectedVehicleDetails.rightItems.length) {
          this.stepOneSearchMessage = this.translate.instant('vehicle.noVehicleDetailsFound');
        }
      },
      error: () => {
        this.stepOneSearchError = this.translate.instant('vehicle.failedToFetchVehicleDetails');
      }
    });
  }

  private normalizeSelectOptions(
    payload: any,
    arrayKeys: string[],
    idKeys: string[],
    labelKeys: string[]
  ): StepOneSelectOption[] {
    const source = this.extractArray(payload, arrayKeys);

    return source
      .map((item: any, index: number) => {
        const value = this.pickFirst(item, idKeys) ?? index;
        const label = this.pickFirst(item, labelKeys);

        if (value === null || value === undefined || !label) {
          return null;
        }

        return {
          label: String(label),
          value,
          raw: item
        };
      })
      .filter((item: StepOneSelectOption | null): item is StepOneSelectOption => !!item);
  }

  private normalizeVehicleCard(item: any, index: number): StepOneVehicleCard | null {
    const vehicle = this.getVersionVehiclePayload(item);
    const title = this.buildVehicleTitle(item);
    if (!title) {
      return null;
    }

    return {
      id: this.pickFirst(item, ['id', 'vehicle_id', 'version_id', 'fzkey']) ?? index,
      title,
      subtitle: this.formatVehicleValue(this.pickFirst(vehicle, ['version', 'version_name', 'trim', 'variant'])),
      engine: this.formatVehicleValue(
        this.pickFirst(vehicle, ['ps', 'totalPs', 'horsepower', 'powerOutput', 'engine', 'engineType'])
          ? `${this.pickFirst(vehicle, ['ps', 'totalPs', 'horsepower', 'powerOutput', 'engine', 'engineType'])} HP`
          : this.pickFirst(vehicle, ['engine_cc', 'engine_cm3', 'engine_displacement', 'displacement'])
      ),
      transmission: this.formatVehicleValue(
        this.pickFirst(vehicle, ['transmission_name', 'gearbox', 'transmission_value', 'transmission'])
      ),
      fuel: this.formatVehicleValue(
        this.pickFirst(vehicle, ['fuel_name', 'fuel_type_value', 'fuel_type', 'fuel'])
      ),
      dateRange: this.buildDateRange(vehicle),
      doors: this.formatVehicleValue(this.pickFirst(vehicle, ['doors', 'door_count'])),
      seats: this.formatVehicleValue(this.pickFirst(vehicle, ['sittingCapacity', 'seats', 'seat_count'])),
      raw: vehicle
    };
  }

  private buildVehicleDetailsView(item: any): VehicleDetailsView {
    const vehicle = this.getVersionVehiclePayload(item);
    const equipment = this.extractEquipment(item);
    return {
      title: this.buildVehicleTitle(item) || this.translate.instant('vehicle.vehicleDetails'),
      subtitle: this.translate.instant('vehicle.prefilledVehicleDetails'),
      leftItems: [
        this.createDetailItem(this.translate.instant('vehicle.bodyType'), this.pickFirst(vehicle, ['body_name', 'body_type_value', 'body_type', 'bodyType'])),
        this.createDetailItem(this.translate.instant('vehicle.transmission'), this.pickFirst(vehicle, ['transmission_name', 'gearbox', 'transmission_value', 'transmission'])),
        this.createDetailItem(this.translate.instant('vehicle.fuelType'), this.pickFirst(vehicle, ['fuel_name', 'fuel_type_value', 'fuel_type', 'fuel'])),
        this.createDetailItem(this.translate.instant('vehicle.driveType'), this.pickFirst(vehicle, ['drive_name', 'drive_type_value', 'drive_type', 'driveType'])),
        this.createDetailItem(this.translate.instant('vehicle.doors'), this.pickFirst(vehicle, ['doors', 'door_count'])),
        this.createDetailItem(this.translate.instant('filters.seats'), this.pickFirst(vehicle, ['sittingCapacity', 'seats', 'seat_count'])),
        this.createDetailItem(this.translate.instant('vehicle.powerOutput'), this.pickFirst(vehicle, ['ps', 'totalPs', 'powerOutput', 'power_output'])),
        this.createDetailItem('Engine (cm3)', this.pickFirst(vehicle, ['displacement', 'engineType', 'engine', 'engine_cc', 'engine_cm3', 'engine_displacement'])),
        this.createDetailItem(this.translate.instant('vehicle.cylinders'), this.pickFirst(vehicle, ['cylinders', 'cylinder_count'])),
        this.createDetailItem(this.translate.instant('vehicle.gears'), this.pickFirst(vehicle, ['gears', 'gear_count'])),
        this.createDetailItem(`${this.translate.instant('vehicle.wheelbase')} (mm)`, this.pickFirst(vehicle, ['wheelbase', 'wheelbase_mm'])),
        this.createDetailItem(`${this.translate.instant('vehicle.curbWeight')} (kg)`, this.pickFirst(vehicle, ['curb_weight', 'curb_weight_kg', 'totalWeight']))
      ].filter((detail: VehicleDetailItem | null): detail is VehicleDetailItem => !!detail),
      rightItems: [
        this.createDetailItem(`${this.translate.instant('filters.co2Emissions')} (g/km)`, this.pickFirst(vehicle, ['co2Emission', 'co2_emission', 'co2_emissions'])),
        this.createDetailItem(this.translate.instant('vehicle.consumption'), this.pickFirst(vehicle, ['consuption', 'consumption'])),
        this.createDetailItem(this.translate.instant('vehicle.emissionStandard'), this.pickFirst(vehicle, ['emission_standard', 'emissionStandard'])),
        this.createDetailItem(this.translate.instant('vehicle.vehicleIdentificationNumber'), this.pickFirst(vehicle, ['vin_number', 'serial_number'])),
        this.createDetailItem(this.translate.instant('vehicle.typeApproval'), this.pickFirst(vehicle, ['type_approval', 'typeApprovalNrs'])),
        this.createDetailItem(this.translate.instant('vehicle.registrationMasterNumber'), this.pickFirst(vehicle, ['registration_master_number']))
      ].filter((detail: VehicleDetailItem | null): detail is VehicleDetailItem => !!detail),
      equipmentCount: Number(this.pickFirst(vehicle, ['equipment_count', 'equipmentCount'])) || equipment.length,
      equipment,
      raw: vehicle
    };
  }

  private buildStepTwoVehicleSummary(item: any): VehicleDetailsView {
    const vehicle = this.getVersionVehiclePayload(item);
    const equipment = this.extractEquipment(item);
    const powerPs = this.pickFirst(vehicle, ['ps', 'totalPs', 'powerOutput', 'power_output']);
    const powerKw = this.pickFirst(vehicle, ['kw', 'kw_output']);
    const formattedPower = [powerPs, powerKw]
      .filter((value) => value !== null && value !== undefined && value !== '')
      .join(' / ');

    return {
      title: this.buildVehicleTitle(item) || this.translate.instant('vehicle.vehicleDetails'),
      subtitle: this.translate.instant('vehicle.prefilledVehicleDetails'),
      leftItems: [
        this.createDetailItem('Body type', this.pickFirst(vehicle, ['body_name', 'body_type_value', 'body_type', 'bodyType'])),
        this.createDetailItem('Transmission', this.pickFirst(vehicle, ['transmission_name', 'gearbox', 'transmission_value', 'transmission'])),
        this.createDetailItem('Fuel', this.pickFirst(vehicle, ['fuel_name', 'fuel_type_value', 'fuel_type', 'fuel'])),
        this.createDetailItem('Drive', this.pickFirst(vehicle, ['drive_name', 'drive_type_value', 'drive_type', 'driveType'])),
        this.createDetailItem('Doors', this.pickFirst(vehicle, ['doors', 'door_count'])),
        this.createDetailItem('Seats', this.pickFirst(vehicle, ['sittingCapacity', 'seats', 'seat_count'])),
        this.createDetailItem('Power (PS / kW)', formattedPower),
        this.createDetailItem('Engine (cm³)', this.pickFirst(vehicle, ['displacement', 'engineType', 'engine', 'engine_cc', 'engine_cm3', 'engine_displacement'])),
        this.createDetailItem('Cylinders', this.pickFirst(vehicle, ['cylinders', 'cylinder_count'])),
        this.createDetailItem('Gears', this.pickFirst(vehicle, ['gears', 'gear_count'])),
        this.createDetailItem('Wheelbase (mm)', this.pickFirst(vehicle, ['wheelbase', 'wheelbase_mm'])),
        this.createDetailItem('Curb weight (kg)', this.pickFirst(vehicle, ['curb_weight', 'curb_weight_kg', 'totalWeight'])),
        this.createDetailItem('Payload (kg)', this.pickFirst(vehicle, ['payload', 'payload_kg'])),
        this.createDetailItem('Registration year', this.pickFirst(vehicle, ['registration_year', 'production_year']))
      ].filter((detail: VehicleDetailItem | null): detail is VehicleDetailItem => !!detail),
      rightItems: [
        this.createDetailItem('CO₂ emissions (g/km)', this.pickFirst(vehicle, ['co2Emission', 'co2_emission', 'co2_emissions'])),
        this.createDetailItem('Fuel consumption', this.pickFirst(vehicle, ['consuption', 'consumption'])),
        this.createDetailItem('Emissions standard', this.pickFirst(vehicle, ['emission_standard', 'emissionStandard']))
      ].filter((detail: VehicleDetailItem | null): detail is VehicleDetailItem => !!detail),
      equipmentCount: Number(this.pickFirst(vehicle, ['equipment_count', 'equipmentCount'])) || equipment.length,
      equipment,
      raw: vehicle
    };
  }

  private createDetailItem(label: string, value: any): VehicleDetailItem | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return {
      label,
      value: String(value)
    };
  }

  private patchDraftData(data: any, updateStep: boolean = true): void {
    this.lastIntertedData = data || null;
    if (!data) return;

    if (updateStep) {
      this.currentFormStep = (data.page || 0) + 1;
    }

    const draftCarId = data?.car_id ?? null;

    this.carFormOne.patchValue({
      ...data,
      car_id: draftCarId
    }, { emitEvent: false });
    this.carFormOne.patchValue({
      car_id: draftCarId,
      phone_number: `${data.country_code || ''}${data.phone_number || ''}`,
      warranty_from: data.warranty_from ? this.formatDate(data.warranty_from) : '',
      warranty_to: data.warranty_to ? this.formatDate(data.warranty_to) : '',
      last_mfk_date: data.last_mfk_date ? this.formatDate(data.last_mfk_date) : ''
    }, { emitEvent: false });

    this.rnNumber = data.registration_master_number || '';
    this.typeApprovalSearch = data.type_approval || '';
    this.serialNumberSearch = data.vin_number || data.registration_master_number || '';
    this.selectedVehicleDetails = null;

    this.carImages = [];
    this.selectedReel = null;
    this.reelThumbnail = null;
    this.carImagePreviews = (data.carImages || []).map((img: any) => ({
      file: null,
      url: img.url,
      isRemote: true
    }));
    this.reelPreviewUrl = data.carReel ? data.carReel : null;
    this.reelThumbnailPreviewUrl = data.reelThumbnails ? data.reelThumbnails : null;
  }

  private patchVehicleDataToForm(item: any): void {
    const vehicle = this.getVersionVehiclePayload(item);
    if (!vehicle) return;

    const patchValue: Record<string, any> = {
      brandName: this.pickFirst(vehicle, ['brand_name', 'brandName', 'brand', 'make_display', 'make']) || this.carFormOne.get('brandName')?.value,
      carModel: this.pickFirst(vehicle, ['model_name', 'carModel', 'model']) || this.carFormOne.get('carModel')?.value,
      version: this.pickFirst(vehicle, ['version', 'version_name', 'title', 'name']) || this.carFormOne.get('version')?.value,
      registration_month: this.pickFirst(vehicle, ['registration_month']) || this.carFormOne.get('registration_month')?.value,
      registration_year: this.pickFirst(vehicle, ['registration_year']) || this.carFormOne.get('registration_year')?.value,
      sittingCapacity: this.pickFirst(vehicle, ['sittingCapacity', 'seats', 'seat_count']) || this.carFormOne.get('sittingCapacity')?.value,
      powerOutput: this.pickFirst(vehicle, ['ps', 'totalPs', 'powerOutput', 'power_output', 'horsepower', 'kw_output']) || this.carFormOne.get('powerOutput')?.value,
      doors: this.pickFirst(vehicle, ['doors', 'door_count']) || this.carFormOne.get('doors')?.value,
      engineType: this.pickFirst(vehicle, ['displacement', 'engineType', 'engine', 'engine_cc', 'engine_cm3', 'engine_displacement']) || this.carFormOne.get('engineType')?.value,
      co2Emission: this.pickFirst(vehicle, ['co2Emission', 'co2_emission', 'co2_emissions']) || this.carFormOne.get('co2Emission')?.value,
      consuption: this.pickFirst(vehicle, ['consuption', 'consumption']) || this.carFormOne.get('consuption')?.value,
      type_approval: this.pickFirst(vehicle, ['type_approval', 'typeApprovalNrs']) || this.carFormOne.get('type_approval')?.value,
      vin_number: this.pickFirst(vehicle, ['vin_number', 'serial_number']) || this.carFormOne.get('vin_number')?.value,
      registration_master_number: this.pickFirst(vehicle, ['registration_master_number']) || this.carFormOne.get('registration_master_number')?.value
    };

    const fuelTypeId = this.resolveOptionId(
      this.fuelTypes.flatMap((group: any) => group.options || []),
      this.pickFirst(vehicle, ['fuel_type_id', 'fuel_name', 'fuel_type_value', 'fuel_type', 'fuel'])
    );
    const transmissionId = this.resolveOptionId(
      this.transmissions,
      this.pickFirst(vehicle, ['transmission_id', 'transmission_name', 'transmission_value', 'transmission', 'gearbox'])
    );
    const driveTypeId = this.resolveOptionId(
      this.driveTypes,
      this.pickFirst(vehicle, ['drive_type_id', 'drive_name', 'drive_type_value', 'drive_type'])
    );
    const bodyTypeId = this.resolveOptionId(
      this.bodyTypes,
      this.pickFirst(vehicle, ['body_type_id', 'body_name', 'body_type_value', 'body_type'])
    );

    if (fuelTypeId !== null) {
      patchValue['fuel_type_id'] = fuelTypeId;
    }
    if (transmissionId !== null) {
      patchValue['transmission_id'] = transmissionId;
    }
    if (driveTypeId !== null) {
      patchValue['drive_type_id'] = driveTypeId;
    }
    if (bodyTypeId !== null) {
      patchValue['body_type_id'] = bodyTypeId;
    }

    this.carFormOne.patchValue(patchValue, { emitEvent: false });
  }

  private resolveOptionId(options: any[], rawValue: any): any {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return null;
    }

    const directMatch = options.find((item: any) => String(item?.id ?? item?.value) === String(rawValue));
    if (directMatch) {
      return directMatch.id ?? directMatch.value;
    }

    const normalizedValue = this.normalizeText(rawValue);
    const labelMatch = options.find((item: any) => {
      const candidates = [
        item?.label,
        item?.title,
        item?.value,
        item?.name
      ].filter(Boolean);

      return candidates.some((candidate: any) => this.normalizeText(candidate) === normalizedValue);
    });

    return labelMatch ? labelMatch.id ?? labelMatch.value : null;
  }

  private extractArray(payload: any, preferredKeys: string[] = []): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    for (const key of preferredKeys) {
      if (Array.isArray(payload?.[key])) {
        return payload[key];
      }
    }

    const nestedCandidates = [payload?.data, payload?.results, payload?.items];
    for (const candidate of nestedCandidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
      if (Array.isArray(candidate?.data)) {
        return candidate.data;
      }
    }

    return [];
  }

  private extractVehicleList(item: any): any[] {
    return this.extractArray(item, [
      'vehicles',
      'vehicle_list',
      'matches',
      'results',
      'items',
      'versions',
      'variants'
    ]);
  }

  private extractEquipment(item: any): string[] {
    const vehicle = this.getVersionVehiclePayload(item);
    const equipment = this.extractArray(item, [
      'equipment',
      'equipments',
      'equipment_list',
      'carFeatures',
      'extras'
    ]);

    return equipment
      .map((entry: any) => {
        if (typeof entry === 'string') {
          return entry;
        }
        return this.pickFirst(entry, ['label', 'name', 'title', 'value']);
      })
      .filter((entry: string | null): entry is string => !!entry);

    if (equipment.length) {
      return equipment;
    }

    return this.extractArray(vehicle, ['colorOptionsData'])
      .map((entry: any) => this.pickFirst(entry, ['label', 'name', 'title', 'value']))
      .filter((entry: string | null): entry is string => !!entry);
  }

  private buildVehicleTitle(item: any): string {
    const vehicle = this.getVersionVehiclePayload(item);
    const explicitTitle = this.pickFirst(vehicle, ['description', 'title', 'vehicle_title', 'name']);
    if (explicitTitle) {
      return String(explicitTitle);
    }

    const brand = this.pickFirst(vehicle, ['brand_name', 'brandName', 'brand', 'make_display', 'make']);
    const model = this.pickFirst(vehicle, ['model_name', 'carModel', 'model']);
    const version = this.pickFirst(vehicle, ['version', 'version_name']);

    return [brand, model, version].filter(Boolean).join(' ').trim();
  }

  private buildDateRange(item: any): string {
    const vehicle = this.getVersionVehiclePayload(item);
    const from = this.pickFirst(vehicle, ['productionStart', 'production_from', 'from_date', 'start_date', 'date_from', 'registration_from']);
    const to = this.pickFirst(vehicle, ['productionEnd', 'production_to', 'to_date', 'end_date', 'date_to', 'registration_to']);

    if (from || to) {
      return [this.formatCatalogDate(from), this.formatCatalogDate(to)].filter(Boolean).join(' - ');
    }

    const month = this.pickFirst(vehicle, ['registration_month']);
    const year = this.pickFirst(vehicle, ['registration_year']);
    return [month, year].filter(Boolean).join('/');
  }

  private formatVehicleValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return String(value);
  }

  private pickFirst(item: any, keys: string[]): any {
    if (!item) return null;

    for (const key of keys) {
      const value = item[key];
      if (Array.isArray(value) && value.length > 0) {
        return value.join(', ');
      }
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return null;
  }

  private getVersionVehiclePayload(item: any): any {
    const nestedVehicle = item?.raw_payload?.data?.[0];
    if (!nestedVehicle) {
      return item;
    }

    return {
      ...item,
      ...nestedVehicle,
      brand_name: item?.brand_name || nestedVehicle?.brand,
      model_name: item?.model_name || nestedVehicle?.model,
      version_name: item?.version_name || nestedVehicle?.version
    };
  }

  private extractTypeApprovalVehicle(response: any): any {
    const candidates = [
      response?.data?.data,
      response?.data,
      response?.results,
      response
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length > 0) {
        return candidate[0];
      }

      if (candidate && typeof candidate === 'object') {
        if (Array.isArray(candidate?.data) && candidate.data.length > 0) {
          return candidate.data[0];
        }

        if (candidate?.data && typeof candidate.data === 'object' && !Array.isArray(candidate.data)) {
          return candidate.data;
        }

        return candidate;
      }
    }

    return null;
  }

  private formatCatalogDate(value: any): string {
    if (!value) return '';
    const normalized = String(value).trim();

    if (/^\d{6}$/.test(normalized)) {
      return `${normalized.slice(4, 6)}.${normalized.slice(0, 4)}`;
    }

    if (/^\d{4}-\d{2}$/.test(normalized)) {
      const [year, month] = normalized.split('-');
      return `${month}.${year}`;
    }

    return normalized;
  }

  private normalizeText(value: any): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private findOptionByValue(options: StepOneSelectOption[], value: string | number | null): StepOneSelectOption | undefined {
    return options.find((item) => String(item.value) === String(value));
  }

  private resetStepOneResults(): void {
    this.stepOneViewState = 'search-form';
    this.allMatchedVehicles = [];
    this.matchedVehicles = [];
    this.selectedMatchedVehicle = null;
    this.stepOneResultFilters = this.getDefaultStepOneResultFilters();
    this.stepOneResultFilterOptions = this.getDefaultStepOneResultFilterOptions();
    this.stepOneApiFilters = {};
    this.selectedVehicleDetails = null;
    this.stepTwoVehicleSummary = null;
    this.equipmentExpanded = false;
  }

  private getDefaultStepOneResultFilters(): StepOneResultFilters {
    return {
      make: null,
      model: null,
      horsepower: null,
      doors: null,
      fuel: null,
      transmission: null
    };
  }

  private getDefaultStepOneResultFilterOptions(): StepOneResultFilterOptions {
    return {
      make: [],
      model: [],
      horsepower: [],
      doors: [],
      fuel: [],
      transmission: []
    };
  }

  private applyStepOneResultFilters(): void {
    const filters = this.stepOneResultFilters;
    this.matchedVehicles = this.allMatchedVehicles.filter((vehicle) => this.matchesStepOneFilters(vehicle, filters));

    if (this.selectedMatchedVehicle) {
      const selectionStillVisible = this.matchedVehicles.some((vehicle) => String(vehicle.id) === String(this.selectedMatchedVehicle?.id));
      if (!selectionStillVisible) {
        this.selectedMatchedVehicle = null;
        this.clearSelectedMatchedVehicleData();
      }
    }

    this.stepOneSearchMessage = this.matchedVehicles.length
      ? null
      : this.translate.instant('vehicle.noVehiclesFoundForSelection');
    this.stepOneSearchError = null;
    this.makeModelSelectionTouched = false;
  }

  private matchesStepOneFilters(vehicleCard: StepOneVehicleCard, filters: StepOneResultFilters): boolean {
    const vehicle = this.getVersionVehiclePayload(vehicleCard.raw);
    return this.matchesFilterValue(filters.make, this.pickFirst(vehicle, ['brand_name', 'brandName', 'brand', 'make_display', 'make']))
      && this.matchesFilterValue(filters.model, this.pickFirst(vehicle, ['model_name', 'carModel', 'model']))
      && this.matchesFilterValue(filters.horsepower, this.pickFirst(vehicle, ['ps', 'horsepower', 'powerOutput', 'power_output', 'totalPs']))
      && this.matchesFilterValue(filters.doors, this.pickFirst(vehicle, ['doors', 'door_count']))
      && this.matchesFilterValue(filters.fuel, this.pickFirst(vehicle, ['fuel_name', 'fuel_type_value', 'fuel_type', 'fuel']))
      && this.matchesFilterValue(filters.transmission, this.pickFirst(vehicle, ['transmission_name', 'gearbox', 'transmission_value', 'transmission']));
  }

  private matchesFilterValue(filterValue: string | null, candidateValue: any): boolean {
    if (!filterValue) {
      return true;
    }

    return this.normalizeText(candidateValue) === this.normalizeText(filterValue);
  }

  private buildStepOneResultFilterOptions(
    vehicles: StepOneVehicleCard[],
    responseFilters: Record<string, any>
  ): StepOneResultFilterOptions {
    const horsepowerOptions = this.normalizeDynamicFilterOptions(responseFilters['horsepower']);
    const doorOptions = this.normalizeDynamicFilterOptions(responseFilters['doors']);
    const fuelOptions = this.normalizeDynamicFilterOptions(responseFilters['fuel_types']);
    const transmissionOptions = this.normalizeDynamicFilterOptions(responseFilters['transmissions']);

    return {
      make: this.buildUniqueVehicleOptions(vehicles, ['brand_name', 'brandName', 'brand', 'make_display', 'make']),
      model: this.buildUniqueVehicleOptions(vehicles, ['model_name', 'carModel', 'model']),
      horsepower: horsepowerOptions.length ? horsepowerOptions : this.buildUniqueVehicleOptions(vehicles, ['ps', 'horsepower', 'powerOutput', 'power_output', 'totalPs']),
      doors: doorOptions.length ? doorOptions : this.buildUniqueVehicleOptions(vehicles, ['doors', 'door_count']),
      fuel: fuelOptions.length ? fuelOptions : this.buildUniqueVehicleOptions(vehicles, ['fuel_name', 'fuel_type_value', 'fuel_type', 'fuel']),
      transmission: transmissionOptions.length ? transmissionOptions : this.buildUniqueVehicleOptions(vehicles, ['transmission_name', 'gearbox', 'transmission_value', 'transmission'])
    };
  }

  private buildUniqueVehicleOptions(vehicles: StepOneVehicleCard[], keys: string[]): StepOneFilterOption[] {
    const optionMap = new Map<string, StepOneFilterOption>();

    vehicles.forEach((vehicleCard) => {
      const vehicle = this.getVersionVehiclePayload(vehicleCard.raw);
      const value = this.pickFirst(vehicle, keys);
      if (value === null || value === undefined || value === '') {
        return;
      }

      const normalized = this.normalizeText(value);
      if (!optionMap.has(normalized)) {
        optionMap.set(normalized, {
          label: String(value),
          value: String(value)
        });
      }
    });

    return Array.from(optionMap.values()).sort((left, right) => left.label.localeCompare(right.label));
  }

  private normalizeDynamicFilterOptions(source: any): StepOneFilterOption[] {
    const items = this.extractArray(source, ['data', 'items', 'results']);
    const optionMap = new Map<string, StepOneFilterOption>();

    items.forEach((item: any) => {
      const value = this.pickFirst(item, ['value', 'label', 'name', 'title', 'slug', 'id']) ?? item;
      const label = this.pickFirst(item, ['label', 'name', 'title', 'value']) ?? item;

      if (value === null || value === undefined || value === '' || label === null || label === undefined || label === '') {
        return;
      }

      const normalized = this.normalizeText(value);
      if (!optionMap.has(normalized)) {
        optionMap.set(normalized, {
          label: String(label),
          value: String(value)
        });
      }
    });

    return Array.from(optionMap.values()).sort((left, right) => left.label.localeCompare(right.label));
  }

  private extractFiltersFromPayload(payload: any): Record<string, any> {
    const filters = payload?.filters
      ?? payload?.data?.filters
      ?? payload?.results?.filters
      ?? payload?.items?.filters;
    return filters && typeof filters === 'object' ? filters : {};
  }

  private clearSelectedMatchedVehicleData(): void {
    this.carFormOne.patchValue({
      version: '',
      sittingCapacity: null,
      powerOutput: '',
      doors: '',
      engineType: '',
      co2Emission: '',
      consuption: '',
      fuel_type_id: '',
      transmission_id: '',
      drive_type_id: '',
      body_type_id: '',
      type_approval: '',
      vin_number: '',
      registration_master_number: ''
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
    return;
  }

  getLastInsertedData(): void {
    this.service.get('user/latest-draft-car').pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.patchDraftData(res?.data?.data || null);
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
    this.service.get(`user/fuel`).pipe(takeUntil(this.destroy$)).subscribe({
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
    this.service.get(`user/transmission`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.transmissions = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching transmissions:', error);
      }
    });
  }

  getDriveTypes() {
    this.service.get(`user/drive`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.driveTypes = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching drive types:', error);
      }
    });
  }

  getBodyTypes() {
    this.service.get(`user/body-type`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.bodyTypes = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching body types:', error);
      }
    });
  }

  getVhicleConditions() {
    this.service.get(`user/vehicle-conditions`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.conditions = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching vehicle conditions:', error);
      }
    });
  }

  getCarState() {
    this.service.get(`user/vichel-state`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.carState = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching car state:', error);
      }
    });
  }

  getWarrantyList() {
    this.service.get(`user/warranty`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.warrantyList = (res?.data || []).sort((a: { id: number; }, b: { id: number; }) => a.id - b.id);
      },
      error: (error) => {
        console.error('Error fetching warranty list:', error);
      }
    });
  }

  getWarrantyTypes() {
    this.service.get(`user/warranty-quality`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.warrantyTypes = res?.data || [];
      },
      error: (error) => {
        console.error('Error fetching warranty types:', error);
      }
    });
  }

  getCarColors() {
    this.service.get(`user/colors`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.carColors = res?.data || [];
      },
      error: (error) => {
        console.error('Error fetching car colors:', error);
      }
    });
  }

  getEnergyEfficiency() {
    this.service.get(`user/energy-efficiency`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.energyEfficiencyOptions = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching energy efficiency options:', error);
      }
    });
  }
}
