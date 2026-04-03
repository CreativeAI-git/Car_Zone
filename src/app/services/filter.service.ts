import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
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

  constructor(private commonService: CommonService, private router: Router) {}

  get draftFilters(): FilterPayload {
    return this.clonePayload(this.draftFiltersSubject.value);
  }

  get appliedFilters(): FilterPayload {
    return this.clonePayload(this.appliedFiltersSubject.value);
  }

  get viewModel(): FilterViewModel {
    return this.viewModelSubject.value;
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
    if (this.lastResponse && this.hasAppliedFilters) {
      this.viewModelSubject.next(this.lastResponse);
      return of(this.lastResponse);
    }

    return this.executeRequest(this.appliedFiltersSubject.value, true);
  }

  previewDraft(): Observable<FilterViewModel> {
    return this.executeRequest(this.draftFiltersSubject.value, false);
  }

  applyDraft(navigateToBrowse = false): Observable<FilterViewModel> {
    return this.executeRequest(this.draftFiltersSubject.value, true).pipe(
      tap(() => {
        if (navigateToBrowse) {
          this.router.navigate(['/browse-cars']);
        }
      })
    );
  }

  private executeRequest(payload: FilterPayload, persistApplied: boolean): Observable<FilterViewModel> {
    const normalizedPayload = this.normalizePayload(payload);
    const requestKey = JSON.stringify(normalizedPayload);

    if (this.lastRequestKey === requestKey && this.lastResponse) {
      if (persistApplied) {
        this.appliedFiltersSubject.next(this.clonePayload(normalizedPayload));
        this.draftFiltersSubject.next(this.clonePayload(normalizedPayload));
        this.hasAppliedFilters = true;
      }
      this.viewModelSubject.next(this.lastResponse);
      return of(this.lastResponse);
    }

    this.loadingSubject.next(true);

    return this.commonService.post<any, FilterPayload>('user/faceted-filters', normalizedPayload).pipe(
      tap((res: any) => {
        const viewModel = this.mapResponseToViewModel(res?.data || {});
        this.lastRequestKey = requestKey;
        this.lastResponse = viewModel;
        this.viewModelSubject.next(viewModel);

        if (persistApplied) {
          this.appliedFiltersSubject.next(this.clonePayload(normalizedPayload));
          this.draftFiltersSubject.next(this.clonePayload(normalizedPayload));
          this.hasAppliedFilters = true;
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

  private mapResponseToViewModel(data: any): FilterViewModel {
    const fuelData =
      data?.fuel_type ??
      data?.fuel ??
      data?.fuel_types ??
      data?.fuelTypeGroups ??
      data?.fuel_groups ??
      {};

    const colorsData =
      data?.exterior_color ??
      data?.colors ??
      data?.car_colors ??
      data?.color ??
      [];

    const transmissions = this.mapOptions(
      this.normalizeItems(data?.transmission ?? data?.transmissions ?? {}),
      'name',
      'id'
    );

    const bodyTypes = this.mapOptions(
      this.normalizeItems(data?.body_type ?? data?.body_types ?? data?.bodyTypes ?? {}),
      'name',
      'id'
    );

    const totalCars = this.extractTotalCars(data);

    return {
      raw: data,
      fuelTypeGroups: Array.isArray(fuelData)
        ? this.mapFuelArrayGroups(fuelData)
        : this.buildFuelTypeGroups(fuelData),
      transmissions,
      conditions: this.mapOptions(
        this.normalizeItems(data?.vehicle_conditions ?? data?.conditions ?? []),
        'name',
        'id'
      ),
      driveTypes: this.mapOptions(
        this.normalizeItems(data?.drive ?? data?.drive_types ?? data?.driveTypes ?? {}),
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
        this.normalizeItems(data?.vehicle_state ?? data?.car_state ?? data?.state ?? {}),
        'name',
        'id'
      ),
      warrantyList: this.mapOptions(
        this.normalizeItems(data?.warranty ?? data?.warranty_list ?? []).slice().sort(
          (a: { id: number }, b: { id: number }) => a.id - b.id
        ),
        'name',
        'id'
      ),
      energyEfficiencyOptions: this.mapOptions(
        this.normalizeItems(data?.energy_efficiency_raw ?? data?.energy_efficiency ?? data?.energyEfficiency ?? {}),
        'grade',
        'grade'
      ),
      kilometersRangeAnalytics:
        data?.kilometers_range_analytics ??
        data?.kilometersRangeAnalytics ??
        data?.km_range_analytics ??
        data?.kmRangeAnalytics ??
        DEFAULT_KM_ANALYTICS,
      priceRangeAnalytics:
        data?.price_range_analytics ??
        data?.priceRangeAnalytics ??
        DEFAULT_PRICE_ANALYTICS,
      yearRangeAnalytics:
        data?.year_range_analytics ??
        data?.yearRangeAnalytics ??
        DEFAULT_YEAR_ANALYTICS,
      seats: this.mapOptions(this.normalizeItems(data?.seats ?? {}), 'name', 'id'),
      doors: this.mapOptions(this.normalizeItems(data?.doors ?? {}), 'name', 'id'),
      sellerType: this.mapOptions(
        this.normalizeItems(data?.seller_type ?? data?.sellerTypes ?? {}),
        'seller_type',
        'seller_type'
      ),
      cars: this.extractCars(data),
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
        max_price: 100000
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
    const candidates = [
      data?.cars,
      data?.car_list,
      data?.cars_list,
      data?.vehicles,
      data?.vehicle_list,
      data?.results,
      data?.items,
      data?.listing
    ];

    return candidates.find((candidate) => Array.isArray(candidate)) || [];
  }

  private extractTotalCars(data: any): number {
    return Number(
      data?.total_cars ??
      data?.totalCars ??
      data?.matching_vehicles ??
      this.extractCars(data)?.length ??
      0
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
