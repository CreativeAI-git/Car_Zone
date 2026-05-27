import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzSelectModule } from 'ng-zorro-antd/select';
import {
  FilterGroup,
  FilterOption,
  FilterPayload,
  FilterService,
  MakeModelOption,
  SelectedMakeModel
} from '../../services/filter.service';

@Component({
  selector: 'app-all-filters',
  imports: [CommonModule, FormsModule, TranslateModule, NzSliderModule, NzSelectModule],
  templateUrl: './all-filters.component.html',
  styleUrl: './all-filters.component.css'
})
export class AllFiltersComponent {
  private destroy$ = new Subject<void>();
  private priceRangeChange$ = new Subject<void>();
  private kmRangeChange$ = new Subject<void>();
  private seatRangeChange$ = new Subject<void>();
  private doorRangeChange$ = new Subject<void>();

  makeModelSearchTerm = '';
  selectedMakeModels: SelectedMakeModel[] = [];
  selectedBrandsModal: Array<{ brand: string; modals: string[] }> = [];
  makeOptions: MakeModelOption[] = [];
  modelOptionsByMake: Record<string, MakeModelOption[]> = {};
  activeMakeForModels: MakeModelOption | null = null;
  loadingMakes = false;
  loadingModelsByMake: Record<string, boolean> = {};
  expandedMakeIds: Array<string | number> = [];
  popularMakeCards = [
    { label: 'BMW', icon: 'img/icons/bmw.png', aliases: ['bmw'] },
    { label: 'Ferrari', icon: 'img/icons/ferrari.png', aliases: ['ferrari'] },
    { label: 'Lamborghini', icon: 'img/icons/lamborghini.png', aliases: ['lamborghini', 'laborghini'] },
    { label: 'Tesla', icon: 'img/icons/Tesla.png', aliases: ['tesla'] },
    { label: 'Audi', icon: 'img/icons/audi.png', aliases: ['audi'] },
    { label: 'Mercedes', icon: 'img/icons/mercedes.png', aliases: ['mercedes', 'mercedes benz', 'mercedes-benz'] },
    { label: 'Ford', icon: 'img/icons/ford.png', aliases: ['ford'] }
  ];
  fuelTypeGroups: FilterGroup[] = [];
  transmissions: FilterOption[] = [];
  conditions: FilterOption[] = [];
  driveTypes: FilterOption[] = [];
  bodyTypes: FilterOption[] = [];
  carColors: FilterOption[] = [];
  carColorColumns: FilterOption[][] = [];
  interiorColors: FilterOption[] = [];
  interiorColorColumns: FilterOption[][] = [];
  carState: FilterOption[] = [];
  warrantyList: FilterOption[] = [];
  energyEfficiencyOptions: FilterOption[] = [];
  kilometersRangeAnalytics: any = {};
  priceRangeAnalytics: any = {};
  yearRangeAnalytics: any = {};
  priceRange: [number, number] = [0, 1000000];
  yearRange: [number, number] = [1990, new Date().getFullYear()];
  years: number[] = [];
  kmRange: [number, number] = [0, 4000000];
  priceType: 'Purchase' | 'Lease' = 'Purchase';
  leasePriceRange: [number, number] = [0, 100000];
  seatRange: [number, number] = [0, 25];
  doorRange: [number, number] = [0, 10];
  powerOutputRange: [number | null, number | null] = [null, null];
  cubicCapacityRange: [number | null, number | null] = [null, null];
  cylindersRange: [number | null, number | null] = [null, null];
  batteryCapacityRange: [number | null, number | null] = [null, null];
  towCapacityRange: [number | null, number | null] = [null, null];
  totalWeightRange: [number | null, number | null] = [null, null];
  emptyWeightRange: [number | null, number | null] = [null, null];
  psOptions: number[] = [];
  cubicCapacityOptions: number[] = [];
  cylinderOptions: number[] = [];
  batteryCapacityOptions: number[] = [];
  towCapacityOptions: number[] = [];
  weightOptions: number[] = [];
  seats: FilterOption[] = [];
  doors: FilterOption[] = [];
  sellerType: FilterOption[] = [];
  selectedSellerType: string[] = [];
  stateId: number[] = [];
  bodyTypeId: number[] = [];
  fuelTypeId: number[] = [];
  transmissionId: number[] = [];
  driveTypeId: number[] = [];
  interiorColorId: number[] = [];
  exteriorColorId: number[] = [];
  filterData: any = { total_cars: 0 };
  isLoading = false;

