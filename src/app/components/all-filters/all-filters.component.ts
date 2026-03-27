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
  priceRange: [number, number] = [1, 100000];
  yearRange: [number, number] = [2015, 2020];
  years: number[] = [];
  kmRange: [number, number] = [1, 4000000];
  priceType: 'Purchase' | 'Lease' = 'Purchase'
  leasePriceRange: any = [10, 2000];
  seatRange: [number, number] = [1, 25];
  doorRange: [number, number] = [1, 10];
  seats: FilterOption[] = [];
  doors: FilterOption[] = [];
  constructor(private service: CommonService, private message: NzMessageService) {
  }

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.yearRange = [currentYear - 5, currentYear];
    for (let year = currentYear; year >= 1990; year--) {
      this.years.push(year);
    }

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
    const query = this.buildFiltersQuery();
    this.service.get(`user/web/filters${query}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const data = res?.data || {};
        this.applyFiltersData(data);
      },
      error: (error) => {
        console.error('Error fetching filters:', error);
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

    if (fromKm !== undefined) params.set('from_km', String(fromKm));
    if (toKm !== undefined) params.set('to_km', String(toKm));
    if (priceFrom !== undefined) params.set('car_price_from', String(priceFrom));
    if (priceTo !== undefined) params.set('car_price_to', String(priceTo));
    if (fromYear !== undefined) params.set('from_year', String(fromYear));
    if (toYear !== undefined) params.set('to_year', String(toYear));
    if (seatMin !== undefined) params.set('seat_min', String(seatMin));
    if (seatMax !== undefined) params.set('seat_max', String(seatMax));
    if (doorMin !== undefined) params.set('door_min', String(doorMin));
    if (doorMax !== undefined) params.set('door_max', String(doorMax));
    params.set('price_type', this.priceType);
    params.set('lang', 'en');

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

  onSeatRangeChange() {
    this.seatRangeChange$.next();
  }

  onDoorRangeChange() {
    this.doorRangeChange$.next();
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
