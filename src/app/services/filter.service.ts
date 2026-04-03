import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { CommonService } from './common.service';

export type FilterOption = {
  image?: string;
  label: string;
  value: any;
  count?: number;
  color?: string;
};

export type FilterGroup = {
  label: string;
  options: FilterOption[];
};

export type NumberRange = {
  min: number | null;
  max: number | null;
};

export type FilterPayload = {
  lang: string;
  seller_type: string[];
  fuel_type_id: number[];
  state_id: number[];
  body_type_id: number[];
  transmission: number[];
  drive_type: number[];
  accident_vehicle: number[];
  exterior_color: number[];
  interior_color: number[];
  energy_efficiency: string[];
  year_range: {
    min_year: number | null;
    max_year: number | null;
  };
  kilometers_range: {
    min_km: number | null;
    max_km: number | null;
  };
  price_range: {
    min_price: number | null;
    max_price: number | null;
  };
  seat_range: {
    min_seat: number | null;
    max_seat: number | null;
  };
  door_range: {
    min_door: number | null;
    max_door: number | null;
  };
  price_type: 'Purchase' | 'Lease';
};

export type FilterViewModel = {
  raw: any;
  fuelTypeGroups: FilterGroup[];
  transmissions: FilterOption[];
  conditions: FilterOption[];
  driveTypes: FilterOption[];
  bodyTypes: FilterOption[];
  carColors: FilterOption[];
  carColorColumns: FilterOption[][];
  carState: FilterOption[];
  warrantyList: FilterOption[];
  energyEfficiencyOptions: FilterOption[];
  kilometersRangeAnalytics: any;
  priceRangeAnalytics: any;
  yearRangeAnalytics: any;
  seats: FilterOption[];
  doors: FilterOption[];
  sellerType: FilterOption[];
  cars: any[];
  totalCars: number;
};

const DEFAULT_PRICE_ANALYTICS = {
  matching_vehicles: 0
};

const DEFAULT_YEAR_ANALYTICS = {
  total_cars_all_years: 0,
  selected_range: { total_cars: 0 },
  breakdown: {
    older_models: { count: 0 },
    newer_models: { count: 0 }
  }
};

const DEFAULT_KM_ANALYTICS = {
  total_cars_all_mileage: 0,
  selected_range: { total_cars: 0 },
  breakdown: {
    higher_mileage: { count: 0 },
    lower_mileage: { count: 0 }
  }
};

