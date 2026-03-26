import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonService } from '../../services/common.service';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader.service';
import { ChfFormatPipe } from '../../pipes/chf-format.pipe';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FormsModule } from '@angular/forms';

declare var Swiper: any;

@Component({
  selector: 'app-browse-cars',
  imports: [RouterLink, CommonModule, ChfFormatPipe, TranslateModule, NzPopoverModule, NzImageModule, NzSliderModule, NzSelectModule, FormsModule],
  templateUrl: './browse-cars.component.html',
  styleUrl: './browse-cars.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],

})
export class BrowseCarsComponent {
  private destroy$ = new Subject<void>();
  private priceRangeChange$ = new Subject<void>();
  private kmRangeChange$ = new Subject<void>();
  carsList: any[] = []
  visible: boolean = false
  bodyTypeVisible: boolean = false
  YearVisible: boolean = false
  PriceVisible: boolean = false
  MilageVisible: boolean = false
  FuelVisible: boolean = false
  TransmissionVisible: boolean = false
  PowerVisible: boolean = false
  token: any;
  selectedBrandsModal: any[] = [];
  recentlyViewedlist: any[] = []
  bodyTypes: any
  priceRangeAnalytics: any
  yearRangeAnalytics: any
  kmRangeAnalytics: any
  matchingProgress: number = 0
  priceRange: any = [1, 100000];
  leasePriceRange: any = [10, 2000];
  yearRange: any = [2015, 2020];
  years: number[] = [];
  kmRange: any = [1, 4000000];
  kms: number[] = [];
  priceType: 'Purchase' | 'Lease' = 'Purchase'
  transmissions: any[] = [];
  selectedTransmissionIds: any[] = [];
  fuelTypeGroups: { label: string; options: { label: string; value: any; count?: number }[] }[] = [];
  selectedFuelIds: any[] = [];
  fuelTypeData: any = {};
  constructor(private service: CommonService, private loader: LoaderService, private authService: AuthService, private modalService: ModalService, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
  }

  ngOnInit(): void {
    this.token = this.authService.getToken();
    this.getCars()

    if (this.authService.isLogedIn()) {
      this.getRecentlyViewedlist()
    }
    this.getBodyTypes()
    this.getPriceRangeAnalytics()

    this.priceRangeChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.getPriceRangeAnalytics());

