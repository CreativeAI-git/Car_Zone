import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonService } from '../../services/common.service';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { carData } from '../../helper/carData';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { LoaderService } from '../../services/loader.service';
import { ChfFormatPipe } from '../../pipes/chf-format.pipe';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzImageModule } from 'ng-zorro-antd/image';

declare var Swiper: any;

@Component({
  selector: 'app-browse-cars',
  imports: [RouterLink, CommonModule, NzSelectModule, FormsModule, ChfFormatPipe, TranslateModule, NzPopoverModule, NzImageModule],
  templateUrl: './browse-cars.component.html',
  styleUrl: './browse-cars.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],

})
export class BrowseCarsComponent {
  private destroy$ = new Subject<void>();
  carsList: any[] = []
  fuelTypes = carData.fuelTypes
  transmissions = carData.transmissions
  conditions = carData.conditions
  loading: boolean = false
  brandList: any[] = []
  orgBrandList: any[] = []
  modalList: any[] = []
  orgModalList: any[] = []
  sittingCapacity = [1, 2, 3, 4, 5, 6, 7]
  sellerTypes = carData.sellerTypes
  visible: boolean = false
  YearVisible: boolean = false
  PriceVisible: boolean = false
  MilageVisible: boolean = false
  FuelVisible: boolean = false
  TransmissionVisible: boolean = false
  PowerVisible: boolean = false
  TypeOfCarVisible: boolean = false
  selectedBrand: string[] = []
  selectedModal: string[] = [];
  selectedSittingCapacity: any = null
  selectedSellerType: any = null
  selectedFuels: string[] = [];
  selectedTransmissions: string[] = [];
  priceRange: any = [0, 1000000];
  yearRange: any = [1900, 2025];
  milageRange: any = [0, 10000];
  powerRange: any = [0, 1000];
  token: any;
  years: number[] = [];
  selectedBrandsModal: any[] = [];
  searchModalValue: string = '';
  searchBrandValue: string = '';
  @ViewChild('modalScrollDiv') modalScrollDiv!: ElementRef<HTMLDivElement>;
  YearFilterApplied: boolean = false
  PriceFilterApplied: boolean = false
  MilageFilterApplied: boolean = false
  FuelFilterApplied: boolean = false
  TransmissionFilterApplied: boolean = false
  PowerFilterApplied: boolean = false
  constructor(private service: CommonService, private loader: LoaderService, private authService: AuthService, private modalService: ModalService, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
  }

  ngOnInit(): void {
    this.token = this.authService.getToken();
    this.getCars()
    this.getBrands()
    const currentYear = new Date().getFullYear();
    for (let i = 0; i <= 30; i++) {
      this.years.push(currentYear - i);
    }
  }

  // Disable all years before the selected start year
  isYearDisabled(year: number): boolean {
    if (!this.yearRange[0]) return false;
    return year < this.yearRange[0];
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


  // addToWishlist(item: any) {
  //   item.isWishlist = !item.isWishlist
  //   this.service.post('user/addToWishlist', { carId: item.id }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
  //   })
  // }

  addToWishlist(item: any) {
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

  getBrands() {
    this.service.get('user/brand').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.brandList = res.data
      this.orgBrandList = [...this.brandList]
    })
  }

  // getModalList(brand: any) {
  //   const brandId = this.brandList.find((item: any) => item.make_display.toLowerCase() == brand.toLowerCase())?.make_id
  //   this.service.get('user/getModel/' + brandId).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
  //     this.modalList = res.data
  //   })
  // }

  selectBrand(brand: string) {
    const selectedBrand = this.brandList.find((item: any) => item.make_display.toLowerCase() == brand.toLowerCase()).make_display
    if (this.selectedBrand.includes(selectedBrand)) {
      this.selectedBrand = this.selectedBrand.filter(b => b !== selectedBrand);
    } else {
      this.selectedBrand.push(selectedBrand);
    }
    this.getModalList(selectedBrand)
  }

