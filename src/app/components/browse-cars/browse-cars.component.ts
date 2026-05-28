import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
import {
  FilterGroup,
  FilterOption,
  FilterPayload,
  FilterService,
  MakeModelOption,
  SelectedMakeModel
} from '../../services/filter.service';

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
  makeModelSearchTerm = '';
  selectedBrandsModal: any[] = [];
  selectedMakeModels: SelectedMakeModel[] = [];
  makeOptions: MakeModelOption[] = [];
  modelOptionsByMake: Record<string, MakeModelOption[]> = {};
  activeMakeForModels: MakeModelOption | null = null;
  loadingMakes = false;
  loadingModelsByMake: Record<string, boolean> = {};
  expandedMakeIds: Array<string | number> = [];
  popularMakeCards = [
    { label: 'BMW', icon: 'img/icons/bmw.png', aliases: ['bmw'] },
    { label: 'Ferrari', icon: 'img/sorting-icon/icon-2.png', aliases: ['ferrari'] },
    { label: 'Lamborghini', icon: 'img/icons/lamborghini.png', aliases: ['lamborghini', 'laborghini'] },
    { label: 'Tesla', icon: 'img/icons/Tesla.png', aliases: ['tesla'] },
    { label: 'Audi', icon: 'img/icons/audi.png', aliases: ['audi'] },
    { label: 'Mercedes', icon: 'img/icons/mercedes.png', aliases: ['mercedes', 'mercedes benz', 'mercedes-benz'] },
    { label: 'Ford', icon: 'img/sorting-icon/icon8.png', aliases: ['ford'] }
  ];
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
  powerOutputRange: [number | null, number | null] = [null, null];
  powerUnit: 'PS' | 'KW' = 'PS';
  psOptions: number[] = [];
  kwOptions: number[] = [];
  priceType: 'Purchase' | 'Lease' = 'Purchase';
  transmissions: FilterOption[] = [];
  transmissionId: number[] = [];
  fuelTypeGroups: FilterGroup[] = [];
  fuelTypeId: number[] = [];
  bodyTypeId: number[] = [];
  totalCars = 0;
  totalItems = 0;
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  loaded = false;
  isLoading = false;
  appliedFilters: FilterPayload;

  constructor(
    private service: CommonService,
    private loader: LoaderService,
    private authService: AuthService,
    private modalService: ModalService,
    private translate: TranslateService,
    public filterService: FilterService,
    private router: Router
  ) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.appliedFilters = this.filterService.getDefaultPayload();
  }

  ngOnInit(): void {
    this.token = this.authService.getToken();
    this.loadMakeOptions();

    if (this.authService.isLogedIn()) {
      this.getRecentlyViewedlist();
    }

    const currentYear = new Date().getFullYear();
    this.yearRange = [currentYear - 35, currentYear];

    for (let year = currentYear; year >= 1990; year--) {
      this.years.push(year);
    }

    this.psOptions = Array.from({ length: 150 }, (_, index) => (index + 1) * 10);
    this.kwOptions = Array.from(
      new Set(this.psOptions.map((value) => Math.max(1, Math.round(value * 0.7355))))
    ).sort((left, right) => left - right);

    this.filterService.appliedFilters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((payload) => {
        this.appliedFilters = payload;
        this.syncStateFromPayload(payload);
      });

    this.filterService.viewModel$
      .pipe(takeUntil(this.destroy$))
      .subscribe((viewModel) => this.applyViewModel(viewModel));

    this.filterService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        // this.isLoading = loading;
        if (loading) {
          // this.loader.show();
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
    if (!this.hasRangeChanged(activePriceRange, [0, 1000000])) {
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

  get powerButtonLabel(): string {
    const [from, to] = this.powerOutputRange;
    if (from === null && to === null) {
      return '';
    }

    if (from !== null && to !== null) {
      return `${from} ${this.powerUnit} - ${to} ${this.powerUnit}`;
    }

    if (from !== null) {
      return `${from} ${this.powerUnit}`;
    }

    return `${to} ${this.powerUnit}`;
  }

  get extraFiltersCount(): number {
    const payload = this.appliedFilters;
    const defaults = this.filterService.getDefaultPayload();

    let count = 0;
    count += payload.seller_type.length;
    count += payload.state_id.length;
    count += payload.drive_type.length;
    count += payload.accident_vehicle.length;
    count += payload.mfk_warranty.length;
    count += payload.exterior_color.length;
    count += payload.interior_color.length;
    count += payload.energy_efficiency.length;
    count += payload.vehicle_condition.length;
    count += payload.listing_age.length;

    if (this.hasRangeObjectChanged(payload.seat_range, defaults.seat_range)) {
      count += 1;
    }

    if (this.hasRangeObjectChanged(payload.door_range, defaults.door_range)) {
      count += 1;
    }

    if (this.hasNumericRangeChanged(payload.engine_power, defaults.engine_power)) {
      count += 1;
    }

    if (this.hasNumericRangeChanged(payload.cubic_capacity, defaults.cubic_capacity)) {
      count += 1;
    }

    if (this.hasNumericRangeChanged(payload.cylinders, defaults.cylinders)) {
      count += 1;
    }

    if (this.hasNumericRangeChanged(payload.battery_capacity, defaults.battery_capacity)) {
      count += 1;
    }

    if (this.hasNumericRangeChanged(payload.towing_capacity, defaults.towing_capacity)) {
      count += 1;
    }

    if (this.hasNumericRangeChanged(payload.total_weight, defaults.total_weight)) {
      count += 1;
    }

    if (this.hasNumericRangeChanged(payload.empty_weight, defaults.empty_weight)) {
      count += 1;
    }

    return count;
  }

  get paginationItems(): Array<number | string> {
    if (this.totalPages <= 1) {
      return [];
    }

    if (this.totalPages <= 7) {
      return Array.from({ length: this.totalPages }, (_, index) => index + 1);
    }

    const items: Array<number | string> = [1];
    const start = Math.max(2, this.currentPage - 1);
    const end = Math.min(this.totalPages - 1, this.currentPage + 1);

    if (start > 2) {
      items.push('...');
    }

    for (let page = start; page <= end; page++) {
      items.push(page);
    }

    if (end < this.totalPages - 1) {
      items.push('...');
    }

    items.push(this.totalPages);
    return items;
  }

  getRecentlyViewedlist() {
    this.service.get('user/getRecentlyViewedlist').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.recentlyViewedlist = res.data;
    });
  }

  get startItem(): number {
    if (!this.totalItems || !this.carsList.length) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    if (!this.totalItems || !this.carsList.length) {
      return 0;
    }

    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  getCars(page = this.currentPage) {
    this.loader.show();
    const endpoint = this.token ? 'user/fetchOtherSellerCarsList' : 'user/asGuestUserFetchSellerCarsList';

    this.service
      .get(`${endpoint}?page=${page}&limit=${this.pageSize}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.carsList = res?.data || [];
          this.currentPage = Number(res?.page ?? page ?? 1);
          this.pageSize = Number(res?.limit ?? this.pageSize ?? 10);
          this.totalItems = Number(res?.total ?? this.carsList.length ?? 0);
          this.totalPages = Math.max(1, Number(res?.totalPages ?? Math.ceil(this.totalItems / this.pageSize) ?? 1));
          this.totalCars = this.totalItems;
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

  goToCarDetail(carId: string | number) {
    this.router.navigate(['/car-detail'], { queryParams: { id: carId } });
  }

  handleWishlistIconClick(event: Event, item: any) {
    event.stopPropagation();

    if (item.isWishlist) {
      this.removeFromWishlist(item);
      return;
    }

    this.addToWishlist(item);
  }

  handleCarDetailKeydown(event: KeyboardEvent, carId: string | number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.goToCarDetail(carId);
    }
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

  onPowerRangeChange() {
    this.applyFilters({
      engine_power: {
        min_value: this.powerOutputRange[0],
        max_value: this.powerOutputRange[1]
      },
      power_unit: this.powerUnit
    });
  }

  onPowerUnitChange(unit: 'PS' | 'KW') {
    if (this.powerUnit === unit) {
      return;
    }

    this.powerUnit = unit;
    this.powerOutputRange = [null, null];
    this.onPowerRangeChange();
  }

  closePopup(popup: 'make' | 'body' | 'price' | 'year' | 'km' | 'transmission' | 'power' | 'fuel') {
    switch (popup) {
      case 'make':
        this.visible = false;
        break;
      case 'body':
        this.bodyTypeVisible = false;
        break;
      case 'price':
        this.PriceVisible = false;
        break;
      case 'year':
        this.YearVisible = false;
        break;
      case 'km':
        this.MilageVisible = false;
        break;
      case 'transmission':
        this.TransmissionVisible = false;
        break;
      case 'power':
        this.PowerVisible = false;
        break;
      case 'fuel':
        this.FuelVisible = false;
        break;
    }
  }

  onResetBodyType() {
    this.bodyTypeId = [];
    this.applyFilters({ body_type_id: [] });
  }

  onResetPrice() {
    const defaults = this.filterService.getDefaultPayload();
    this.priceType = defaults.price_type;
    this.priceRange = [defaults.price_range.min_price ?? 0, defaults.price_range.max_price ?? 1000000];
    this.leasePriceRange = [defaults.price_range.min_price ?? 0, defaults.price_range.max_price ?? 100000];
    this.applyFilters({
      price_type: defaults.price_type,
      price_range: { ...defaults.price_range }
    });
  }

  onResetYear() {
    const defaults = this.filterService.getDefaultPayload();
    this.yearRange = [defaults.year_range.min_year ?? 1990, defaults.year_range.max_year ?? new Date().getFullYear()];
    this.applyFilters({
      year_range: { ...defaults.year_range }
    });
  }

  onResetKm() {
    const defaults = this.filterService.getDefaultPayload();
    this.kmRange = [defaults.kilometers_range.min_km ?? 0, defaults.kilometers_range.max_km ?? 4000000];
    this.applyFilters({
      kilometers_range: { ...defaults.kilometers_range }
    });
  }

  onResetTransmission() {
    this.transmissionId = [];
    this.applyFilters({ transmission: [] });
  }

  onResetFuel() {
    this.fuelTypeId = [];
    this.applyFilters({ fuel_type_id: [] });
  }

  onResetPower() {
    const defaults = this.filterService.getDefaultPayload();
    this.powerUnit = defaults.power_unit;
    this.powerOutputRange = [defaults.engine_power.min_value, defaults.engine_power.max_value];
    this.applyFilters({
      engine_power: { ...defaults.engine_power },
      power_unit: defaults.power_unit
    });
  }

  onResetFilters() {
    this.visible = false;
    this.bodyTypeVisible = false;
    this.YearVisible = false;
    this.PriceVisible = false;
    this.MilageVisible = false;
    this.FuelVisible = false;
    this.TransmissionVisible = false;
    this.PowerVisible = false;
    this.filterService.resetFilters();
    this.currentPage = 1;
    this.pageSize = 10;
    this.totalPages = 1;
    this.totalItems = 0;
    this.getCars(1);
    this.filterService.loadAppliedMetadata().pipe(takeUntil(this.destroy$)).subscribe({
      error: () => {
        this.loaded = true;
      }
    });
  }

  trackByImage(_index: number, img: string) {
    return img;
  }

  trackByFilterValue(_index: number, item: FilterOption) {
    return item.value;
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    if (this.filterService.hasActiveAppliedFilters()) {
      this.filterService.patchAppliedAndDraft({ page });
      this.refreshBrowseData();
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.getCars(page);
  }

  goToPreviousPage() {
    this.changePage(this.currentPage - 1);
  }

  goToNextPage() {
    this.changePage(this.currentPage + 1);
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
    this.totalItems = viewModel.totalItems || viewModel.totalCars || 0;
    this.currentPage = viewModel.currentPage || this.currentPage;
    this.pageSize = viewModel.pageSize || this.pageSize;
    this.totalPages = viewModel.totalPages || 1;
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
      payload.price_range?.max_price ?? 1000000
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
    this.powerUnit = payload.power_unit ?? 'PS';
    this.powerOutputRange = [
      payload.engine_power?.min_value ?? null,
      payload.engine_power?.max_value ?? null
    ];
    this.currentPage = payload.page ?? 1;
    this.pageSize = payload.limit ?? 10;
    this.transmissionId = [...(payload.transmission || [])];
    this.fuelTypeId = [...(payload.fuel_type_id || [])];
    this.bodyTypeId = [...(payload.body_type_id || [])];
    this.selectedMakeModels = this.cloneSelectedMakeModels(payload.make_model_selection || []);
    this.selectedBrandsModal = this.filterService.buildMakeModelSummary(this.selectedMakeModels);
    this.expandedMakeIds = this.selectedMakeModels.map((item) => item.makeId);
    this.selectedMakeModels.forEach((item) => this.ensureModelsLoaded(item.makeId, item.makeLabel));
  }

  private applyFilters(patch: Partial<FilterPayload>) {
    this.filterService.patchAppliedAndDraft({
      lang: localStorage.getItem('lang') || this.translate.currentLang || 'en',
      page: 1,
      ...patch
    });
    this.refreshBrowseData();
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

  private hasRangeObjectChanged(
    current: { [key: string]: number | null },
    initial: { [key: string]: number | null }
  ): boolean {
    return Object.keys(current).some((key) => current[key] !== initial[key]);
  }

  private hasNumericRangeChanged(
    current: { min_value: number | null; max_value: number | null },
    initial: { min_value: number | null; max_value: number | null }
  ): boolean {
    return current?.min_value !== initial?.min_value || current?.max_value !== initial?.max_value;
  }

  get activePowerOptions(): number[] {
    return this.powerUnit === 'KW' ? this.kwOptions : this.psOptions;
  }

  private refreshBrowseData() {
    if (this.filterService.hasActiveAppliedFilters()) {
      this.filterService.ensureAppliedLoaded().pipe(takeUntil(this.destroy$)).subscribe({
        error: (error) => {
          console.error('Error applying filters:', error);
        }
      });
      return;
    }

    this.getCars(this.currentPage);
    this.filterService.loadAppliedMetadata().pipe(takeUntil(this.destroy$)).subscribe({
      error: (error) => {
        console.error('Error loading filter metadata:', error);
      }
    });
  }

  private toggleSelection<T>(list: T[], value: T, checked: boolean): T[] {
    if (checked) {
      return list.includes(value) ? list : [...list, value];
    }

    return list.filter((item) => item !== value);
  }

  get filteredMakeOptions(): MakeModelOption[] {
    const term = this.normalizeSearchText(this.makeModelSearchTerm);
    if (!term) {
      return this.makeOptions;
    }

    return this.makeOptions.filter((item) => this.normalizeSearchText(item.label).includes(term));
  }

  getVisibleModels(makeId: string | number): MakeModelOption[] {
    const models = this.modelOptionsByMake[String(makeId)] || [];
    const term = this.normalizeSearchText(this.makeModelSearchTerm);
    if (!term) {
      return models;
    }

    return models.filter((item) => this.normalizeSearchText(item.label).includes(term));
  }

  get activeMakeModels(): MakeModelOption[] {
    return this.activeMakeForModels ? this.getVisibleModels(this.activeMakeForModels.value) : [];
  }

  onQuickMakeReset(): void {
    this.clearMakeModelFilter();
  }

  onQuickMakeFilter(card: { label: string; aliases?: string[] }): void {
    const make = this.findPopularMakeOption(card);
    const normalizedLabel = card.label?.trim();

    if (!normalizedLabel) {
      return;
    }

    const nextSelection: SelectedMakeModel[] = make
      ? [{ makeId: make.value, makeLabel: make.label, models: [] }]
      : [{ makeId: normalizedLabel, makeLabel: normalizedLabel, models: [] }];

    this.makeModelSearchTerm = '';
    this.selectedMakeModels = nextSelection;
    this.selectedBrandsModal = this.filterService.buildMakeModelSummary(nextSelection);
    this.expandedMakeIds = [];
    this.activeMakeForModels = null;
    this.applyFilters({ make_model_selection: nextSelection });
  }

  isQuickMakeActive(card: { label: string; aliases?: string[] }): boolean {
    const labels = [card.label, ...(card.aliases || [])].map((item) => this.normalizeSearchText(item));

    return this.selectedMakeModels.some((item) =>
      labels.includes(this.normalizeSearchText(item.makeLabel))
    );
  }

  isMakeSelected(makeId: string | number): boolean {
    return this.selectedMakeModels.some((item) => String(item.makeId) === String(makeId));
  }

  isMakeExpanded(makeId: string | number): boolean {
    return this.expandedMakeIds.some((item) => String(item) === String(makeId));
  }

  isModelSelected(makeId: string | number, modelId: string | number): boolean {
    return this.selectedMakeModels
      .find((item) => String(item.makeId) === String(makeId))
      ?.models.some((item) => String(item.modelId) === String(modelId)) ?? false;
  }

  toggleMakeSelection(make: MakeModelOption, event: Event): void {
    const input = event.target as HTMLInputElement;
    const exists = this.isMakeSelected(make.value);

    if (input.checked && !exists) {
      this.selectedMakeModels = [
        ...this.selectedMakeModels,
        { makeId: make.value, makeLabel: make.label, models: [] }
      ];
      this.openMakeModels(make);
    } else if (!input.checked && exists) {
      this.selectedMakeModels = this.selectedMakeModels.filter((item) => String(item.makeId) !== String(make.value));
      this.expandedMakeIds = this.expandedMakeIds.filter((item) => String(item) !== String(make.value));
      this.syncMakeModelSummary();
      this.applyFilters({ make_model_selection: this.getCommittedMakeModelSelection() });
      return;
    }

    this.syncMakeModelSummary();
  }

  openMakeModels(make: MakeModelOption): void {
    this.activeMakeForModels = make;
    this.makeModelSearchTerm = '';
    if (!this.isMakeExpanded(make.value)) {
      this.expandedMakeIds = [...this.expandedMakeIds, make.value];
    }

    this.ensureModelsLoaded(make.value, make.label);
  }

  backToMakeList(): void {
    this.activeMakeForModels = null;
  }

  closeMakeModels(makeId: string | number): void {
    this.expandedMakeIds = this.expandedMakeIds.filter((item) => String(item) !== String(makeId));
  }

  toggleModelSelection(make: MakeModelOption, model: MakeModelOption, event: Event): void {
    const input = event.target as HTMLInputElement;
    const nextSelection = this.cloneSelectedMakeModels(this.selectedMakeModels);
    let makeSelection = nextSelection.find((item) => String(item.makeId) === String(make.value));

    if (!makeSelection) {
      makeSelection = {
        makeId: make.value,
        makeLabel: make.label,
        models: []
      };
      nextSelection.push(makeSelection);
    }

    if (input.checked) {
      if (!makeSelection.models.some((item) => String(item.modelId) === String(model.value))) {
        makeSelection.models = [
          ...makeSelection.models,
          { modelId: model.value, modelLabel: model.label }
        ];
      }
    } else {
      makeSelection.models = makeSelection.models.filter((item) => String(item.modelId) !== String(model.value));
    }

    this.selectedMakeModels = nextSelection;
    this.syncMakeModelSummary();
    this.applyFilters({ make_model_selection: this.getCommittedMakeModelSelection() });
  }

  clearMakeModelFilter(): void {
    this.makeModelSearchTerm = '';
    this.selectedMakeModels = [];
    this.selectedBrandsModal = [];
    this.expandedMakeIds = [];
    this.activeMakeForModels = null;
    this.applyFilters({ make_model_selection: [] });
  }

  onPopularMakeSelect(card: { label: string; aliases?: string[] }): void {
    const make = this.findPopularMakeOption(card);
    if (!make) {
      return;
    }

    if (!this.isMakeSelected(make.value)) {
      this.selectedMakeModels = [
        ...this.selectedMakeModels,
        { makeId: make.value, makeLabel: make.label, models: [] }
      ];
      this.syncMakeModelSummary();
    }

    this.openMakeModels(make);
  }

  isPopularMakeActive(card: { label: string; aliases?: string[] }): boolean {
    const make = this.findPopularMakeOption(card);
    return !!make && this.isMakeSelected(make.value);
  }

  private loadMakeOptions(): void {
    this.loadingMakes = true;
    this.filterService.loadMakeOptions(this.carsList).pipe(takeUntil(this.destroy$)).subscribe({
      next: (options) => {
        this.makeOptions = options;
        this.loadingMakes = false;
      },
      error: () => {
        this.makeOptions = [];
        this.loadingMakes = false;
      }
    });
  }

  private ensureModelsLoaded(makeId: string | number, makeLabel: string): void {
    const cacheKey = String(makeId);
    if (this.modelOptionsByMake[cacheKey] || this.loadingModelsByMake[cacheKey]) {
      return;
    }

    this.loadingModelsByMake[cacheKey] = true;
    this.filterService.loadModelsByMake(makeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (options) => {
        this.modelOptionsByMake[cacheKey] = options;
        this.loadingModelsByMake[cacheKey] = false;
      },
      error: () => {
        this.modelOptionsByMake[cacheKey] = [];
        this.loadingModelsByMake[cacheKey] = false;
      }
    });
  }

  private syncMakeModelSummary(): void {
    this.selectedBrandsModal = this.filterService.buildMakeModelSummary(this.getCommittedMakeModelSelection());
  }

  private cloneSelectedMakeModels(selection: SelectedMakeModel[]): SelectedMakeModel[] {
    return JSON.parse(JSON.stringify(selection || []));
  }

  private getCommittedMakeModelSelection(): SelectedMakeModel[] {
    return this.cloneSelectedMakeModels(
      this.selectedMakeModels.filter((item) => (item.models || []).length > 0)
    );
  }

  private normalizeSearchText(value: string): string {
    return (value || '').trim().toLowerCase();
  }

  private findPopularMakeOption(card: { label: string; aliases?: string[] }): MakeModelOption | undefined {
    const labels = [card.label, ...(card.aliases || [])].map((item) => this.normalizeSearchText(item));
    return this.makeOptions.find((item) => labels.includes(this.normalizeSearchText(item.label)));
  }
}
