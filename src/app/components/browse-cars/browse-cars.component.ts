import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ChfFormatPipe } from '../../pipes/chf-format.pipe';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FormsModule } from '@angular/forms';
import { CommonService } from '../../services/common.service';
import { LoaderService } from '../../services/loader.service';
import { FilterGroup, FilterOption, FilterPayload, FilterService } from '../../services/filter.service';

declare var Swiper: any;

@Component({
  selector: 'app-browse-cars',
  imports: [
    RouterLink,
    CommonModule,
    ChfFormatPipe,
    TranslateModule,
    NzPopoverModule,
    NzImageModule,
    NzSliderModule,
    NzSelectModule,
    FormsModule
  ],
  templateUrl: './browse-cars.component.html',
  styleUrl: './browse-cars.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class BrowseCarsComponent {
  private destroy$ = new Subject<void>();
  private priceRangeChange$ = new Subject<void>();
  private kmRangeChange$ = new Subject<void>();

  carsList: any[] = [];
  visible = false;
  bodyTypeVisible = false;
  YearVisible = false;
  PriceVisible = false;
  MilageVisible = false;
  FuelVisible = false;
  TransmissionVisible = false;
  PowerVisible = false;
  token: any;
  selectedBrandsModal: any[] = [];
  recentlyViewedlist: any[] = [];
  bodyTypes: FilterOption[] = [];
  priceRangeAnalytics: any = { matching_vehicles: 0 };
  yearRangeAnalytics: any = {
    total_cars_all_years: 0,
    selected_range: { total_cars: 0 },
    breakdown: {
      older_models: { count: 0 },
      newer_models: { count: 0 }
    }
  };
  kmRangeAnalytics: any = {
    total_cars_all_mileage: 0,
    selected_range: { total_cars: 0 },
    breakdown: {
      higher_mileage: { count: 0 },
      lower_mileage: { count: 0 }
    }
  };
  matchingProgress = 0;
  priceRange: [number, number] = [0, 1000000];
  leasePriceRange: [number, number] = [0, 100000];
  yearRange: [number, number] = [1990, new Date().getFullYear()];
  years: number[] = [];
  kmRange: [number, number] = [0, 4000000];
  priceType: 'Purchase' | 'Lease' = 'Purchase';
  transmissions: FilterOption[] = [];
  transmissionId: number[] = [];
  fuelTypeGroups: FilterGroup[] = [];
  fuelTypeId: number[] = [];
  bodyTypeId: number[] = [];
  totalCars = 0;
  loaded = false;
  isLoading = false;

  constructor(
    private service: CommonService,
    private loader: LoaderService,
    private authService: AuthService,
    private modalService: ModalService,
    private translate: TranslateService,
    private filterService: FilterService
  ) {
    this.translate.use(localStorage.getItem('lang') || 'en');
  }

  ngOnInit(): void {
    this.token = this.authService.getToken();

    if (this.authService.isLogedIn()) {
      this.getRecentlyViewedlist();
    }

    const currentYear = new Date().getFullYear();
    this.yearRange = [currentYear - 35, currentYear];

    for (let year = currentYear; year >= 1990; year--) {
      this.years.push(year);
    }

    this.filterService.appliedFilters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((payload) => this.syncStateFromPayload(payload));

    this.filterService.viewModel$
      .pipe(takeUntil(this.destroy$))
      .subscribe((viewModel) => this.applyViewModel(viewModel));

    this.filterService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.isLoading = loading;
        if (loading) {
          this.loader.show();
          return;
        }
        this.loader.hide();
      });

    this.priceRangeChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        const activePriceRange = this.priceType === 'Lease' ? this.leasePriceRange : this.priceRange;
        this.applyFilters({
          price_type: this.priceType,
          price_range: {
            min_price: activePriceRange[0],
            max_price: activePriceRange[1]
          }
        });
      });

    this.kmRangeChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() =>
        this.applyFilters({
          kilometers_range: {
            min_km: this.kmRange[0],
            max_km: this.kmRange[1]
          }
        })
      );

    if (this.filterService.hasActiveAppliedFilters()) {
      this.loaded = true;
      this.filterService.ensureAppliedLoaded().pipe(takeUntil(this.destroy$)).subscribe({
        error: () => {
          this.loaded = true;
        }
      });
      return;
    }

    this.getCars();
    this.filterService.loadAppliedMetadata().pipe(takeUntil(this.destroy$)).subscribe({
      error: () => {
        this.loaded = true;
      }
    });
  }

  get bodyTypeButtonLabel(): string {
    return this.getSelectedLabels(this.bodyTypeId, this.bodyTypes);
  }

  get priceButtonLabel(): string {
    const activePriceRange = this.priceType === 'Lease' ? this.leasePriceRange : this.priceRange;
    if (!this.hasRangeChanged(activePriceRange, [0, 100000])) {
      return '';
    }

    return `${activePriceRange[0]} - ${activePriceRange[1]}`;
  }

  get yearButtonLabel(): string {
    const currentYear = new Date().getFullYear();
    if (!this.hasRangeChanged(this.yearRange, [currentYear - 35, currentYear])) {
      return '';
    }

    return `${this.yearRange[0]} - ${this.yearRange[1]}`;
  }

  get kmButtonLabel(): string {
    if (!this.hasRangeChanged(this.kmRange, [0, 4000000])) {
      return '';
    }

    return `${this.kmRange[0]} - ${this.kmRange[1]} km`;
  }

  get transmissionButtonLabel(): string {
    return this.getSelectedLabels(this.transmissionId, this.transmissions);
  }

  get fuelButtonLabel(): string {
    return this.getSelectedLabels(this.fuelTypeId, this.flattenGroupedOptions(this.fuelTypeGroups));
  }

  getRecentlyViewedlist() {
    this.service.get('user/getRecentlyViewedlist').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.recentlyViewedlist = res.data;
    });
  }

  getCars() {
    this.loader.show();
    this.service
      .get(this.token ? 'user/fetchOtherSellerCarsList' : 'user/asGuestUserFetchSellerCarsList')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.carsList = res?.data || [];
          this.loaded = true;

          if (this.carsList.length > 0) {
            setTimeout(() => this.loadSwiper());
          }

          this.loader.hide();
        },
        error: () => {
          this.loaded = true;
          this.loader.hide();
        }
      });
  }

  addToWishlist(item: any) {
    if (!this.authService.isLogedIn()) {
      this.modalService.openLoginModal();
      return;
    }

    item.isWishlist = !item.isWishlist;

    this.service
      .post('user/addToWishlist', { carId: item.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => {
          console.error('Wishlist API failed:', err);
          item.isWishlist = !item.isWishlist;
          this.modalService.openLoginModal();
        }
      });
  }

  removeFromWishlist(item: any) {
    item.isWishlist = !item.isWishlist;
    this.service
      .delete('user/removeCarFromWishlist', { carId: item.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  onBodyTypeToggle(id: number, event: Event) {
    const input = event.target as HTMLInputElement;
    this.bodyTypeId = this.toggleSelection(this.bodyTypeId, id, input.checked);
    this.applyFilters({
      body_type_id: [...this.bodyTypeId]
    });
  }

  onPriceTypeChange() {
    this.onPriceRangeChange();
  }

  onPriceRangeChange() {
    this.priceRangeChange$.next();
  }

  onYearRangeChange() {
    this.applyFilters({
      year_range: {
        min_year: this.yearRange[0],
        max_year: this.yearRange[1]
      }
    });
  }

  onKmRangeChange() {
    this.kmRangeChange$.next();
  }

  onTransmissionToggle(id: number, event: Event) {
    const input = event.target as HTMLInputElement;
    this.transmissionId = this.toggleSelection(this.transmissionId, id, input.checked);
    this.applyFilters({
      transmission: [...this.transmissionId]
    });
  }

  onFuelToggle(id: number, event: Event) {
    const input = event.target as HTMLInputElement;
    this.fuelTypeId = this.toggleSelection(this.fuelTypeId, id, input.checked);
    this.applyFilters({
      fuel_type_id: [...this.fuelTypeId]
    });
  }

  trackByImage(_index: number, img: string) {
    return img;
  }

  trackByFilterValue(_index: number, item: FilterOption) {
    return item.value;
  }

  ngOnDestroy(): void {
    this.kmRangeChange$.complete();
    this.priceRangeChange$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyViewModel(viewModel: any) {
    if (this.filterService.hasActiveAppliedFilters()) {
      this.carsList = viewModel.cars || [];
    }
    this.bodyTypes = viewModel.bodyTypes || [];
    this.priceRangeAnalytics = viewModel.priceRangeAnalytics || this.priceRangeAnalytics;
    this.yearRangeAnalytics = viewModel.yearRangeAnalytics || this.yearRangeAnalytics;
    this.kmRangeAnalytics = viewModel.kilometersRangeAnalytics || this.kmRangeAnalytics;
    this.transmissions = viewModel.transmissions || [];
    this.fuelTypeGroups = viewModel.fuelTypeGroups || [];
    this.totalCars = viewModel.totalCars || 0;
    this.updateMatchingProgress();

    if (this.filterService.hasActiveAppliedFilters() && this.carsList.length > 0) {
      setTimeout(() => this.loadSwiper());
    }
  }

  private syncStateFromPayload(payload: FilterPayload) {
    const currentYear = new Date().getFullYear();
    this.priceType = payload.price_type ?? 'Purchase';
    this.priceRange = [
      payload.price_range?.min_price ?? 0,
      payload.price_range?.max_price ?? 100000
    ];
    this.leasePriceRange = [...this.priceRange] as [number, number];
    this.yearRange = [
      payload.year_range?.min_year ?? currentYear - 35,
      payload.year_range?.max_year ?? currentYear
    ];
    this.kmRange = [
      payload.kilometers_range?.min_km ?? 0,
      payload.kilometers_range?.max_km ?? 4000000
    ];
    this.transmissionId = [...(payload.transmission || [])];
    this.fuelTypeId = [...(payload.fuel_type_id || [])];
    this.bodyTypeId = [...(payload.body_type_id || [])];
  }

  private applyFilters(patch: Partial<FilterPayload>) {
    this.filterService.patchAppliedAndDraft({
      lang: localStorage.getItem('lang') || this.translate.currentLang || 'en',
      ...patch
    });

    this.filterService.ensureAppliedLoaded().pipe(takeUntil(this.destroy$)).subscribe({
      error: (error) => {
        console.error('Error applying filters:', error);
      }
    });
  }

  private loadSwiper(): void {
    this.carsList.forEach((_: any, i: number) => {
      const thumbs = new Swiper(`.mySwiperThumbs-${i}`, {
        slidesPerView: 6,
        spaceBetween: 10,
        watchSlidesProgress: true
      });

      new Swiper(`.mySwiperMain-${i}`, {
        slidesPerView: 1,
        spaceBetween: 10,
        pagination: {
          el: '.swiper-pagination',
          type: 'fraction'
        },
        thumbs: {
          swiper: thumbs
        }
      });
    });
  }

  private updateMatchingProgress() {
    const matchingVehicles = Number(this.priceRangeAnalytics?.matching_vehicles || 0);
    const base = Math.max(this.totalCars, matchingVehicles, 1);
    this.matchingProgress = Math.max(10, Math.min(100, Math.round((matchingVehicles / base) * 100)));
  }

  private getSelectedLabels(selectedValues: any[], options: FilterOption[]): string {
    if (!selectedValues.length) {
      return '';
    }

    const labels = options
      .filter((option) => selectedValues.includes(option.value))
      .map((option) => option.label)
      .filter(Boolean);

    return labels.join(', ');
  }

  private flattenGroupedOptions(groups: FilterGroup[]): FilterOption[] {
    return groups.flatMap((group) => group.options || []);
  }

  private hasRangeChanged(current: [number, number], initial: [number, number]): boolean {
    return current[0] !== initial[0] || current[1] !== initial[1];
  }

  private toggleSelection<T>(list: T[], value: T, checked: boolean): T[] {
    if (checked) {
      return list.includes(value) ? list : [...list, value];
    }

    return list.filter((item) => item !== value);
  }
}
