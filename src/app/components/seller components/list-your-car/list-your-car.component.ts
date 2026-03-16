import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, first } from 'rxjs';
import { carData } from '../../../helper/carData';
import { CommonService } from '../../../services/common.service';
import { NoWhitespaceDirective } from '../../../helper/validators';
import { ValidationErrorService } from '../../../services/validation-error.service';

@Component({
  selector: 'app-list-your-car',
  imports: [FormsModule, NzSelectModule, ReactiveFormsModule, CommonModule, TranslateModule],
  templateUrl: './list-your-car.component.html',
  styleUrl: './list-your-car.component.css'
})
export class ListYourCarComponent {
  carFormOne!: FormGroup;
  carImages: File[] = [];
  selectedReel: File | null = null;
  reelThumbnail: File | null = null;
  loading: boolean = false;
  submitError: string | null = null;
  fuelTypes = carData.fuelTypes;
  transmissions = carData.transmissions;
  conditions = carData.conditions;
  sittingCapacity = carData.sittingCapacity;
  bodyTypes: any = carData.bodyTypes;
  carColors: any = carData.carColors;
  months = carData.months;
  years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i)
  private nextBtnListener?: (event: Event) => void;
  private submitInProgress = false;
  currentFormStep: number = 1;
  constructor(private service: CommonService, private message: NzMessageService, private fb: FormBuilder, public validationErrorService: ValidationErrorService) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadScript();
  }

  ngAfterViewInit(): void {
    this.bindStepValidation();
  }

  ngOnDestroy(): void {
    if (this.nextBtnListener) {
      const nextBtn = document.getElementById('nextBtn');
      nextBtn?.removeEventListener('click', this.nextBtnListener, true);
    }
  }

  private initForm(): void {
    this.carFormOne = this.fb.group({
      carModel: ['', [Validators.required, NoWhitespaceDirective.validate]],
      brandName: ['', [Validators.required, NoWhitespaceDirective.validate]],
      registration_month: ['', [Validators.required]],
      registration_year: ['', [Validators.required]],
      sittingCapacity: [null, [Validators.required]],
      bodyTypes: ['', [Validators.required]],
      selectYear: ['', [Validators.required]],
      carMileage: [null, [Validators.required, Validators.min(1)]],
      fuelType: ['', Validators.required],
      transmission: ['', Validators.required],
      engineType: [''],
      co2Emission: [''],
      powerOutput: [''],
      carCondition: ['', Validators.required],
      consuption: ['', Validators.required],
      carColor: ['', Validators.required],
      carFeatures: [[], Validators.required],
      extras: [[]],
      description: ['', [Validators.required, Validators.maxLength(1000), NoWhitespaceDirective.validate]],
      totalPrice: ['', [Validators.required, Validators.min(1)]],
      location: ['', [Validators.required, NoWhitespaceDirective.validate, Validators.maxLength(100)]],
      vrn: [''],
      isLeasing: [false],
      leasingPrice: [''],
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

      if (currentStep === 1 && !this.isStepOneValid()) {
        this.markStepOneTouched();
        this.message.error('Please complete all required fields in Step 1 before continuing.');
        return;
      }

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
      btnText.innerText = this.currentFormStep === this.getTotalSteps() ? 'Submit' : 'Next';
    }
  }

  private isStepOneValid(): boolean {
    // const vrn = (this.carFormOne.get('vrn')?.value || '').toString().trim();
    const brandName = (this.carFormOne.get('brandName')?.value || '').toString().trim();
    const carModel = (this.carFormOne.get('carModel')?.value || '').toString().trim();
    const registrationMonth = this.carFormOne.get('registration_month')?.value;
    const registrationYear = this.carFormOne.get('registration_year')?.value;

    // const hasVrn = !!vrn;
    const hasMakeModel = !!brandName && !!carModel && !!registrationMonth && !!registrationYear;

    return hasMakeModel;
  }

  private markStepOneTouched(): void {
    // this.carFormOne.get('vrn')?.markAsTouched();
    this.carFormOne.get('brandName')?.markAsTouched();
    this.carFormOne.get('carModel')?.markAsTouched();
    this.carFormOne.get('registration_month')?.markAsTouched();
    this.carFormOne.get('registration_year')?.markAsTouched();
  }

  onCarImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    Array.from(input.files).forEach(file => this.carImages.push(file));
    input.value = '';
  }

  onCarReelSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedReel = file;
    input.value = '';
  }

  onReelThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.reelThumbnail = file;
    input.value = '';
  }

  removeCarImage(index: number): void {
    this.carImages.splice(index, 1);
  }

  removeReel(): void {
    this.selectedReel = null;
  }

  removeReelThumbnail(): void {
    this.reelThumbnail = null;
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

      // if (key === 'carFeatures' || key === 'extras') {
      //   const arrayValue = formValue[key];
      //   if (Array.isArray(arrayValue)) {
      //     this.appendIfValue(formData, key, JSON.stringify(arrayValue));
      //   } else {
      //     this.appendIfValue(formData, key, arrayValue);
      //   }
      //   return;
      // }

      const apiKey = fieldMap[key] || key;
      this.appendIfValue(formData, apiKey, formValue[key]);
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

    return formData;
  }

  onSubmit(): void {
    if (!this.carFormOne) return;
    if (this.submitInProgress) return;
    this.submitCurrentStep();
  }

  private submitCurrentStep(): void {
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
        this.message.success(res?.message || 'Car listed successfully');
        const totalSteps = this.getTotalSteps();
        if (this.currentFormStep < totalSteps) {
          this.goToStep(this.currentFormStep + 1);
        }
      },
      error: (error: any) => {
        const errMsg = error?.message || 'Failed to list car. Please try again.';
        this.submitError = errMsg;
        this.message.error(errMsg);
      }
    });
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
}