const DEFAULT_VIEW_MODEL: FilterViewModel = {
  raw: {},
  fuelTypeGroups: [],
  transmissions: [],
  conditions: [],
  driveTypes: [],
  bodyTypes: [],
  carColors: [],
  carColorColumns: [],
  carState: [],
  warrantyList: [],
  energyEfficiencyOptions: [],
  kilometersRangeAnalytics: DEFAULT_KM_ANALYTICS,
  priceRangeAnalytics: DEFAULT_PRICE_ANALYTICS,
  yearRangeAnalytics: DEFAULT_YEAR_ANALYTICS,
  seats: [],
  doors: [],
  sellerType: [],
  cars: [],
  totalCars: 0
};

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private readonly draftFiltersSubject = new BehaviorSubject<FilterPayload>(this.createDefaultPayload());
  private readonly appliedFiltersSubject = new BehaviorSubject<FilterPayload>(this.createDefaultPayload());
  private readonly viewModelSubject = new BehaviorSubject<FilterViewModel>(DEFAULT_VIEW_MODEL);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  private lastRequestKey: string | null = null;
  private lastResponse: FilterViewModel | null = null;
  private hasAppliedFilters = false;

  readonly draftFilters$ = this.draftFiltersSubject.asObservable();
  readonly appliedFilters$ = this.appliedFiltersSubject.asObservable();
  readonly viewModel$ = this.viewModelSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  constructor(private commonService: CommonService, private router: Router) { }

  get draftFilters(): FilterPayload {
    return this.clonePayload(this.draftFiltersSubject.value);
  }

  get appliedFilters(): FilterPayload {
    return this.clonePayload(this.appliedFiltersSubject.value);
  }

  get viewModel(): FilterViewModel {
    return this.viewModelSubject.value;
  }

  getDefaultPayload(): FilterPayload {
    return this.createDefaultPayload();
  }

  hasActiveAppliedFilters(): boolean {
    return this.hasMeaningfulFilters(this.appliedFiltersSubject.value);
  }

  resetFilters(): void {
    const defaultPayload = this.createDefaultPayload();
    this.lastRequestKey = null;
    this.lastResponse = null;
    this.hasAppliedFilters = false;
    this.appliedFiltersSubject.next(this.clonePayload(defaultPayload));
    this.draftFiltersSubject.next(this.clonePayload(defaultPayload));
    this.viewModelSubject.next(DEFAULT_VIEW_MODEL);
  }

  beginEditing(): void {
    this.draftFiltersSubject.next(this.clonePayload(this.appliedFiltersSubject.value));
  }

  patchDraft(patch: Partial<FilterPayload>): void {
    this.draftFiltersSubject.next(this.mergePayload(this.draftFiltersSubject.value, patch));
  }

  patchAppliedAndDraft(patch: Partial<FilterPayload>): void {
    const nextApplied = this.mergePayload(this.appliedFiltersSubject.value, patch);
    this.appliedFiltersSubject.next(nextApplied);
    this.draftFiltersSubject.next(this.clonePayload(nextApplied));
  }

  ensureAppliedLoaded(): Observable<FilterViewModel> {
    const normalizedPayload = this.normalizePayload(this.appliedFiltersSubject.value);
    const shouldFetchCars = this.hasMeaningfulFilters(normalizedPayload);
    const requestKey = JSON.stringify({ payload: normalizedPayload, includeCars: shouldFetchCars });

    if (this.lastResponse && this.hasAppliedFilters && this.lastRequestKey === requestKey) {
      this.viewModelSubject.next(this.lastResponse);
      return of(this.lastResponse);
    }

    return this.executeRequest(this.appliedFiltersSubject.value, true, true);
  }

  loadAppliedMetadata(): Observable<FilterViewModel> {
    return this.executeRequest(this.appliedFiltersSubject.value, false, false);
  }

  previewDraft(): Observable<FilterViewModel> {
    return this.executeRequest(this.draftFiltersSubject.value, false, false);
  }

  applyDraft(navigateToBrowse = false): Observable<FilterViewModel> {
    return this.executeRequest(this.draftFiltersSubject.value, true, true).pipe(
      tap(() => {
        if (navigateToBrowse) {
          this.router.navigate(['/browse-cars']);
        }
      })
    );
  }

  private executeRequest(
    payload: FilterPayload,
    persistApplied: boolean,
    includeCars: boolean
  ): Observable<FilterViewModel> {
    const normalizedPayload = this.normalizePayload(payload);
    const shouldFetchCars = includeCars && this.hasMeaningfulFilters(normalizedPayload);
    const requestKey = JSON.stringify({ payload: normalizedPayload, includeCars: shouldFetchCars });

    if (this.lastRequestKey === requestKey && this.lastResponse) {
      if (persistApplied) {
        this.appliedFiltersSubject.next(this.clonePayload(normalizedPayload));
        this.draftFiltersSubject.next(this.clonePayload(normalizedPayload));
        this.hasAppliedFilters = shouldFetchCars;
      }
      this.viewModelSubject.next(this.lastResponse);
      return of(this.lastResponse);
    }

    this.loadingSubject.next(true);

    return forkJoin({
      metadata: this.commonService.get(`user/web/filters${this.buildFiltersQuery(normalizedPayload)}`),
      cars: shouldFetchCars
        ? this.commonService.post<any, any>('user/faceted-filters', this.buildFacetedPayload(normalizedPayload))
        : of(null)
    }).pipe(
      tap(({ metadata, cars }: { metadata: any; cars: any }) => {
        const viewModel = this.mapResponseToViewModel(metadata?.data || {}, cars?.data || null);
        this.lastRequestKey = requestKey;
        this.lastResponse = viewModel;
        this.viewModelSubject.next(viewModel);

        if (persistApplied) {
          this.appliedFiltersSubject.next(this.clonePayload(normalizedPayload));
          this.draftFiltersSubject.next(this.clonePayload(normalizedPayload));
          this.hasAppliedFilters = shouldFetchCars;
        }
      }),
      catchError((error) => {
        console.error('Error fetching filters:', error);
        return throwError(() => error);
      }),
      finalize(() => this.loadingSubject.next(false)),
      map(() => this.viewModelSubject.value)
    );
  }

  private mapResponseToViewModel(metadataData: any, carsData?: any): FilterViewModel {
    const fuelData =
      metadataData?.fuel_type ??
      metadataData?.fuel ??
      metadataData?.fuel_types ??
      metadataData?.fuelTypeGroups ??
      metadataData?.fuel_groups ??
      {};

    const colorsData =
      metadataData?.exterior_color ??
      metadataData?.colors ??
      metadataData?.car_colors ??
      metadataData?.color ??
      [];

    const transmissions = this.mapOptions(
      this.normalizeItems(metadataData?.transmission ?? metadataData?.transmissions ?? {}),
      'name',
      'id'
    );

    const bodyTypes = this.mapOptions(
      this.normalizeItems(metadataData?.body_type ?? metadataData?.body_types ?? metadataData?.bodyTypes ?? {}),
      'name',
      'id'
    );

    const totalCars = this.extractTotalCars(metadataData, carsData);

    return {
      raw: metadataData,
      fuelTypeGroups: Array.isArray(fuelData)
        ? this.mapFuelArrayGroups(fuelData)
        : this.buildFuelTypeGroups(fuelData),
      transmissions,
      conditions: this.mapOptions(
        this.normalizeItems(metadataData?.vehicle_conditions ?? metadataData?.conditions ?? []),
        'name',
        'id'
      ),
      driveTypes: this.mapOptions(
        this.normalizeItems(metadataData?.drive ?? metadataData?.drive_types ?? metadataData?.driveTypes ?? {}),
        'name',
        'id'
      ),
      bodyTypes,
      carColors: this.mapOptions(this.normalizeItems(colorsData), 'name', 'id', (item: any) => ({
        color: item?.hex_code
      })),
      carColorColumns: this.splitIntoColumns(
        this.mapOptions(this.normalizeItems(colorsData), 'name', 'id', (item: any) => ({
          color: item?.hex_code
        })),
        3
      ),
      carState: this.mapOptions(
        this.normalizeItems(metadataData?.vehicle_state ?? metadataData?.car_state ?? metadataData?.state ?? {}),
        'name',
        'id'
      ),
      warrantyList: this.mapOptions(
        this.normalizeItems(metadataData?.warranty ?? metadataData?.warranty_list ?? []).slice().sort(
          (a: { id: number }, b: { id: number }) => a.id - b.id
        ),
        'name',
        'id'
      ),
      energyEfficiencyOptions: this.mapOptions(
        this.normalizeItems(
          metadataData?.energy_efficiency_raw ?? metadataData?.energy_efficiency ?? metadataData?.energyEfficiency ?? {}
        ),
        'grade',
        'grade'
      ),
      kilometersRangeAnalytics:
        metadataData?.kilometers_range_analytics ??
        metadataData?.kilometersRangeAnalytics ??
        metadataData?.km_range_analytics ??
        metadataData?.kmRangeAnalytics ??
        DEFAULT_KM_ANALYTICS,
      priceRangeAnalytics:
        metadataData?.price_range_analytics ??
        metadataData?.priceRangeAnalytics ??
        DEFAULT_PRICE_ANALYTICS,
      yearRangeAnalytics:
        metadataData?.year_range_analytics ??
        metadataData?.yearRangeAnalytics ??
        DEFAULT_YEAR_ANALYTICS,
      seats: this.mapOptions(this.normalizeItems(metadataData?.seats ?? {}), 'name', 'id'),
      doors: this.mapOptions(this.normalizeItems(metadataData?.doors ?? {}), 'name', 'id'),
      sellerType: this.mapOptions(
        this.normalizeItems(metadataData?.seller_type ?? metadataData?.sellerTypes ?? {}),
        'seller_type',
        'seller_type'
      ),
      cars: this.extractCars(carsData),
      totalCars
    };
  }

  private normalizePayload(payload: FilterPayload): FilterPayload {
    return {
      ...this.clonePayload(payload),
      lang: payload.lang || localStorage.getItem('lang') || 'en'
    };
  }

  private createDefaultPayload(): FilterPayload {
    const currentYear = new Date().getFullYear();
    return {
      lang: localStorage.getItem('lang') || 'en',
      seller_type: [],
      fuel_type_id: [],
      state_id: [],
      body_type_id: [],
      transmission: [],
      drive_type: [],
      accident_vehicle: [],
      exterior_color: [],
      interior_color: [],
      energy_efficiency: [],
      year_range: {
        min_year: currentYear - 35,
        max_year: currentYear
      },
      kilometers_range: {
        min_km: 0,
        max_km: 4000000
      },
      price_range: {
        min_price: 0,
        max_price: 1000000
      },
      seat_range: {
        min_seat: 0,
        max_seat: 25
      },
      door_range: {
        min_door: 0,
        max_door: 10
      },
      price_type: 'Purchase'
    };
  }

  private clonePayload(payload: FilterPayload): FilterPayload {
    return JSON.parse(JSON.stringify(payload));
  }

  private mergePayload(current: FilterPayload, patch: Partial<FilterPayload>): FilterPayload {
    return {
      ...current,
      ...patch,
      year_range: {
        ...current.year_range,
        ...patch.year_range
      },
      kilometers_range: {
        ...current.kilometers_range,
        ...patch.kilometers_range
      },
      price_range: {
        ...current.price_range,
        ...patch.price_range
      },
      seat_range: {
        ...current.seat_range,
        ...patch.seat_range
      },
      door_range: {
        ...current.door_range,
        ...patch.door_range
      }
    };
  }

  private extractCars(data: any): any[] {
    return data || [];
  }

  private extractTotalCars(metadataData: any, carsData?: any): number {
    return Number(
      metadataData?.total_cars ??
      metadataData?.totalCars ??
      carsData?.total_cars ??
      carsData?.totalCars ??
      carsData?.matching_vehicles ??
      this.extractCars(carsData)?.length ??
      0
    );
  }

  private buildFiltersQuery(payload: FilterPayload): string {
    const defaults = this.createDefaultPayload();
    const params = new URLSearchParams();

    if (this.hasRangeChanged(payload.kilometers_range, defaults.kilometers_range)) {
      this.setIfValue(params, 'km_from', payload.kilometers_range.min_km);
      this.setIfValue(params, 'km_to', payload.kilometers_range.max_km);
    }

    if (this.hasRangeChanged(payload.price_range, defaults.price_range)) {
      this.setIfValue(params, 'price_from', payload.price_range.min_price);
      this.setIfValue(params, 'price_to', payload.price_range.max_price);
    }

    if (this.hasRangeChanged(payload.year_range, defaults.year_range)) {
      this.setIfValue(params, 'year_from', payload.year_range.min_year);
      this.setIfValue(params, 'year_to', payload.year_range.max_year);
    }

    if (this.hasRangeChanged(payload.seat_range, defaults.seat_range)) {
      this.setIfValue(params, 'seat_min', payload.seat_range.min_seat);
      this.setIfValue(params, 'seat_max', payload.seat_range.max_seat);
    }

    if (this.hasRangeChanged(payload.door_range, defaults.door_range)) {
      this.setIfValue(params, 'door_min', payload.door_range.min_door);
      this.setIfValue(params, 'door_max', payload.door_range.max_door);
    }

    if (payload.price_type !== defaults.price_type) {
      this.setIfValue(params, 'price_type', payload.price_type);
    }

    this.setIfValue(params, 'seller_type', payload.seller_type);
    this.setIfValue(params, 'state_id', payload.state_id);
    this.setIfValue(params, 'body_type_id', payload.body_type_id);
    this.setIfValue(params, 'fuel_type_id', payload.fuel_type_id);
    this.setIfValue(params, 'transmission_id', payload.transmission);
    this.setIfValue(params, 'drive_type_id', payload.drive_type);
    this.setIfValue(params, 'interior_color_id', payload.interior_color);
    this.setIfValue(params, 'exterior_color_id', payload.exterior_color);

    const query = params.toString();
    return query ? `?${query}` : '';
  }

  private buildFacetedPayload(payload: FilterPayload): Record<string, any> {
    const defaults = this.createDefaultPayload();
    const compactPayload: Record<string, any> = {
      lang: payload.lang || defaults.lang
    };

    if (payload.seller_type.length > 0) {
      compactPayload['seller_type'] = payload.seller_type;
    }

    if (payload.fuel_type_id.length > 0) {
      compactPayload['fuel_type_id'] = payload.fuel_type_id;
    }

    if (payload.state_id.length > 0) {
      compactPayload['state_id'] = payload.state_id;
    }

    if (payload.body_type_id.length > 0) {
      compactPayload['body_type_id'] = payload.body_type_id;
    }

    if (payload.transmission.length > 0) {
      compactPayload['transmission'] = payload.transmission;
    }

    if (payload.drive_type.length > 0) {
      compactPayload['drive_type'] = payload.drive_type;
    }

    if (payload.accident_vehicle.length > 0) {
      compactPayload['accident_vehicle'] = payload.accident_vehicle;
    }

    if (payload.exterior_color.length > 0) {
      compactPayload['exterior_color'] = payload.exterior_color;
    }

    if (payload.interior_color.length > 0) {
      compactPayload['interior_color'] = payload.interior_color;
    }

    if (payload.energy_efficiency.length > 0) {
      compactPayload['energy_efficiency'] = payload.energy_efficiency;
    }

    if (this.hasRangeChanged(payload.year_range, defaults.year_range)) {
      compactPayload['year_range'] = {
        min_year: payload.year_range.min_year,
        max_year: payload.year_range.max_year
      };
    }

    if (this.hasRangeChanged(payload.kilometers_range, defaults.kilometers_range)) {
      compactPayload['kilometers_range'] = {
        min_km: payload.kilometers_range.min_km,
        max_km: payload.kilometers_range.max_km
      };
    }

    if (this.hasRangeChanged(payload.price_range, defaults.price_range)) {
      compactPayload['price_range'] = {
        min_price: payload.price_range.min_price,
        max_price: payload.price_range.max_price
      };
    }

    if (this.hasRangeChanged(payload.seat_range, defaults.seat_range)) {
      compactPayload['seat_range'] = {
        min_seat: payload.seat_range.min_seat,
        max_seat: payload.seat_range.max_seat
      };
    }

    if (this.hasRangeChanged(payload.door_range, defaults.door_range)) {
      compactPayload['door_range'] = {
        min_door: payload.door_range.min_door,
        max_door: payload.door_range.max_door
      };
    }

    if (payload.price_type !== defaults.price_type) {
      compactPayload['price_type'] = payload.price_type;
    }

    return compactPayload;
  }

  private hasRangeChanged(
    current: { [key: string]: number | null },
    initial: { [key: string]: number | null }
  ): boolean {
    const keys = Object.keys(current);
    return keys.some((key) => current[key] !== initial[key]);
  }

  private setIfValue(params: URLSearchParams, key: string, value: any): void {
    if (value === null || value === undefined || value === '') return;

    if (Array.isArray(value)) {
      if (!value.length) return;
      params.set(key, value.join(','));
      return;
    }

    params.set(key, String(value));
  }

  private hasMeaningfulFilters(payload: FilterPayload): boolean {
    const defaults = this.createDefaultPayload();

    return (
      this.hasRangeChanged(payload.year_range, defaults.year_range) ||
      this.hasRangeChanged(payload.kilometers_range, defaults.kilometers_range) ||
      this.hasRangeChanged(payload.price_range, defaults.price_range) ||
      this.hasRangeChanged(payload.seat_range, defaults.seat_range) ||
      this.hasRangeChanged(payload.door_range, defaults.door_range) ||
      payload.price_type !== defaults.price_type ||
      payload.seller_type.length > 0 ||
      payload.fuel_type_id.length > 0 ||
      payload.state_id.length > 0 ||
      payload.body_type_id.length > 0 ||
      payload.transmission.length > 0 ||
      payload.drive_type.length > 0 ||
      payload.accident_vehicle.length > 0 ||
      payload.exterior_color.length > 0 ||
      payload.interior_color.length > 0 ||
      payload.energy_efficiency.length > 0
    );
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

  private mapFuelArrayGroups(fuelData: any[]): FilterGroup[] {
    if (fuelData.length && fuelData[0]?.options) {
      return fuelData.map((group: any) => ({
        label: group?.label ?? '',
        options: (group?.options || []).map((item: any) => ({
          label: item?.label,
          value: item?.id ?? item?.value,
          count: item?.count ?? item?.total_cars
        }))
      }));
    }

    return [
      {
        label: 'Fuel',
        options: this.mapOptions(fuelData, 'name', 'id')
      }
    ];
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
      options: (data?.[group.key] || []).map((item: any) => ({
        label: item.label,
        value: item.id,
        count: item.count ?? item.total_cars
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
}