  getModalList(selectedBrand: string) {
    this.service.get('user/getModel/' + selectedBrand).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.modalList = res.data
      this.orgModalList = [...this.modalList]
    })
  }


  onFuelChange(event: any) {
    if (event.target.checked) {
      this.selectedFuels.push(event.target.value);
    } else {
      this.selectedFuels = this.selectedFuels.filter(f => f !== event.target.value);
    }
  }

  onTransmissionChange(event: any) {
    if (event.target.checked) {
      this.selectedTransmissions.push(event.target.value);
    } else {
      this.selectedTransmissions = this.selectedTransmissions.filter(f => f !== event.target.value);
    }
  }

  FilterYearRange() {
    this.yearRange = [this.yearRange[0], this.yearRange[1]]
    this.YearFilterApplied = true
    this.YearVisible = false
    this.onFilterApply()
  }

  removeYearFilter() {
    this.yearRange = [1900, 2025]
    this.YearFilterApplied = false
    this.onFilterApply()
  }

  FilterPriceRange() {
    this.PriceFilterApplied = true
    this.PriceVisible = false
    this.onFilterApply()
  }

  removePriceFilter() {
    this.priceRange = [0, 1000000]
    this.PriceFilterApplied = false
    this.onFilterApply()
  }

  FilterMilageRange() {
    this.MilageFilterApplied = true
    this.MilageVisible = false
    this.onFilterApply()
  }

  removeMilageFilter() {
    this.milageRange = [0, 10000]
    this.MilageFilterApplied = false
    this.onFilterApply()
  }

  FilterFuelRange() {
    this.FuelFilterApplied = true
    this.FuelVisible = false
    this.onFilterApply()
  }

  removeFuelFilter() {
    this.selectedFuels = []
    this.FuelFilterApplied = false
    this.onFilterApply()
  }

  FilterTransmissionRange() {
    this.TransmissionFilterApplied = true
    this.TransmissionVisible = false
    this.onFilterApply()
  }

  removeTransmissionFilter() {
    this.selectedTransmissions = []
    this.TransmissionFilterApplied = false
    this.onFilterApply()
  }

  FilterPowerRange() {
    this.PowerFilterApplied = true
    this.PowerVisible = false
    this.onFilterApply()
  }

  removePowerFilter() {
    this.powerRange = [0, 1000]
    this.PowerFilterApplied = false
    this.onFilterApply()
  }

  filterBrandModel() {
    this.visible = false
    this.onFilterApply()
  }

  onFilterApply() {
    const paramsObj: any = {
      ...(this.selectedBrand && this.selectedBrand.length > 0 && { brandName: this.selectedBrand.join(',') }),
      ...(this.selectedModal && this.selectedModal.length > 0 && { carModel: this.selectedModal.join(',') }),
      ...(this.selectedFuels && this.selectedFuels.length > 0 && { fuelType: this.selectedFuels.join(',') }),
      ...(this.selectedTransmissions && this.selectedTransmissions.length > 0 && { transmission: this.selectedTransmissions.join(',') }),
      ...(this.priceRange && Array.isArray(this.priceRange) && this.priceRange.length === 2 && this.priceRange.every((v: any) => v !== undefined && v !== null) && { priceRange: this.priceRange.join(',') }),
      ...(this.yearRange && Array.isArray(this.yearRange) && typeof this.yearRange[0] === 'number' && { min_year: this.yearRange[0] }),
      ...(this.yearRange && Array.isArray(this.yearRange) && typeof this.yearRange[1] === 'number' && { max_year: this.yearRange[1] }),
      ...(this.milageRange && Array.isArray(this.milageRange) && typeof this.milageRange[0] === 'number' && { min_mileage: this.milageRange[0] }),
      ...(this.milageRange && Array.isArray(this.milageRange) && typeof this.milageRange[1] === 'number' && { max_mileage: this.milageRange[1] }),
      ...(this.powerRange && Array.isArray(this.powerRange) && typeof this.powerRange[0] === 'number' && { min_hp: this.powerRange[0] }),
      ...(this.powerRange && Array.isArray(this.powerRange) && typeof this.powerRange[1] === 'number' && { max_hp: this.powerRange[1] }),
    };
    const params = paramsObj;

    this.service.get(this.token ? 'user/fetchOtherSellerCarsList' : 'user/asGuestUserFetchSellerCarsList', params).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.carsList = res.data
    })
  }

  onFilterClear() {
    this.selectedBrand = []
    this.selectedModal = []
    this.selectedFuels = []
    this.selectedTransmissions = []
    this.selectedBrandsModal = []
    this.priceRange = [0, 1000000]
    this.yearRange = [1900, 2025]
    this.milageRange = [0, 10000]
    this.powerRange = [0, 1000]
    this.MilageFilterApplied = false
    this.PriceFilterApplied = false
    this.YearFilterApplied = false
    this.FuelFilterApplied = false
    this.TransmissionFilterApplied = false
    this.PowerFilterApplied = false
    this.MilageVisible = false
    this.PriceVisible = false
    this.YearVisible = false
    this.FuelVisible = false
    this.TransmissionVisible = false
    this.PowerVisible = false
    this.visible = false
    this.onFilterApply()
  }

  filterByBrand(brand: string) {
    if (this.selectedBrand.includes(brand)) {
      this.selectedBrand = this.selectedBrand.filter(b => b !== brand);
    } else {
      this.selectedBrand.push(brand);
    }
    this.onFilterApply()
  }

  private searchTimeout: any;

  search(event: any) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.service.get(this.token ? 'user/fetchOtherSellerCarsList' : 'user/asGuestUserFetchSellerCarsList', { search: event.target.value.trim() })
        .pipe(takeUntil(this.destroy$))
        .subscribe((res: any) => {
          this.carsList = res.data;
        });
    }, 400);
  }

  searchModal(event: any) {
    this.searchModalValue = event.target.value.trim()
    if (this.searchModalValue.length > 0) {
      this.modalList = this.orgModalList.filter((item: any) => item.modelName.toLowerCase().includes(this.searchModalValue.toLowerCase()))
    } else {
      this.modalList = [...this.orgModalList]
    }
  }

  searchBrand(event: any) {
    const searchValue = event.target.value.trim()
    if (searchValue.length > 0) {
      this.brandList = this.orgBrandList.filter((item: any) => item.make_display.toLowerCase().includes(searchValue.toLowerCase()))
    } else {
      this.brandList = [...this.orgBrandList]
    }
  }

  selectModal(event: any, brand: string) {
    const selectedModal = this.modalList.find((item: any) => item.modelName.toLowerCase() == event.target.value.toLowerCase()).modelName
    const brandIndex = this.selectedBrandsModal.findIndex((item: any) => item.brand === brand);

    if (this.selectedModal.includes(selectedModal)) {
      this.selectedModal = this.selectedModal.filter(m => m !== selectedModal);

      if (brandIndex !== -1) {
        this.selectedBrandsModal[brandIndex].modals = this.selectedBrandsModal[brandIndex].modals.filter((m: any) => m !== selectedModal);
        if (this.selectedBrandsModal[brandIndex].modals.length === 0) {
          this.selectedBrandsModal.splice(brandIndex, 1);
        }
      }
    } else {
      this.selectedModal.push(selectedModal);

      if (brandIndex !== -1) {
        this.selectedBrandsModal[brandIndex].modals = [...this.selectedBrandsModal[brandIndex].modals, selectedModal];
      } else {
        this.selectedBrandsModal.push({ brand: brand, modals: [selectedModal] });
      }
    }
  }

  removeBrandModal(item: any) {
    this.selectedBrandsModal = this.selectedBrandsModal.filter(b => b.brand !== item.brand);
    this.selectedModal = this.selectedModal.filter(m => !item.modals.includes(m));
    this.selectedBrand = this.selectedBrand.filter(b => b !== item.brand);
    this.onFilterApply()
  }

  backToBrand() {
    this.modalList = [];
    this.orgModalList = [];
    this.brandList = [...this.orgBrandList]
  }

  trackByImage(index: number, img: string) {
    return img;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
