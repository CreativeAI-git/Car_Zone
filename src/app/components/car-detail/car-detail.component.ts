import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoleDirective } from '../../directives/role.directive';
import { CommonService } from '../../services/common.service';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule, Location } from '@angular/common';
import { carData } from '../../helper/carData';
import { LoaderService } from '../../services/loader.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ChfFormatPipe } from '../../pipes/chf-format.pipe';
import { ModalService } from '../../services/modal.service';
import { AuthService } from '../../services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzImageModule } from 'ng-zorro-antd/image';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';
import { ShareButtons } from 'ngx-sharebuttons/buttons';
import { ValidationErrorService } from '../../services/validation-error.service';
import { NoWhitespaceDirective } from '../../helper/validators';

declare var Swiper: any;
@Component({
  selector: 'app-car-detail',
  imports: [CommonModule, ChfFormatPipe, TranslateModule, NzImageModule, FormsModule, ReactiveFormsModule, SubmitButtonComponent, RouterLink, ShareButtons],
  templateUrl: './car-detail.component.html',
  styleUrl: './car-detail.component.css'
})
export class CarDetailComponent {
  @ViewChild('closeReportModal') closeReportModal!: ElementRef;
  @ViewChild('closeInquiryModal') closeInquiryModal!: ElementRef<HTMLButtonElement>;
  private destroy$ = new Subject<void>();
  carData: any
  carId: any
  token: any
  inquiryForm: FormGroup;
  shareUrl: string = '';
  shareImage: string = '';
  conditions = carData.conditions
  ShoMore: boolean = false
  reportReasons: any[] = []
  inquiryOptions = [
    { key: 'leasing' },
    { key: 'payment' },
    { key: 'insurance' },
    { key: 'tradeIn' }
  ];
  selectedReportReasons: number[] = [];
  customReportReason: string = '';
  loading: boolean = false
  inquiryLoading: boolean = false
  constructor(private service: CommonService, private route: ActivatedRoute, private loader: LoaderService, private router: Router, private message: NzMessageService, private modalService: ModalService, public authService: AuthService, private translate: TranslateService, public location: Location, private fb: FormBuilder, public validationErrorService: ValidationErrorService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.token = this.authService.getToken();
    this.inquiryForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), NoWhitespaceDirective.validate]],
      email: ['', [Validators.required, Validators.email]],
      phone_number: ['', [Validators.required, Validators.pattern(/^[+]?[0-9\s()-]{7,20}$/)]],
      inquiry_types: [[], [Validators.required]],
      message: ['', [Validators.maxLength(500)]]
    });
    this.route.queryParamMap.subscribe(params => {
      this.carId = params.get('id')
      this.getCarDetail()
    })
  }

  ngOnInit(): void {
    this.shareUrl = globalThis.location?.href ?? '';
    if (this.authService.isLogedIn()) {
      this.patchInquiryUserData();
      this.getReportReasons()
      this.addToRecentlyViewed()
    }
  }

  patchInquiryUserData() {
    const userProfile = this.service.userData();
    if (!userProfile) {
      this.service.get('user/web/getUserProfile').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
        const profile = res.data;
        this.service.userData.set(profile);
        this.inquiryForm.patchValue({
          full_name: profile.fullName || '',
          email: profile.email || '',
          phone_number: `${profile.countryCode || ''}${profile.phoneNumber || ''}`
        });
      });
      return;
    }

    this.inquiryForm.patchValue({
      full_name: userProfile.fullName || '',
      email: userProfile.email || '',
      phone_number: `${userProfile.countryCode || ''}${userProfile.phoneNumber || ''}`
    });
  }

  addToRecentlyViewed() {
    this.service.post('user/addRecentlyViewed', { carId: this.carId }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
    })
  }

  getCarDetail() {
    this.loader.show();
    const endpoint = this.token
      ? `user/getCar/${this.carId}`
      : `user/asGuestUserGetCar/${this.carId}`;

    this.service.get(endpoint)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.carData = res;
          this.shareImage = this.carData?.images?.[0] || '';
          this.loader.hide();
          this.loadSweper()
        },
        error: (err) => {
          console.error('Failed to fetch car details:', err);
          this.loader.hide();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.loadSweper()
  }

  loadSweper() {
    setTimeout(() => {
      const thumbs = new Swiper(`.mySwiperThumbs`, {
        slidesPerView: 6,
        spaceBetween: 10,
        watchSlidesProgress: true,
      });

      new Swiper(`.mySwiperMain`, {
        slidesPerView: 1,
        spaceBetween: 10,
        pagination: {
          el: ".swiper-pagination",
          type: "fraction",
        },
        thumbs: {
          swiper: thumbs
        }
      });

      new Swiper('.CarSwiper', {
        direction: 'horizontal',
        slidesPerView: 2,
        spaceBetween: 20,
        loop: true,
        breakpoints: {
          640: {
            slidesPerView: 1,
          },
          768: {
            slidesPerView: 2,
          },
          1024: {
            slidesPerView: 2,
          },
        },
      });
    }, 1000);
  }

  addToWishlist(item: any) {
    if (!this.authService.isLogedIn()) {
      this.modalService.openLoginModal();
      return;
    }
    item.is_in_wishlist = !item.is_in_wishlist
    this.service.post('user/addToWishlist', { carId: item.vehicle.id }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
    })
  }

  removeFromWishlist(item: any) {
    item.is_in_wishlist = !item.is_in_wishlist
    this.service.delete('user/removeCarFromWishlist', { carId: item.vehicle.id }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
    })
  }

  deleteListing(item: any) {
    this.service.delete('user/deleteCar/' + item.id + '?user_id=' + item.user_id + '').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.router.navigate(['my-listings'])
      this.message.success(this.translate.instant('vehicle.carDeletedSuccessfully'))
    })
  }

  getReportReasons() {
    this.service.get('user/report-reasons').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.reportReasons = res.data
    })
  }

  contactSeller(item: any) {
    if (this.token) {
      let sellerData = {
        id: item.seller.id,
        name: item.seller.name,
        email: item.seller.email,
        profileImage: item.seller.profileImage,
        carId: item.vehicle.id,
        carImage: item.images[0],
        carName: item.vehicle.brand + ' ' + item.vehicle.model
      }

      this.service.sellerData.set(sellerData)
      sessionStorage.setItem('sellerData', JSON.stringify(sellerData))
      this.router.navigate(['/chats'])
    } else {
      this.modalService.openLoginModal();
    }
  }

  openInquiryLoginModal() {
    this.modalService.openLoginModal();
  }

  shareOnWhatsapp(item: any) {
    let whatsappUrl = `https://wa.me/?text=${encodeURIComponent(item.title)} ${encodeURIComponent(item.description)} ${encodeURIComponent(item.price)}`;
    window.open(whatsappUrl, '_blank');
    // this.message.success('Whatsapp message sent successfully')
  }

  callSeller(phone: string) {
    window.location.href = `tel:${phone}`;
  }

  viewCarDetail(id: any) {
    this.carId = id;
    this.getCarDetail();
    this.router.navigate(['/car-detail'], { queryParams: { id: id } });
  }

  trackByImage(index: number, img: string) {
    return img;
  }

  onReportReasonChange(event: any) {
    const checkedValue = Number(event.target.value);
    const isChecked = event.target.checked;

    if (isChecked) {
      this.selectedReportReasons.push(checkedValue);
    } else {
      this.selectedReportReasons = this.selectedReportReasons.filter(
        (id: number) => id !== checkedValue
      );
    }
  }

  reportCar() {
    if (this.selectedReportReasons.length === 0) {
      this.message.error(this.translate.instant('vehicle.pleaseSelectAtLeastOneReason'));
      return;
    }
    if (this.selectedReportReasons.includes(8) && !this.customReportReason) {
      this.message.error(this.translate.instant('vehicle.pleaseEnterCustomReportReason'));
      return;
    }
    this.loading = true
    this.service.post(`user/report-cars/${this.carId}`, {
      reasons: this.selectedReportReasons,
      // customReportReason: this.customReportReason
    }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.message.success(res.message);
      this.selectedReportReasons = [];
      this.customReportReason = '';
      this.loading = false
      this.closeReportModal.nativeElement.click();
    }, (err: any) => {
      this.message.error(this.translate.instant('vehicle.failedToReportCar'));
      this.loading = false
    })
  }

  onInquiryTypeChange(option: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const selectedTypes = [...(this.inquiryForm.get('inquiry_types')?.value || [])];

    if (input.checked) {
      if (!selectedTypes.includes(option)) {
        selectedTypes.push(option);
      }
    } else {
      const index = selectedTypes.indexOf(option);
      if (index > -1) {
        selectedTypes.splice(index, 1);
      }
    }

    this.inquiryForm.get('inquiry_types')?.setValue(selectedTypes);
    this.inquiryForm.get('inquiry_types')?.markAsTouched();
    this.inquiryForm.get('inquiry_types')?.updateValueAndValidity();
  }

  isInquiryTypeSelected(option: string) {
    return (this.inquiryForm.get('inquiry_types')?.value || []).includes(option);
  }

  submitInquiry() {
    if (!this.authService.isLogedIn()) {
      this.modalService.openLoginModal();
      return;
    }

    if (this.inquiryForm.invalid) {
      this.inquiryForm.markAllAsTouched();
      return;
    }

    const selectedTypes = this.inquiryForm.value.inquiry_types || [];
    const payload = {
      seller_id: this.carData?.seller?.id,
      car_id: this.carData?.vehicle?.id,
      full_name: this.inquiryForm.value.full_name?.trim(),
      email: this.inquiryForm.value.email?.trim(),
      phone_number: this.inquiryForm.value.phone_number?.trim(),
      inquiry_type_text: selectedTypes
        .map((type: string) => this.translate.instant(`vehicle.${type === 'insurance' ? 'insuarance' : type}`))
        .join(', '),
      message: this.inquiryForm.value.message?.trim() || ''
    };

    if (!payload.seller_id || !payload.car_id) {
      this.message.error(this.translate.instant('vehicle.carDetailsNotAvailableYet'));
      return;
    }

    this.inquiryLoading = true;
    this.service.post('user/car-inquiry', payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.message.success(res.message || this.translate.instant('vehicle.inquirySentSuccessfully'));
        this.inquiryLoading = false;
        this.inquiryForm.reset({
          full_name: this.inquiryForm.value.full_name,
          email: this.inquiryForm.value.email,
          phone_number: this.inquiryForm.value.phone_number,
          inquiry_types: [],
          message: ''
        });
        this.patchInquiryUserData();
        this.closeInquiryModal?.nativeElement.click();
      },
      error: (err: any) => {
        this.inquiryLoading = false;
        this.message.error(err.message || this.translate.instant('vehicle.failedToSendInquiry'));
      }
    });
  }

  downloadPDF() {
    this.loading = true
    this.service.getBlob(`user/cars/${this.carId}/download-pdf`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: Blob) => {
          const pdfUrl = window.URL.createObjectURL(res);
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = `car-zone.pdf`;
          link.click();
          window.URL.revokeObjectURL(pdfUrl);
          this.loading = false
        },
        error: (err: any) => {
          console.error('Failed to download PDF:', err);
          this.loading = false
        }
      });
  }
}
