import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FilterGroup, FilterOption, FilterPayload, FilterService } from '../../services/filter.service';

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

  fuelTypeGroups: FilterGroup[] = [];
  transmissions: FilterOption[] = [];
  conditions: FilterOption[] = [];
  driveTypes: FilterOption[] = [];
  bodyTypes: FilterOption[] = [];
  carColors: FilterOption[] = [];
  carColorColumns: FilterOption[][] = [];
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

  constructor(private filterService: FilterService, private message: NzMessageService) { }

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.yearRange = [currentYear - 35, currentYear];

    for (let year = currentYear; year >= 1990; year--) {
      this.years.push(year);
    }

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
        this.message.error('Unable to load filters right now.');
      }
    });
  }

  onApplyFilters() {
    this.filterService.patchDraft(this.buildDraftPayload());
    this.filterService.applyDraft(true).pipe(takeUntil(this.destroy$)).subscribe({
      error: () => {
        this.message.error('Unable to apply filters right now.');
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
  }

  private buildDraftPayload(): Partial<FilterPayload> {
    const activePriceRange = this.priceType === 'Lease' ? this.leasePriceRange : this.priceRange;

    return {
      lang: localStorage.getItem('lang') || 'en',
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
}
