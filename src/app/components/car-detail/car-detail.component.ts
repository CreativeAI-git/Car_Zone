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
import { FormsModule } from '@angular/forms';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';
declare var Swiper: any;
@Component({
  selector: 'app-car-detail',
  imports: [CommonModule, ChfFormatPipe, TranslateModule, NzImageModule, FormsModule, SubmitButtonComponent, RouterLink],
  templateUrl: './car-detail.component.html',
  styleUrl: './car-detail.component.css'
})
export class CarDetailComponent {
  @ViewChild('closeReportModal') closeReportModal!: ElementRef;
  private destroy$ = new Subject<void>();
  carData: any
  carId: any
  token: any
  conditions = carData.conditions
  ShoMore: boolean = false
  reportReasons: any[] = []
  selectedReportReasons: number[] = [];
  customReportReason: string = '';
  loading: boolean = false
  constructor(private service: CommonService, private route: ActivatedRoute, private loader: LoaderService, private router: Router, private message: NzMessageService, private modalService: ModalService, public authService: AuthService, private translate: TranslateService, public location: Location) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.route.queryParamMap.subscribe(params => {
      this.carId = params.get('id')
      this.getCarDetail()
    })
  }

  ngOnInit(): void {
    this.token = this.authService.getToken();
    if (this.authService.isLogedIn()) {
      this.getReportReasons()
      this.addToRecentlyViewed()
    }
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
        spaceBetween: 10,
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
      this.message.success('Car deleted successfully')
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
      this.message.error('Please select at least one reason');
      return;
    }
    if (this.selectedReportReasons.includes(8) && !this.customReportReason) {
      this.message.error('Please enter a custom report reason');
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
      this.message.error('Failed to report car');
      this.loading = false
    })
  }

}
