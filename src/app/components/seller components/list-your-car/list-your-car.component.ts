import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../../services/common.service';
import { NoWhitespaceDirective, vinValidator } from '../../../helper/validators';
import { ValidationErrorService } from '../../../services/validation-error.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SubmitButtonComponent } from '../../shared/submit-button/submit-button.component';
import { carData } from '../../../helper/carData';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
declare var bootstrap: any;

@Component({
  selector: 'app-list-your-car',
  imports: [FormsModule, NzSelectModule, ReactiveFormsModule, CommonModule, TranslateModule],
  templateUrl: './list-your-car.component.html',
  styleUrl: './list-your-car.component.css'
})
export class ListYourCarComponent {
  @ViewChild('featureInput') featureInput!: ElementRef<HTMLButtonElement>
  @ViewChild('closeBtn') closeBtn!: ElementRef<HTMLButtonElement>;
  private destroy$ = new Subject<void>();
  brandList: any[] = []
  modalList: any[] = []
  years: number[] = [];
  selectedPlan: any = null;
  carFormOne!: FormGroup;
  carFormTwo!: FormGroup;
  formStep: number = 1;
  entryType: number = 1;
  selectedFeatures: string[] = [];
  carImages: File[] = [];
  previewCarImages: any[] = [];
  submitted: boolean = false;
  selectedVideo: File | null = null;
  videoPreview: string | null = null;
  thumbnailImage: File | null = null;
  thumbnailImagePreview: string | null = null;
  fuelTypes = carData.fuelTypes
  transmissions = carData.transmissions
  conditions = carData.conditions
  sittingCapacity = carData.sittingCapacity
  bodyTypes: any = carData.bodyTypes
  carColors: any = carData.carColors
  loading: boolean = false
  isCarColorOther: boolean = false;
  itemHeight = 44;
  wholeNumbers = Array.from({ length: 70 }, (_, i) => i.toString().padStart(2, '0'));
  decimalNumbers = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09'];
  activeWholeIndex = 0;
  activeDecimalIndex = 0;
  resultValue = '0.0';
  private timer: any = {};
  @ViewChild('wholeWheel') wholeWheel!: ElementRef<HTMLDivElement>;
  @ViewChild('decimalWheel') decimalWheel!: ElementRef<HTMLDivElement>;
  constructor(private service: CommonService, private message: NzMessageService, private fb: FormBuilder, public validationErrorService: ValidationErrorService, private http: HttpClient, private router: Router, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.initForm()
  }

