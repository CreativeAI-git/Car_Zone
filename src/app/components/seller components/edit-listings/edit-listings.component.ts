import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Subject, takeUntil } from 'rxjs';
import { carData } from '../../../helper/carData';
import { NoWhitespaceDirective } from '../../../helper/validators';
import { CommonService } from '../../../services/common.service';
import { ValidationErrorService } from '../../../services/validation-error.service';
import { SubmitButtonComponent } from '../../shared/submit-button/submit-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
declare var bootstrap: any;

@Component({
  selector: 'app-edit-listings',
  imports: [FormsModule, NzSelectModule, ReactiveFormsModule, CommonModule, SubmitButtonComponent, TranslateModule, ImageCropperComponent],
  templateUrl: './edit-listings.component.html',
  styleUrl: './edit-listings.component.css'
})
export class EditListingsComponent {
  @ViewChild('featureInput') featureInput!: ElementRef<HTMLButtonElement>
  @ViewChild('closeBtn') closeBtn!: ElementRef<HTMLButtonElement>;
  private destroy$ = new Subject<void>();
  brandList: any[] = []
  modalList: any[] = []
  years: number[] = [];
  carFormOne!: FormGroup;
  selectedFeatures: string[] = [];
  carImages: File[] = [];
  previewCarImages: any[] = [];
  submitted: boolean = false;
  selectedVideo: File | null = null;
  videoPreview: string | null = null;
  fuelTypes = carData.fuelTypes
  transmissions = carData.transmissions
  conditions = carData.conditions
  sittingCapacity = carData.sittingCapacity
  bodyTypes: any = carData.bodyTypes
  loading: boolean = false;
  carColors: any = carData.carColors
  isCarColorOther: boolean = false;
  carId: any
  itemHeight = 44;
  wholeNumbers = Array.from({ length: 70 }, (_, i) => i.toString().padStart(2, '0'));
  decimalNumbers = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09'];
  activeWholeIndex = 0;
  activeDecimalIndex = 0;
  resultValue = '0.0';
  private timer: any = {};
  @ViewChild('wholeWheel') wholeWheel!: ElementRef<HTMLDivElement>;
  @ViewChild('decimalWheel') decimalWheel!: ElementRef<HTMLDivElement>;
  thumbnailImage: File | null = null;
  thumbnailImagePreview: string | null = null;
  constructor(private service: CommonService, private message: NzMessageService, private fb: FormBuilder, public validationErrorService: ValidationErrorService, private http: HttpClient, private router: Router, private route: ActivatedRoute, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.route.queryParamMap.subscribe(params => {
      this.carId = params.get('id')
    })
    this.initForm()
  }

  ngOnInit(): void {
    this.getBrands()
    const currentYear = new Date().getFullYear();
    for (let i = 0; i <= 30; i++) {
      this.years.push(currentYear - i);
    }
    this.carFormOne.get('brandName')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.getModalList(res)
    })
    this.carFormOne.get('isLeasing')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      if (res) {
        this.carFormOne.get('leasingPrice')?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        this.carFormOne.get('leasingPrice')?.clearValidators();
      }
      this.carFormOne.get('leasingPrice')?.updateValueAndValidity();
    })
    this.carFormOne.get('carColor')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      if (res === 'Other') {
        this.isCarColorOther = true;
        this.carFormOne.get('carColor')?.setValue('');
      }
    })
  }

  ngAfterViewInit(): void {
    this.snap(this.wholeWheel.nativeElement, 0);
    this.snap(this.decimalWheel.nativeElement, 0);
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
      totalPrice: ['', [Validators.required, Validators.min(1)]],
      location: ['', [Validators.required, NoWhitespaceDirective.validate, Validators.maxLength(100)]],
      isLeasing: [false],
      leasingPrice: [''],
    })
  }

  getCarDetail() {
    this.service.get('user/getCar/' + this.carId + '').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      const carData = res
      carData.selectYear = Number(carData.vehicle.year)
      this.carFormOne.patchValue(carData.vehicle)
      const formattedDate = new Date(carData.first_registration_date).toISOString().split('T')[0];

      this.isCarColorOther = this.carColors.find((item: any) => item.key.toLowerCase() !== carData.carColor.toLowerCase());
      this.carFormOne.patchValue({
        first_registration_date: formattedDate,
        bodyTypes: carData.body_type,
        consuption: carData.consumption,
        carColor: this.carColors.find((item: any) => item.key.toLowerCase() === carData.carColor.toLowerCase())?.title || carData.carColor
      });
      this.selectedFeatures = carData.carFeatures.split(',')
      this.featureInput.nativeElement.value = '';
      this.previewCarImages = carData.carImages;
      this.videoPreview = carData.carReel
      this.thumbnailImagePreview = carData.reelThumbnails
      this.carFormOne.patchValue({
        isLeasing: carData.isLeasing == '1',
        leasingPrice: carData.leasingPrice
      })
    })
  }

  getBrands() {
    this.service.get('user/brand').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.brandList = res.data;
      this.getCarDetail()
    })
  }

  getModalList(brand: any) {
    const brandId = this.brandList.find((item: any) => item.make_display.toLowerCase() == brand.toLowerCase())?.make_id
    this.service.get('user/getModel/' + brandId).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.modalList = res.data
    })
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
    this.previewCarImages.push(this.croppedImage)
    this.carImages.push(new File([this.croppedImageBlob], 'cover.png', {
      type: 'image/png'
    }))
    this.closeBtn.nativeElement.click()
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

  removeCarImage(index: number, imgUrl: string) {
    this.previewCarImages.splice(index, 1);
    this.carImages.splice(index, 1);
    this.service.delete('user/deleteCar-image', { imageUrl: imgUrl }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => { })
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

    if (this.previewCarImages.length == 0) {
      this.submitted = true
      this.carFormOne.markAllAsTouched();
      return
    }

    if (this.carFormOne.get('isLeasing')?.value && !this.carFormOne.get('leasingPrice')?.value) {
      this.submitted = true
      this.carFormOne.markAllAsTouched();
      return
    }

    this.loading = true;
    const formData = new FormData();
    formData.append('carModel', this.carFormOne.get('carModel')?.value);
    formData.append('brandName', this.carFormOne.get('brandName')?.value);
    formData.append('sittingCapacity', this.carFormOne.get('sittingCapacity')?.value);
    formData.append('selectYear', this.carFormOne.get('selectYear')?.value);
    formData.append('carMileage', this.carFormOne.get('carMileage')?.value);
    formData.append('fuelType', this.carFormOne.get('fuelType')?.value);
    formData.append('body_type', this.carFormOne.get('bodyTypes')?.value);
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
    formData.append('totalPrice', this.carFormOne.get('totalPrice')?.value);
    formData.append('isLeasing', this.carFormOne.get('isLeasing')?.value ? '1' : '0');
    formData.append('leasingPrice', this.carFormOne.get('leasingPrice')?.value || '0');
    formData.append('location', this.carFormOne.get('location')?.value);

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

    this.service.update('user/updateCar' + '/' + this.carId, formData).pipe(takeUntil(this.destroy$)).subscribe({
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
}