    this.kmRangeChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.getKmRangeAnalytics());

    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1990; year--) {
      this.years.push(year);
    }
    this.getYearRangeAnalytics();

    for (let km = 0; km <= 4000000; km += 1000) {
      this.kms.push(km);
    }
    this.getKmRangeAnalytics();
    this.getTransmissions();
    this.getFuelTypes();
  }

  getCars() {
    this.loader.show();
    this.service
      .get(this.token
        ? 'user/fetchOtherSellerCarsList'
        : 'user/asGuestUserFetchSellerCarsList'
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.carsList = res.data;
        this.loaded = true;
        setTimeout(() => {
          this.loadSwiper();
        });

        this.loader.hide();
      }, () => {
        this.loader.hide();
      });
  }

  loaded: boolean = false
  loadSwiper(): void {
    this.carsList.forEach((_, i) => {
      const thumbs = new Swiper(`.mySwiperThumbs-${i}`, {
        slidesPerView: 6,
        spaceBetween: 10,
        watchSlidesProgress: true,
      });

      new Swiper(`.mySwiperMain-${i}`, {
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
    });
  }


  getRecentlyViewedlist() {
    this.service.get('user/getRecentlyViewedlist').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.recentlyViewedlist = res.data
    })
  }

  addToWishlist(item: any) {
    if (!this.authService.isLogedIn()) {
      this.modalService.openLoginModal();
      return;
    }
    item.isWishlist = !item.isWishlist;

    this.service.post('user/addToWishlist', { carId: item.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          // success response
        },
        error: (err) => {
          console.error('Wishlist API failed:', err);
          item.isWishlist = !item.isWishlist;
          this.modalService.openLoginModal();
        }
      });
  }


  removeFromWishlist(item: any) {
    item.isWishlist = !item.isWishlist
    this.service.delete('user/removeCarFromWishlist', { carId: item.id }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
    })
  }


  getBodyTypes() {
    this.service.get(`user/body-type?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.bodyTypes = res?.data || {};
      },
      error: (error) => {
        console.error('Error fetching body types:', error);
      }
    });
  }

  getPriceRangeAnalytics() {
    const activeRange = this.priceType === 'Purchase' ? this.priceRange : this.leasePriceRange;
    const [priceFrom, priceTo] = activeRange || [];
    const query = `car_price_from=${priceFrom}&car_price_to=${priceTo}`;
    const endpoint = this.priceType === 'Purchase'
      ? `user/price-range-analytics?${query}`
      : `get-leasing-analyics?${query}`;

    this.service.get(endpoint).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.priceRangeAnalytics = res?.data || {};
        this.updateMatchingProgress();
      },
      error: (error) => {
        console.error('Error fetching price range analytics:', error);
      }
    });
  }

  getYearRangeAnalytics() {
    const [fromYear, toYear] = this.yearRange || [];
    const query = `from_year=${fromYear}&to_year=${toYear}`;
    this.service.get(`user/year-range-analytics?${query}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.yearRangeAnalytics = res?.data || {};
      },
      error: (error) => {
        console.error('Error fetching year range analytics:', error);
      }
    });
  }

  onYearRangeChange() {
    this.getYearRangeAnalytics();
  }

  getKmRangeAnalytics() {
    const [fromKm, toKm] = this.kmRange || [];
    const query = `from_km=${fromKm}&to_km=${toKm}`;
    this.service.get(`user/kilometers-range-analytics?${query}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.kmRangeAnalytics = res?.data || {};
      },
      error: (error) => {
        console.error('Error fetching kilometers range analytics:', error);
      }
    });
  }

  onKmRangeChange() {
    this.kmRangeChange$.next();
  }

  getTransmissions() {
    this.service.get(`user/transmission?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.transmissions = res?.data?.types || [];
      },
      error: (error) => {
        console.error('Error fetching transmissions:', error);
      }
    });
  }

  onTransmissionToggle(id: any, e: any) {
    if (e.target.checked) {
      if (!this.selectedTransmissionIds.includes(id)) {
        this.selectedTransmissionIds.push(id);
      }
      return;
    }
    this.selectedTransmissionIds = this.selectedTransmissionIds.filter((x) => x !== id);
  }

  getFuelTypes() {
    const lang = this.translate.currentLang || 'fr';
    const selectedIds = this.selectedFuelIds.length > 0 ? this.selectedFuelIds.join(',') : '';
    const query = `lang=${lang}${selectedIds ? `&selected_ids=${selectedIds}` : ''}`;

    this.service.get(`user/fuel?${query}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const data = res?.data || {};
        this.fuelTypeData = data;
        this.fuelTypeGroups = [
          {
            label: 'Standard',
            options: (data.standard || []).map((x: any) => ({
              label: x.label,
              value: x.id,
              count: x.count ?? x.total_cars
            }))
          },
          {
            label: 'Hybrid',
            options: (data.hybrid || []).map((x: any) => ({
              label: x.label,
              value: x.id,
              count: x.count ?? x.total_cars
            }))
          },
          {
            label: 'Gas',
            options: (data.gas || []).map((x: any) => ({
              label: x.label,
              value: x.id,
              count: x.count ?? x.total_cars
            }))
          },
          {
            label: 'Other',
            options: (data.other || []).map((x: any) => ({
              label: x.label,
              value: x.id,
              count: x.count ?? x.total_cars
            }))
          }
        ];
      },
      error: (error) => {
        console.error('Error fetching fuel types:', error);
      }
    });
  }

  onFuelToggle(id: any, e: any) {
    if (e.target.checked) {
      if (!this.selectedFuelIds.includes(id)) {
        this.selectedFuelIds.push(id);
      }
    } else {
      this.selectedFuelIds = this.selectedFuelIds.filter((x: any) => x !== id);
    }
    this.getFuelTypes();
  }

  updateMatchingProgress() {
    this.matchingProgress = Math.floor(Math.random() * 86) + 10;
  }

  onPriceTypeChange() {
    this.getPriceRangeAnalytics();
  }

  onPriceRangeChange() {
    this.priceRangeChange$.next();
  }


  trackByImage(index: number, img: string) {
    return img;
  }

  ngOnDestroy(): void {
    this.kmRangeChange$.complete();
    this.priceRangeChange$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