  ngOnInit(): void {
    this.getBrands()
    this.carFormOne.get('brandName')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.getModalList(res)
    })

    this.carFormOne.get('carColor')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      if (res === 'Other') {
        this.isCarColorOther = true;
        this.carFormOne.get('carColor')?.setValue('');
      }
    })

    const currentYear = new Date().getFullYear();
    for (let i = 0; i <= 30; i++) {
      this.years.push(currentYear - i);
    }

    this.carFormTwo.get('isLeasing')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      if (res) {
        this.carFormTwo.get('leasingPrice')?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        this.carFormTwo.get('leasingPrice')?.clearValidators();
      }
      this.carFormTwo.get('leasingPrice')?.updateValueAndValidity();
    })
  }

  ngAfterViewInit(): void {
    // this.snap(this.wholeWheel.nativeElement, 0);
    // this.snap(this.decimalWheel.nativeElement, 0);
    this.loadScript()
  }

  initForm() {
    this.carFormOne = this.fb.group({
      carModel: ['', [Validators.required, NoWhitespaceDirective.validate]],
      brandName: ['', [Validators.required, NoWhitespaceDirective.validate]],
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
      first_registration_date: ['', Validators.required],
      consuption: ['', Validators.required],
      carColor: ['', Validators.required],
      carFeatures: ['', Validators.required],
      description: ['', [Validators.required, Validators.maxLength(1000), NoWhitespaceDirective.validate]],
      vrn: ['', [Validators.required, vinValidator()]],

    });

    this.carFormTwo = this.fb.group({
      totalPrice: ['', [Validators.required, Validators.min(1)]],
      location: ['', [Validators.required, NoWhitespaceDirective.validate, Validators.maxLength(100)]],
      isLeasing: [false],
      leasingPrice: [''],
    })
  }

  getBrands() {
    this.service.get('user/brand').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.brandList = res.data
    })
  }

  getModalList(brand: any) {
    const brandId = this.brandList.find((item: any) => item.make_display.toLowerCase() == brand.toLowerCase())?.make_id
    this.service.get('user/getModel/' + brandId).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.modalList = res.data
    })
  }

  nextStep(form: any) {
    if (form.invalid) {
      Object.keys(form.controls).forEach(key => {
        form.get(key)?.markAsDirty();
        form.get(key)?.markAsTouched();
      });
    } else {
      if (this.formStep === 1) {
        this.service.post('user/descriptionAwsRecognition', { description: form.get('description')?.value }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
          if (res.success) {
            this.formStep = this.formStep + 1
            this.entryType = 2
          } else {
            this.message.error(res.message);
          }
        }, (error: any) => {
          this.message.error(error);
        })
      } else {
        this.formStep = this.formStep + 1
        this.entryType = 2
      }
    }
  }

  previousStep() {
    this.formStep = this.formStep - 1
  }
  onEvent(e: any) {
    console.log('Scanned:', e.data);
  }

  fetchCarDetailByVIN() {
    if (this.carFormOne.get('vrn')?.invalid) {
      this.carFormOne.get('vrn')?.markAllAsTouched();
      return;
    }

    const vin = this.carFormOne.get('vrn')?.value;
    this.loading = true;

    this.http
      .get(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`)
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.Results?.length > 0) {
            const result = res.Results[0];
            this.carFormOne.patchValue({
              brandName: result.Make,
              carModel: result.Model,
              selectYear: Number(result.ModelYear),
            })
            this.entryType = 2
          }
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  addFeature(benifit: string) {
    if (!this.selectedFeatures.includes(benifit)) {
      if (benifit.trim() != '') {
        this.selectedFeatures.push(benifit.trim());
        this.featureInput.nativeElement.value = '';
      }
    } else {
      this.message.error('Benifit already added');
    }
  }

  removeFeature(index: number) {
    this.selectedFeatures.splice(index, 1);
  }

  imageChangedEvent: any = '';
  croppedImage: any = '';
  croppedImageBlob: any = '';
  onCoverImage(event: any): void {
    this.imageChangedEvent = event;
    if (event.target.files && event.target.files[0]) {
      this.openModal();
    }
  }

  imageCropped(event: ImageCroppedEvent) {
    this.croppedImageBlob = event.blob;
    this.croppedImage = event.objectUrl;
  }

  onDone() {
    this.previewCarImages.push(this.croppedImage);
    this.carImages.push(new File([this.croppedImageBlob], 'cover.png', {
      type: 'image/png'
    }));
    this.closeBtn.nativeElement.click();
  }

  openModal() {
    const modalElement = document.getElementById('ct_feedback_detail_modal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
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

  removeCarImage(index: number) {
    this.previewCarImages.splice(index, 1);
    this.carImages.splice(index, 1);
  }

  onThumbnailImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.thumbnailImage = file;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.thumbnailImagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeThumbnailImage() {
    this.thumbnailImage = null;
    this.thumbnailImagePreview = null;
  }

  onSubmit() {

    if (this.carImages.length == 0) {
      this.submitted = true
      return
    }

    this.loading = true;
    const formData = new FormData();
    formData.append('carModel', this.carFormOne.get('carModel')?.value);
    formData.append('brandName', this.carFormOne.get('brandName')?.value);
    formData.append('sittingCapacity', this.carFormOne.get('sittingCapacity')?.value);
    formData.append('body_type', this.carFormOne.get('bodyTypes')?.value);
    formData.append('selectYear', this.carFormOne.get('selectYear')?.value);
    formData.append('carMileage', this.carFormOne.get('carMileage')?.value);
    formData.append('fuelType', this.carFormOne.get('fuelType')?.value);
    formData.append('consumption', this.carFormOne.get('consuption')?.value);
    formData.append('transmission', this.carFormOne.get('transmission')?.value);
    formData.append('engineType', this.carFormOne.get('engineType')?.value);
    formData.append('co2Emission', this.carFormOne.get('co2Emission')?.value);
    formData.append('powerOutput', this.carFormOne.get('powerOutput')?.value);
    formData.append('carCondition', this.carFormOne.get('carCondition')?.value);
    formData.append('first_registration_date', this.carFormOne.get('first_registration_date')?.value);
    formData.append('carFeatures', this.selectedFeatures.join(','));
    formData.append('vrn', this.carFormOne.get('vrn')?.value);
    formData.append('carColor', this.carFormOne.get('carColor')?.value);
    formData.append('description', this.carFormOne.get('description')?.value);
    formData.append('totalPrice', this.carFormTwo.get('totalPrice')?.value);
    formData.append('isLeasing', this.carFormTwo.get('isLeasing')?.value ? '1' : '0');
    formData.append('leasingPrice', this.carFormTwo.get('leasingPrice')?.value || '0');
    formData.append('location', this.carFormTwo.get('location')?.value);

    if (this.carImages.length > 0) {
      for (let i = 0; i < this.carImages.length; i++) {
        formData.append('carImages', this.carImages[i]);
      }
    }
    if (this.selectedVideo) {
      formData.append('carReel', this.selectedVideo);
    }
    if (this.thumbnailImage) {
      formData.append('reelThumbnails', this.thumbnailImage);
    }

    this.service.post('user/listYourCar', formData).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.message.success(res.message);
        this.router.navigate(['/my-listings']);
      },
      error: (error) => {
        this.loading = false;
        this.message.error(error.error.message);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onScroll(event: any, type: 'whole' | 'decimal') {
    const wheel = event.target;

    if (this.timer[type]) clearTimeout(this.timer[type]);

    this.timer[type] = setTimeout(() => {
      this.handleSnap(type, wheel);
    }, 100);
  }

  handleSnap(type: 'whole' | 'decimal', wheel: HTMLElement) {
    let index = Math.round(wheel.scrollTop / this.itemHeight);

    const max =
      type === 'whole' ? this.wholeNumbers.length - 1 : this.decimalNumbers.length - 1;

    if (index < 0) index = 0;
    if (index > max) index = max;

    this.snap(wheel, index);

    if (type === 'whole') this.activeWholeIndex = index;
    else this.activeDecimalIndex = index;

    this.updateResult();
  }

  snap(wheel: HTMLElement, index: number) {
    wheel.scrollTo({
      top: index * this.itemHeight,
      behavior: 'smooth'
    });
  }

  updateResult() {
    const w = parseInt(this.wholeNumbers[this.activeWholeIndex], 10);
    const d = parseInt(this.decimalNumbers[this.activeDecimalIndex], 10);

    this.resultValue = `${w}.${d}`;
  }

  onDoneModalCloseBtnClick() {
    this.carFormOne.get('consuption')?.setValue(this.resultValue);
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
