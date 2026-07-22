import { Component, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonService } from '../../services/common.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LoaderService } from '../../services/loader.service';
import { AuthService } from '../../services/auth.service';
import { ChfFormatPipe } from '../../pipes/chf-format.pipe';
import { ModalService } from '../../services/modal.service';
import { NzImage, NzImageService } from 'ng-zorro-antd/image';
import { FormsModule } from '@angular/forms';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
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
  selector: 'app-home',
  imports: [
    RouterLink,
    CommonModule,
    TranslateModule,
    ChfFormatPipe,
    FormsModule,
    NzPopoverModule,
    NzSliderModule,
    NzSelectModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  providers: [NzImageService],
})
export class HomeComponent {
  userData: any
  private destroy$ = new Subject<void>();
  private priceRangeChange$ = new Subject<void>();
  private kmRangeChange$ = new Subject<void>();
  private featuredCarsSwiper: any = null;
  private cardImageSwipers: any[] = [];
  carsList: any[] = []
  visible = false;
  bodyTypeVisible = false;
  YearVisible = false;
  PriceVisible = false;
  MilageVisible = false;
  FuelVisible = false;
  TransmissionVisible = false;
  PowerVisible = false;
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
  bodyTypes: FilterOption[] = [];
  homeBodyTypeCards = [
    { label: 'Convertible', icon: 'img/Convertible-2.png', aliases: ['convertible', 'cabriolet'] },
    { label: 'Sedan', icon: 'img/Sedan-1.png', aliases: ['sedan', 'saloon'] },
    { label: 'SUV / Off-road', icon: 'img/SUV-1.png', aliases: ['suv / off-road', 'suv/off-road', 'suv', 'off-road'] },
    { label: 'Coupe', icon: 'img/Coupé-1.png', aliases: ['coupe', 'coupé'] },
    { label: 'Pick-up', icon: 'img/Pickup-1.png', aliases: ['pick-up', 'pickup'] },
    { label: 'Van', icon: 'img/Van-1.png', aliases: ['van'] },
    { label: 'Compact car', icon: 'img/Compact car-1.png', aliases: ['compact car', 'city car', 'small car'] },
    { label: 'Wagon', icon: 'img/Wagon-1.png', aliases: ['wagon'] }
  ];
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
  appliedFilters: FilterPayload;
  token: any;
  constructor(
    private commonService: CommonService,
    private router: Router,
    private translate: TranslateService,
    private loader: LoaderService,
    public authService: AuthService,
    public modal: ModalService,
    private nzImageService: NzImageService,
    public filterService: FilterService
  ) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.appliedFilters = this.filterService.getDefaultPayload();
    effect(() => {
      this.userData = this.commonService.userData
    })
  }

  ngOnInit(): void {
    this.token = this.authService.getToken();
    this.getCars();
    this.loadMakeOptions();

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
      .subscribe((viewModel) => {
        this.bodyTypes = viewModel.bodyTypes || [];
        this.priceRangeAnalytics = viewModel.priceRangeAnalytics || this.priceRangeAnalytics;
        this.yearRangeAnalytics = viewModel.yearRangeAnalytics || this.yearRangeAnalytics;
        this.kmRangeAnalytics = viewModel.kilometersRangeAnalytics || this.kmRangeAnalytics;
        this.transmissions = viewModel.transmissions || [];
        this.fuelTypeGroups = viewModel.fuelTypeGroups || [];
        this.totalCars = viewModel.totalCars || 0;
        this.updateMatchingProgress();
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

    this.filterService.loadAppliedMetadata().pipe(takeUntil(this.destroy$)).subscribe({
      error: () => undefined
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

  listCar() {
    if (!this.authService.isLogedIn()) {
      this.modal.openLoginModal();
      return;
    }

    const profile = this.userData?.();
    if (!this.commonService.isApprovedCompany(profile)) {
      this.modal.openCompanyApprovalPendingModal();
      return;
    }

    if (profile?.slotAvailable) {
      this.router.navigate(['/list-your-car'])
    } else {
      this.router.navigate(['/choose-listing-plan'])
    }
    // this.router.navigate(['/list-your-car'])
  }

  openCreateAccount() {
    this.modal.openLoginModal();
  }

  searchCars() {
    this.filterService.applyDraft(true).pipe(takeUntil(this.destroy$)).subscribe({
      error: (error) => console.error('Error applying home filters:', error)
    });
  }

  loadSwipers(): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (this.featuredCarsSwiper?.destroy) {
      this.featuredCarsSwiper.destroy(true, true);
      this.featuredCarsSwiper = null;
    }

    if (document.querySelector('.CarSwiper')) {
      this.featuredCarsSwiper = new Swiper('.CarSwiper', {
        direction: 'horizontal',
        slidesPerView: 3,
        spaceBetween: 24,
        loop: true,
        grabCursor: true,
        mousewheel: false,
        breakpoints: {
          0: {
            slidesPerView: 1,
          },
          768: {
            slidesPerView: 2,
          },
          1200: {
            slidesPerView: 3,
          },
        },
      });
    }

  }

  isLoading = false;
  getCars() {
    this.loader.show()
    this.commonService.get(this.token ? 'user/fetchOtherSellerCarsList' : 'user/asGuestUserFetchSellerCarsList').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.carsList = res.data
      setTimeout(() => {
        this.loadSwipers()
        this.loadSwiper()
      }, 100);
      this.loader.hide()
    }, err => {
      this.loader.hide()
    })
  }

  addToWishlist(item: any) {
    item.isWishlist = !item.isWishlist;
    this.commonService.post('user/addToWishlist', { carId: item.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          // success response
        },
        error: (err) => {
          console.error('Wishlist API failed:', err);
          item.isWishlist = !item.isWishlist;
          this.modal.openLoginModal();
        }
      });
  }


  removeFromWishlist(item: any) {
    item.isWishlist = !item.isWishlist
    this.commonService.delete('user/removeCarFromWishlist', { carId: item.id }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
    })
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
    this.appliedFilters = this.filterService.getDefaultPayload();
    this.syncStateFromPayload(this.appliedFilters);
    this.filterService.loadAppliedMetadata().pipe(takeUntil(this.destroy$)).subscribe({
      error: () => undefined
    });
  }

  loadSwiper(): void {
    this.cardImageSwipers.forEach((swiper) => swiper?.destroy?.(true, true));
    this.cardImageSwipers = [];

    this.carsList.forEach((_, i) => {
      const swiper = new Swiper(`.mySwiperMain-${i}`, {
        slidesPerView: 1,
        spaceBetween: 0,
        loop: true,
        pagination: {
          el: `.home-card-pagination-${i}`,
          type: "fraction",
        },
        navigation: {
          nextEl: `.home-card-next-${i}`,
          prevEl: `.home-card-prev-${i}`,
        },
      });
      this.cardImageSwipers.push(swiper);
    });
  }

  previewImage(item: any) {
    if (!Array.isArray(item) || !item.length) {
      return;
    }

    let images: NzImage[] = [];
    item.forEach((_e: any) => {
      images.push({
        src: _e,
      })
    })
    this.nzImageService.preview(images);
  }

  onHomeBodyTypeSelect(card: { label: string; aliases?: string[] }) {
    const matchedBodyType = this.findHomeBodyTypeOption(card);

    if (!matchedBodyType) {
      return;
    }

    this.filterService.patchAppliedAndDraft({
      lang: localStorage.getItem('lang') || this.translate.currentLang || 'en',
      page: 1,
      body_type_id: [matchedBodyType.value]
    });

    this.filterService.ensureAppliedLoaded().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.router.navigate(['/browse-cars']);
      },
      error: (error) => console.error('Error applying home body type filter:', error)
    });
  }

  isHomeBodyTypeActive(card: { label: string; aliases?: string[] }): boolean {
    const matchedBodyType = this.findHomeBodyTypeOption(card);
    return !!matchedBodyType && this.bodyTypeId.includes(matchedBodyType.value);
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

    this.filterService.loadAppliedMetadata().pipe(takeUntil(this.destroy$)).subscribe({
      error: (error) => console.error('Error loading home filter metadata:', error)
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

  private toggleSelection<T>(list: T[], value: T, checked: boolean): T[] {
    if (checked) {
      return list.includes(value) ? list : [...list, value];
    }

    return list.filter((item) => item !== value);
  }

  private findHomeBodyTypeOption(card: { label: string; aliases?: string[] }): FilterOption | undefined {
    const candidateLabels = [card.label, ...(card.aliases || [])].map((value) => this.normalizeBodyTypeLabel(value));
    return this.bodyTypes.find((option) => candidateLabels.includes(this.normalizeBodyTypeLabel(option.label)));
  }

  private normalizeBodyTypeLabel(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .toLowerCase();
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

  ngOnDestroy(): void {
    this.featuredCarsSwiper?.destroy?.(true, true);
    this.cardImageSwipers.forEach((swiper) => swiper?.destroy?.(true, true));
    this.kmRangeChange$.complete();
    this.priceRangeChange$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
