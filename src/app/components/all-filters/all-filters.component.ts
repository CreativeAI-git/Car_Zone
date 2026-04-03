import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CommonService } from '../../services/common.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzSelectModule } from 'ng-zorro-antd/select';

type FilterOption = {
  image: string;
  label: string;
  value: any;
  count?: number;
  color?: string;
};

type FilterGroup = {
  label: string;
  options: FilterOption[];
};

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
  private initialFilters?: {
    kmRange: [number, number];
    priceRange: [number, number];
    yearRange: [number, number];
    seatRange: [number, number];
    doorRange: [number, number];
    priceType: 'Purchase' | 'Lease';
    sellerType?: string[];
    stateId?: number[];
    bodyTypeId?: number[];
    fuelTypeId?: number[];
    transmissionId?: number[];
    driveTypeId?: number[];
    interiorColorId?: number[];
    exteriorColorId?: number[];
  };

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
  priceRange: [number, number] = [0, 100000];
  yearRange: [number, number] = [1990, new Date().getFullYear()];
  years: number[] = [];
  kmRange: [number, number] = [0, 4000000];
  priceType: 'Purchase' | 'Lease' = 'Purchase'
  leasePriceRange: any = [0, 2000];
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
  filterData: any = {};
  isLoading = false;
  constructor(private service: CommonService, private message: NzMessageService) {
  }

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.yearRange = [currentYear - 35, currentYear];
    for (let year = currentYear; year >= 1990; year--) {
      this.years.push(year);
    }

    this.captureInitialFilters();
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
    this.isLoading = true;
    const query = this.buildFiltersQuery();
    this.service.get(`user/web/filters${query}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const data = res?.data || {};
        this.filterData = data;
        this.applyFiltersData(data);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching filters:', error);
        this.isLoading = false;
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

  private mapOptions(
    items: any[],
    labelKey: string,
    valueKey: string,
    extra?: (item: any) => Partial<FilterOption>
  ): FilterOption[] {
    return (items || []).map((item) => ({
      label: item?.[labelKey],
      value: item?.[valueKey],
      image: item?.image,
      ...(item?.count !== undefined || item?.total_cars !== undefined || item?.total !== undefined
        ? { count: item?.count ?? item?.total_cars ?? item?.total }
        : {}),
      ...(extra ? extra(item) : {})
    }));
  }

  private buildFiltersQuery(): string {
    const [fromKm, toKm] = this.kmRange || [];
    const [priceFrom, priceTo] = this.priceRange || [];
    const [fromYear, toYear] = this.yearRange || [];
    const [seatMin, seatMax] = this.seatRange || [];
    const [doorMin, doorMax] = this.doorRange || [];
    const params = new URLSearchParams();

    if (this.hasRangeChanged(this.kmRange, this.initialFilters?.kmRange)) {
      if (fromKm !== undefined) params.set('km_from', String(fromKm));
      if (toKm !== undefined) params.set('km_to', String(toKm));
    }

    if (this.hasRangeChanged(this.priceRange, this.initialFilters?.priceRange)) {
      if (priceFrom !== undefined) params.set('price_from', String(priceFrom));
      if (priceTo !== undefined) params.set('price_to', String(priceTo));
    }

    if (this.hasRangeChanged(this.yearRange, this.initialFilters?.yearRange)) {
      if (fromYear !== undefined) params.set('year_from', String(fromYear));
      if (toYear !== undefined) params.set('year_to', String(toYear));
    }

    if (this.hasRangeChanged(this.seatRange, this.initialFilters?.seatRange)) {
      if (seatMin !== undefined) params.set('seat_min', String(seatMin));
      if (seatMax !== undefined) params.set('seat_max', String(seatMax));
    }

    if (this.hasRangeChanged(this.doorRange, this.initialFilters?.doorRange)) {
      if (doorMin !== undefined) params.set('door_min', String(doorMin));
      if (doorMax !== undefined) params.set('door_max', String(doorMax));
    }

    if (this.initialFilters && this.priceType !== this.initialFilters.priceType) {
      params.set('price_type', this.priceType);
    }

    if (this.hasArrayChanged(this.selectedSellerType, this.initialFilters?.sellerType)) {
      this.setIfValue(params, 'seller_type', this.selectedSellerType);
    }
    if (this.hasArrayChanged(this.stateId, this.initialFilters?.stateId)) {
      this.setIfValue(params, 'state_id', this.stateId);
    }
    if (this.hasArrayChanged(this.bodyTypeId, this.initialFilters?.bodyTypeId)) {
      this.setIfValue(params, 'body_type_id', this.bodyTypeId);
    }
    if (this.hasArrayChanged(this.fuelTypeId, this.initialFilters?.fuelTypeId)) {
      this.setIfValue(params, 'fuel_type_id', this.fuelTypeId);
    }
    if (this.hasArrayChanged(this.transmissionId, this.initialFilters?.transmissionId)) {
      this.setIfValue(params, 'transmission_id', this.transmissionId);
    }
    if (this.hasArrayChanged(this.driveTypeId, this.initialFilters?.driveTypeId)) {
      this.setIfValue(params, 'drive_type_id', this.driveTypeId);
    }
    if (this.hasArrayChanged(this.interiorColorId, this.initialFilters?.interiorColorId)) {
      this.setIfValue(params, 'interior_color_id', this.interiorColorId);
    }
    if (this.hasArrayChanged(this.exteriorColorId, this.initialFilters?.exteriorColorId)) {
      this.setIfValue(params, 'exterior_color_id', this.exteriorColorId);
    }

    const query = params.toString();
    return query ? `?${query}` : '';
  }

  private applyFiltersData(data: any) {
    this.kilometersRangeAnalytics =
      data?.kilometers_range_analytics ??
      data?.kilometersRangeAnalytics ??
      data?.km_range_analytics ??
      data?.kmRangeAnalytics ??
      {};

    this.priceRangeAnalytics =
      data?.price_range_analytics ??
      data?.priceRangeAnalytics ??
      {};

    this.yearRangeAnalytics =
      data?.year_range_analytics ??
      data?.yearRangeAnalytics ??
      {};

    const fuelData =
      data?.fuel_type ??
      data?.fuel ??
      data?.fuel_types ??
      data?.fuelTypeGroups ??
      data?.fuel_groups ??
      {};

    if (Array.isArray(fuelData)) {
      if (fuelData.length && fuelData[0]?.options) {
        this.fuelTypeGroups = fuelData.map((group: any) => ({
          label: group?.label ?? '',
          options: (group?.options || []).map((x: any) => ({
            label: x?.label,
            value: x?.id ?? x?.value,
            count: x?.count ?? x?.total_cars
          }))
        }));
      } else {
        this.fuelTypeGroups = [
          {
            label: 'Fuel',
            options: this.mapOptions(fuelData, 'name', 'id')
          }
        ];
      }
    } else {
      this.fuelTypeGroups = this.buildFuelTypeGroups(fuelData);
    }

    const transmissionData = data?.transmission ?? data?.transmissions ?? {};
    this.transmissions = this.mapOptions(this.normalizeItems(transmissionData), 'name', 'id');

    const driveData = data?.drive ?? data?.drive_types ?? data?.driveTypes ?? {};
    this.driveTypes = this.mapOptions(this.normalizeItems(driveData), 'name', 'id');

    const bodyData = data?.body_type ?? data?.body_types ?? data?.bodyTypes ?? {};
    this.bodyTypes = this.mapOptions(this.normalizeItems(bodyData), 'name', 'id');

    const conditionsData = data?.vehicle_conditions ?? data?.conditions ?? [];
    this.conditions = this.mapOptions(this.normalizeItems(conditionsData), 'name', 'id');

    const stateData = data?.vehicle_state ?? data?.car_state ?? data?.state ?? {};
    this.carState = this.mapOptions(this.normalizeItems(stateData), 'name', 'id');

    const warrantyData = data?.warranty ?? data?.warranty_list ?? [];
    const warrantyItems = this.normalizeItems(warrantyData).slice().sort(
      (a: { id: number }, b: { id: number }) => a.id - b.id
    );
    this.warrantyList = this.mapOptions(warrantyItems, 'name', 'id');

    const colorsData =
      data?.exterior_color ??
      data?.colors ??
      data?.car_colors ??
      data?.color ??
      [];
    this.carColors = this.mapOptions(this.normalizeItems(colorsData), 'name', 'id', (item: any) => ({
      color: item?.hex_code
    }));
    this.carColorColumns = this.splitIntoColumns(this.carColors, 3);

    const energyData = data?.energy_efficiency_raw ?? data?.energy_efficiency ?? data?.energyEfficiency ?? {};
    this.energyEfficiencyOptions = this.mapOptions(
      this.normalizeItems(energyData),
      'grade',
      'grade'
    );

    const seatsData = data?.seats ?? {};
    this.seats = this.mapOptions(this.normalizeItems(seatsData), 'name', 'id');

    const doorsData = data?.doors ?? {};
    this.doors = this.mapOptions(this.normalizeItems(doorsData), 'name', 'id');

    const sellerTypeData = data?.seller_type ?? data?.sellerTypes ?? {};
    this.sellerType = this.mapOptions(this.normalizeItems(sellerTypeData), 'seller_type', 'seller_type');
  }

  private normalizeItems(data: any): any[] {
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.types)) {
      return data.types;
    }
    return [];
  }

  private captureInitialFilters(): void {
    this.initialFilters = {
      kmRange: [...this.kmRange] as [number, number],
      priceRange: [...this.priceRange] as [number, number],
      yearRange: [...this.yearRange] as [number, number],
      seatRange: [...this.seatRange] as [number, number],
      doorRange: [...this.doorRange] as [number, number],
      priceType: this.priceType,
      sellerType: [...this.selectedSellerType],
      stateId: [...this.stateId],
      bodyTypeId: [...this.bodyTypeId],
      fuelTypeId: [...this.fuelTypeId],
      transmissionId: [...this.transmissionId],
      driveTypeId: [...this.driveTypeId],
      interiorColorId: [...this.interiorColorId],
      exteriorColorId: [...this.exteriorColorId]
    };
  }

  private hasRangeChanged(
    current: [number, number],
    initial?: [number, number]
  ): boolean {
    // return true;
    if (!initial) return true;
    return current[0] !== initial[0] || current[1] !== initial[1];
  }

  private hasArrayChanged<T>(current: T[], initial?: T[]): boolean {
    if (!initial) return current.length > 0;
    if (current.length !== initial.length) return true;
    const currentSorted = [...current].sort();
    const initialSorted = [...initial].sort();
    return currentSorted.some((val, index) => val !== initialSorted[index]);
  }

  private setIfValue(params: URLSearchParams, key: string, value: any): void {
    if (value === null || value === undefined || value === '') return;
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      params.set(key, value.join(','));
      return;
    }
    params.set(key, String(value));
  }

  private toggleSelection<T>(list: T[], value: T, checked: boolean): T[] {
    if (checked) {
      return list.includes(value) ? list : [...list, value];
    }
    return list.filter((item) => item !== value);
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

  private buildFuelTypeGroups(data: any): FilterGroup[] {
    const groupKeys = [
      { key: 'standard', label: 'Standard' },
      { key: 'hybrid', label: 'Hybrid' },
      { key: 'gas', label: 'Gas' },
      { key: 'other', label: 'Other' }
    ];

    return groupKeys.map((group) => ({
      label: group.label,
      options: (data?.[group.key] || []).map((x: any) => ({
        label: x.label,
        value: x.id,
        count: x.count ?? x.total_cars
      }))
    }));
  }

  private splitIntoColumns(items: FilterOption[], columnCount: number): FilterOption[][] {
    const columns: FilterOption[][] = Array.from({ length: columnCount }, () => []);
    items.forEach((item, index) => {
      columns[index % columnCount].push(item);
    });
    return columns;
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
}