  constructor(private filterService: FilterService, private message: NzMessageService, private translate: TranslateService) { }

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.yearRange = [currentYear - 35, currentYear];

    for (let year = currentYear; year >= 1990; year--) {
      this.years.push(year);
    }

    this.psOptions = Array.from({ length: 150 }, (_, index) => (index + 1) * 10);
    this.cubicCapacityOptions = Array.from({ length: 99 }, (_, index) => (index + 2) * 100);
    this.cylinderOptions = Array.from({ length: 16 }, (_, index) => index + 1);
    this.batteryCapacityOptions = Array.from({ length: 59 }, (_, index) => 10 + (index * 5));
    this.towCapacityOptions = Array.from({ length: 50 }, (_, index) => (index + 1) * 100);
    this.weightOptions = Array.from({ length: 50 }, (_, index) => (index + 1) * 100);

    this.filterService.beginEditing();

    this.filterService.draftFilters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((payload) => this.syncStateFromPayload(payload));

    this.filterService.viewModel$
      .pipe(takeUntil(this.destroy$))
      .subscribe((viewModel) => this.applyViewModel(viewModel));

    this.filterService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => (this.isLoading = loading));

    this.loadMakeOptions();
    this.getFiltersData();

    this.priceRangeChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.getFiltersData());

    this.kmRangeChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.getFiltersData());

    this.seatRangeChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.getFiltersData());

    this.doorRangeChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.getFiltersData());
  }

  getFiltersData() {
    this.filterService.patchDraft(this.buildDraftPayload());
    this.filterService.previewDraft().pipe(takeUntil(this.destroy$)).subscribe({
      error: () => {
        this.message.error(this.translate.instant('filters.unableToLoadFiltersRightNow'));
      }
    });
  }

  onApplyFilters() {
    this.filterService.patchDraft(this.buildDraftPayload());
    this.filterService.applyDraft(true).pipe(takeUntil(this.destroy$)).subscribe({
      error: () => {
        this.message.error(this.translate.instant('filters.unableToApplyFiltersRightNow'));
      }
    });
  }

  onKmRangeChange() {
    this.kmRangeChange$.next();
  }

  onPriceTypeChange() {
    this.getFiltersData();
  }

  onPriceRangeChange() {
    this.priceRangeChange$.next();
  }

  onYearRangeChange() {
    this.getFiltersData();
  }

  onSeatRangeChange() {
    this.seatRangeChange$.next();
  }

  onDoorRangeChange() {
    this.doorRangeChange$.next();
  }

  get isPowerOutputRangeInvalid(): boolean {
    const [from, to] = this.powerOutputRange;
    return from !== null && to !== null && to < from;
  }

  get showPowerOutputFromError(): boolean {
    return this.isPowerOutputRangeInvalid;
  }

  get showPowerOutputToError(): boolean {
    return this.isPowerOutputRangeInvalid;
  }

  get isCubicCapacityRangeInvalid(): boolean {
    const [from, to] = this.cubicCapacityRange;
    return from !== null && to !== null && to < from;
  }

  get showCubicCapacityFromError(): boolean {
    return this.isCubicCapacityRangeInvalid;
  }

  get showCubicCapacityToError(): boolean {
    return this.isCubicCapacityRangeInvalid;
  }

  get isCylindersRangeInvalid(): boolean {
    const [from, to] = this.cylindersRange;
    return from !== null && to !== null && to < from;
  }

  get showCylindersFromError(): boolean {
    return this.isCylindersRangeInvalid;
  }

  get showCylindersToError(): boolean {
    return this.isCylindersRangeInvalid;
  }

  get isBatteryCapacityRangeInvalid(): boolean {
    const [from, to] = this.batteryCapacityRange;
    return from !== null && to !== null && to < from;
  }

  get showBatteryCapacityFromError(): boolean {
    return this.isBatteryCapacityRangeInvalid;
  }

  get showBatteryCapacityToError(): boolean {
    return this.isBatteryCapacityRangeInvalid;
  }

  get isTowCapacityRangeInvalid(): boolean {
    const [from, to] = this.towCapacityRange;
    return from !== null && to !== null && to < from;
  }

  get showTowCapacityFromError(): boolean {
    return this.isTowCapacityRangeInvalid;
  }

  get showTowCapacityToError(): boolean {
    return this.isTowCapacityRangeInvalid;
  }

  get isTotalWeightRangeInvalid(): boolean {
    const [from, to] = this.totalWeightRange;
    return from !== null && to !== null && to < from;
  }

  get showTotalWeightFromError(): boolean {
    return this.isTotalWeightRangeInvalid;
  }

  get showTotalWeightToError(): boolean {
    return this.isTotalWeightRangeInvalid;
  }

  get isEmptyWeightRangeInvalid(): boolean {
    const [from, to] = this.emptyWeightRange;
    return from !== null && to !== null && to < from;
  }

  get showEmptyWeightFromError(): boolean {
    return this.isEmptyWeightRangeInvalid;
  }

  get showEmptyWeightToError(): boolean {
    return this.isEmptyWeightRangeInvalid;
  }

  onResetFilters() {
    this.filterService.beginEditing();
    const defaults = this.filterService.getDefaultPayload();
    this.syncStateFromPayload(defaults);
    this.powerOutputRange = [null, null];
    this.cubicCapacityRange = [null, null];
    this.cylindersRange = [null, null];
    this.batteryCapacityRange = [null, null];
    this.towCapacityRange = [null, null];
    this.totalWeightRange = [null, null];
    this.emptyWeightRange = [null, null];
    this.filterService.patchDraft(defaults);
    this.getFiltersData();
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
      this.getFiltersData();
      return;
    }

    this.syncMakeModelSummary();
  }

  openMakeModels(make: MakeModelOption): void {
    this.activeMakeForModels = make;
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
    this.getFiltersData();
  }

  clearMakeModelFilter(): void {
    this.makeModelSearchTerm = '';
    this.selectedMakeModels = [];
    this.selectedBrandsModal = [];
    this.expandedMakeIds = [];
    this.activeMakeForModels = null;
    this.getFiltersData();
  }

  getSelectedModelCount(makeId: string | number): number {
    return this.selectedMakeModels.find((item) => String(item.makeId) === String(makeId))?.models.length || 0;
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

  onResetSellerType() {
    this.selectedSellerType = [];
    this.getFiltersData();
  }

  onResetYear() {
    const defaults = this.filterService.getDefaultPayload();
    this.yearRange = [
      defaults.year_range.min_year ?? new Date().getFullYear() - 35,
      defaults.year_range.max_year ?? new Date().getFullYear()
    ];
    this.getFiltersData();
  }

  onResetKm() {
    const defaults = this.filterService.getDefaultPayload();
    this.kmRange = [
      defaults.kilometers_range.min_km ?? 0,
      defaults.kilometers_range.max_km ?? 4000000
    ];
    this.getFiltersData();
  }

  onResetPrice() {
    const defaults = this.filterService.getDefaultPayload();
    this.priceType = defaults.price_type;
    this.priceRange = [
      defaults.price_range.min_price ?? 0,
      defaults.price_range.max_price ?? 1000000
    ];
    this.leasePriceRange = [
      defaults.price_range.min_price ?? 0,
      defaults.price_range.max_price ?? 100000
    ];
    this.getFiltersData();
  }

  onResetState() {
    this.stateId = [];
    this.getFiltersData();
  }

  onResetBodyType() {
    this.bodyTypeId = [];
    this.getFiltersData();
  }

  onResetFuel() {
    this.fuelTypeId = [];
    this.getFiltersData();
  }

  onResetTransmission() {
    this.transmissionId = [];
    this.getFiltersData();
  }

  onResetDriveType() {
    this.driveTypeId = [];
    this.getFiltersData();
  }

  onResetExteriorColor() {
    this.exteriorColorId = [];
    this.getFiltersData();
  }

  onResetInteriorColor() {
    this.interiorColorId = [];
    this.getFiltersData();
  }

  onResetSeatRange() {
    const defaults = this.filterService.getDefaultPayload();
    this.seatRange = [
      defaults.seat_range.min_seat ?? 0,
      defaults.seat_range.max_seat ?? 25
    ];
    this.getFiltersData();
  }

  onResetDoorRange() {
    const defaults = this.filterService.getDefaultPayload();
    this.doorRange = [
      defaults.door_range.min_door ?? 0,
      defaults.door_range.max_door ?? 10
    ];
    this.getFiltersData();
  }

  onResetPowerOutput() {
    this.powerOutputRange = [null, null];
  }

  onResetCubicCapacity() {
    this.cubicCapacityRange = [null, null];
  }

  onResetCylinders() {
    this.cylindersRange = [null, null];
  }

  onResetBatteryCapacity() {
    this.batteryCapacityRange = [null, null];
  }

  onResetTowCapacity() {
    this.towCapacityRange = [null, null];
  }

  onResetTotalWeight() {
    this.totalWeightRange = [null, null];
  }

  onResetEmptyWeight() {
    this.emptyWeightRange = [null, null];
  }

  onSellerTypeChange(type: string, event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedSellerType = this.toggleSelection(this.selectedSellerType, type, input.checked);
    this.getFiltersData();
  }

  onStateChange(id: number, event: Event) {
    const input = event.target as HTMLInputElement;
    this.stateId = this.toggleSelection(this.stateId, id, input.checked);
    this.getFiltersData();
  }

  onBodyTypeChange(id: number, event: Event) {
    const input = event.target as HTMLInputElement;
    this.bodyTypeId = this.toggleSelection(this.bodyTypeId, id, input.checked);
    this.getFiltersData();
  }

  onFuelTypeChange(id: number, event: Event) {
    const input = event.target as HTMLInputElement;
    this.fuelTypeId = this.toggleSelection(this.fuelTypeId, id, input.checked);
    this.getFiltersData();
  }

  onTransmissionChange(id: number, event: Event) {
    const input = event.target as HTMLInputElement;
    this.transmissionId = this.toggleSelection(this.transmissionId, id, input.checked);
    this.getFiltersData();
  }

  onDriveTypeChange(id: number, event: Event) {
    const input = event.target as HTMLInputElement;
    this.driveTypeId = this.toggleSelection(this.driveTypeId, id, input.checked);
    this.getFiltersData();
  }

  onExteriorColorChange(id: number, event: Event) {
    const input = event.target as HTMLInputElement;
    this.exteriorColorId = this.toggleSelection(this.exteriorColorId, id, input.checked);
    this.getFiltersData();
  }

  onInteriorColorChange(id: number, event: Event) {
    const input = event.target as HTMLInputElement;
    this.interiorColorId = this.toggleSelection(this.interiorColorId, id, input.checked);
    this.getFiltersData();
  }

  trackByValue(_index: number, item: FilterOption) {
    return item.value;
  }

  trackByLabel(_index: number, item: { label: string }) {
    return item.label;
  }

  ngOnDestroy(): void {
    this.priceRangeChange$.complete();
    this.kmRangeChange$.complete();
    this.seatRangeChange$.complete();
    this.doorRangeChange$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyViewModel(viewModel: any) {
    this.fuelTypeGroups = viewModel.fuelTypeGroups;
    this.transmissions = viewModel.transmissions;
    this.conditions = viewModel.conditions;
    this.driveTypes = viewModel.driveTypes;
    this.bodyTypes = viewModel.bodyTypes;
    this.carColors = viewModel.carColors;
    this.carColorColumns = viewModel.carColorColumns;
    this.interiorColors = viewModel.interiorColors;
    this.interiorColorColumns = viewModel.interiorColorColumns;
    this.carState = viewModel.carState;
    this.warrantyList = viewModel.warrantyList;
    this.energyEfficiencyOptions = viewModel.energyEfficiencyOptions;
    this.kilometersRangeAnalytics = viewModel.kilometersRangeAnalytics;
    this.priceRangeAnalytics = viewModel.priceRangeAnalytics;
    this.yearRangeAnalytics = viewModel.yearRangeAnalytics;
    this.seats = viewModel.seats;
    this.doors = viewModel.doors;
    this.sellerType = viewModel.sellerType;
    this.filterData = {
      ...viewModel.raw,
      total_cars: viewModel.totalCars
    };
  }

  private syncStateFromPayload(payload: FilterPayload) {
    this.priceType = payload.price_type ?? 'Purchase';
    this.selectedSellerType = [...(payload.seller_type || [])];
    this.stateId = [...(payload.state_id || [])];
    this.bodyTypeId = [...(payload.body_type_id || [])];
    this.fuelTypeId = [...(payload.fuel_type_id || [])];
    this.transmissionId = [...(payload.transmission || [])];
    this.driveTypeId = [...(payload.drive_type || [])];
    this.interiorColorId = [...(payload.interior_color || [])];
    this.exteriorColorId = [...(payload.exterior_color || [])];
    this.selectedMakeModels = this.cloneSelectedMakeModels(payload.make_model_selection || []);
    this.selectedBrandsModal = this.filterService.buildMakeModelSummary(this.getCommittedMakeModelSelection());
    this.expandedMakeIds = this.selectedMakeModels.map((item) => item.makeId);
    this.selectedMakeModels.forEach((item) => this.ensureModelsLoaded(item.makeId, item.makeLabel));
    this.yearRange = [
      payload.year_range?.min_year ?? this.yearRange[0],
      payload.year_range?.max_year ?? this.yearRange[1]
    ];
    this.kmRange = [
      payload.kilometers_range?.min_km ?? 0,
      payload.kilometers_range?.max_km ?? 4000000
    ];
    this.priceRange = [
      payload.price_range?.min_price ?? 0,
      payload.price_range?.max_price ?? 1000000
    ];
    this.leasePriceRange = [...this.priceRange] as [number, number];
    this.seatRange = [
      payload.seat_range?.min_seat ?? 0,
      payload.seat_range?.max_seat ?? 25
    ];
    this.doorRange = [
      payload.door_range?.min_door ?? 0,
      payload.door_range?.max_door ?? 10
    ];
    this.powerOutputRange = [null, null];
    this.cubicCapacityRange = [null, null];
    this.cylindersRange = [null, null];
    this.batteryCapacityRange = [null, null];
    this.towCapacityRange = [null, null];
    this.totalWeightRange = [null, null];
    this.emptyWeightRange = [null, null];
  }

  private buildDraftPayload(): Partial<FilterPayload> {
    const activePriceRange = this.priceType === 'Lease' ? this.leasePriceRange : this.priceRange;

    return {
      lang: localStorage.getItem('lang') || 'en',
      make_model_selection: this.getCommittedMakeModelSelection(),
      seller_type: [...this.selectedSellerType],
      state_id: [...this.stateId],
      body_type_id: [...this.bodyTypeId],
      fuel_type_id: [...this.fuelTypeId],
      transmission: [...this.transmissionId],
      drive_type: [...this.driveTypeId],
      exterior_color: [...this.exteriorColorId],
      interior_color: [...this.interiorColorId],
      year_range: {
        min_year: this.yearRange[0],
        max_year: this.yearRange[1]
      },
      kilometers_range: {
        min_km: this.kmRange[0],
        max_km: this.kmRange[1]
      },
      price_range: {
        min_price: activePriceRange[0],
        max_price: activePriceRange[1]
      },
      seat_range: {
        min_seat: this.seatRange[0],
        max_seat: this.seatRange[1]
      },
      door_range: {
        min_door: this.doorRange[0],
        max_door: this.doorRange[1]
      },
      price_type: this.priceType
    };
  }

  private toggleSelection<T>(list: T[], value: T, checked: boolean): T[] {
    if (checked) {
      return list.includes(value) ? list : [...list, value];
    }

    return list.filter((item) => item !== value);
  }

  private loadMakeOptions(): void {
    this.loadingMakes = true;
    this.filterService.loadMakeOptions().pipe(takeUntil(this.destroy$)).subscribe({
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
