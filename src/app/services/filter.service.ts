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

export type MakeModelOption = {
  label: string;
  value: string | number;
  count?: number;
  raw?: any;
};

export type SelectedMakeModel = {
  makeId: string | number;
  makeLabel: string;
  models: Array<{
    modelId: string | number;
    modelLabel: string;
  }>;
};

export type NumberRange = {
  min: number | null;
  max: number | null;
};

export type FilterNumericRange = {
  min_value: number | null;
  max_value: number | null;
};

export type FilterPayload = {
  lang?: string;
  page: number;
  limit: number;
  make_model_selection: SelectedMakeModel[];
  seller_type: string[];
  fuel_type_id: number[];
  state_id: number[];
  body_type_id: number[];
  transmission: number[];
  drive_type: number[];
  accident_vehicle: Array<string | number>;
  mfk_warranty: Array<string | number>;
  exterior_color: number[];
  interior_color: number[];
  energy_efficiency: string[];
  vehicle_condition: Array<string | number>;
  listing_age: Array<string | number>;
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
  engine_power: FilterNumericRange;
  cubic_capacity: FilterNumericRange;
  cylinders: FilterNumericRange;
  battery_capacity: FilterNumericRange;
  total_weight: FilterNumericRange;
  empty_weight: FilterNumericRange;
  towing_capacity: FilterNumericRange;
  wltp_range: FilterNumericRange;
  consumption: FilterNumericRange;
  co2_emission: FilterNumericRange;
  power_unit: 'PS' | 'KW';
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
  interiorColors: FilterOption[];
  interiorColorColumns: FilterOption[][];
  carState: FilterOption[];
  warrantyList: FilterOption[];
  accidentVehicleOptions: FilterOption[];
  energyEfficiencyOptions: FilterOption[];
  kilometersRangeAnalytics: any;
  priceRangeAnalytics: any;
  yearRangeAnalytics: any;
  seats: FilterOption[];
  doors: FilterOption[];
  sellerType: FilterOption[];
  cars: any[];
  totalCars: number;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
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
  interiorColors: [],
  interiorColorColumns: [],
  carState: [],
  warrantyList: [],
  accidentVehicleOptions: [],
  energyEfficiencyOptions: [],
  kilometersRangeAnalytics: DEFAULT_KM_ANALYTICS,
  priceRangeAnalytics: DEFAULT_PRICE_ANALYTICS,
  yearRangeAnalytics: DEFAULT_YEAR_ANALYTICS,
  seats: [],
  doors: [],
  sellerType: [],
  cars: [],
  totalCars: 0,
  currentPage: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 1
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
  private makeOptionsCache: MakeModelOption[] | null = null;
  private readonly modelOptionsCache = new Map<string, MakeModelOption[]>();

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

  loadMakeOptions(fallbackCars: any[] = []): Observable<MakeModelOption[]> {
    if (this.makeOptionsCache?.length) {
      return of(this.makeOptionsCache);
    }

    return this.commonService.getAllMakes().pipe(
      map((response: any) => {
        const options = this.normalizeMakeOptions(response);
        return options.length ? options : this.normalizeMakeOptionsFromCars(fallbackCars);
      }),
      tap((options) => {
        this.makeOptionsCache = options;
      }),
      catchError(() => {
        const options = this.normalizeMakeOptionsFromCars(fallbackCars);
        this.makeOptionsCache = options;
        return of(options);
      })
    );
  }

  loadModelsByMake(makeId: string | number): Observable<MakeModelOption[]> {
    const cacheKey = String(makeId);
    const cachedOptions = this.modelOptionsCache.get(cacheKey);
    if (cachedOptions) {
      return of(cachedOptions);
    }

    return this.commonService.getModelsByMake(makeId).pipe(
      map((response: any) => this.normalizeModelOptions(response)),
      tap((options) => {
        this.modelOptionsCache.set(cacheKey, options);
      }),
      catchError(() => {
        const options: MakeModelOption[] = [];
        this.modelOptionsCache.set(cacheKey, options);
        return of(options);
      })
    );
  }

  buildMakeModelSummary(selection: SelectedMakeModel[]): Array<{ brand: string; modals: string[] }> {
    return (selection || [])
      .filter((item) => item?.makeLabel)
      .map((item) => ({
        brand: item.makeLabel,
        modals: Array.from(
          new Set(
            (item.models || [])
              .map((model) => model?.modelLabel?.trim())
              .filter((model): model is string => !!model)
          )
        )
      }));
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
        const viewModel = this.mapResponseToViewModel(metadata?.data || {}, cars || null, normalizedPayload);
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

  private mapResponseToViewModel(metadataData: any, carsData: any = null, payload?: FilterPayload): FilterViewModel {
    const fuelData = this.pickFirstDefined(metadataData, [
      'fuel_type',
      'fuel',
      'fuel_types',
      'fuelTypeGroups',
      'fuel_groups'
    ]) ?? {};

    const colorsData = this.pickFirstDefined(metadataData, [
      'exterior_color',
      'colors',
      'car_colors',
      'color'
    ]) ?? [];

    const interiorColorsData = this.pickFirstDefined(metadataData, [
      'interior_color',
      'interior_colors',
      'interiorColor',
      'interiorColors'
    ]) ?? [];

    const yearRangeAnalytics = this.mapRangeAnalytics(
      this.pickFirstDefined(metadataData, ['year_range_analytics', 'yearRangeAnalytics', 'year_range']),
      DEFAULT_YEAR_ANALYTICS,
      'selected_model_years',
      'older_model_years',
      'newly_model_years',
      'total_cars_all_years'
    );

    const kilometersRangeAnalytics = this.mapRangeAnalytics(
      this.pickFirstDefined(metadataData, [
        'kilometers_range_analytics',
        'kilometersRangeAnalytics',
        'km_range_analytics',
        'kmRangeAnalytics',
        'kilometer_range'
      ]),
      DEFAULT_KM_ANALYTICS,
      'selected_mileage',
      'higher_mileage',
      'lower_mileage',
      'total_cars_all_mileage'
    );

    const priceRangeAnalytics = this.mapPriceAnalytics(
      this.pickFirstDefined(metadataData, ['price_range_analytics', 'priceRangeAnalytics', 'price_range'])
    );

    const mappedExteriorColors = this.mapFlexibleOptions(this.normalizeItems(colorsData), {
      labelKeys: ['name', 'code'],
      valueKeys: ['id', 'code', 'name'],
      extra: (item: any) => ({
        color: item?.hex_code ?? item?.hexCode ?? null
      })
    });

    const mappedInteriorColors = this.mapFlexibleOptions(this.normalizeItems(interiorColorsData), {
      labelKeys: ['name', 'code'],
      valueKeys: ['id', 'code', 'name'],
      extra: (item: any) => ({
        color: item?.hex_code ?? item?.hexCode ?? null
      })
    });

    const transmissions = this.mapFlexibleOptions(
      this.normalizeItems(this.pickFirstDefined(metadataData, ['transmission', 'transmissions'])),
      {
        labelKeys: ['name', 'code'],
        valueKeys: ['id', 'code', 'name']
      }
    );

    const bodyTypes = this.mapFlexibleOptions(
      this.normalizeItems(this.pickFirstDefined(metadataData, ['body_type', 'body_types', 'bodyTypes'])),
      {
        labelKeys: ['name', 'code'],
        valueKeys: ['id', 'code', 'name']
      }
    );

    const cars = this.extractCars(carsData);
    const totalCars = this.extractTotalCars(metadataData, carsData, cars);
    const pageSize = Number(carsData?.limit ?? carsData?.perPage ?? carsData?.pageSize ?? payload?.limit ?? 10);
    const currentPage = Number(carsData?.page ?? carsData?.currentPage ?? carsData?.current_page ?? payload?.page ?? 1);
    const totalPages = Math.max(
      1,
      Number(
        carsData?.totalPages ??
        carsData?.lastPage ??
        carsData?.last_page ??
        Math.ceil(totalCars / Math.max(pageSize, 1))
      ) || 1
    );

    return {
      raw: this.buildLegacyRawMetadata(metadataData, {
        yearRangeAnalytics,
        kilometersRangeAnalytics,
        priceRangeAnalytics,
        totalCars
      }),
      fuelTypeGroups: Array.isArray(fuelData)
        ? this.mapFuelArrayGroups(fuelData)
        : this.buildFuelTypeGroups(fuelData),
      transmissions,
      conditions: this.mapFlexibleOptions(
        this.normalizeItems(this.pickFirstDefined(metadataData, ['vehicle_condition', 'vehicle_conditions', 'conditions'])),
        {
          labelKeys: ['name', 'code'],
          valueKeys: ['id', 'code', 'name']
        }
      ),
      driveTypes: this.mapFlexibleOptions(
        this.normalizeItems(this.pickFirstDefined(metadataData, ['drive', 'drive_types', 'driveTypes'])),
        {
          labelKeys: ['name', 'code'],
          valueKeys: ['id', 'code', 'name']
        }
      ),
      bodyTypes,
      carColors: mappedExteriorColors,
      carColorColumns: this.splitIntoColumns(mappedExteriorColors, 3),
      interiorColors: mappedInteriorColors,
      interiorColorColumns: this.splitIntoColumns(mappedInteriorColors, 3),
      carState: this.mapFlexibleOptions(
        this.normalizeItems(this.pickFirstDefined(metadataData, ['vehicle_state', 'car_state', 'state'])),
        {
          labelKeys: ['name', 'code'],
          valueKeys: ['id', 'code', 'name']
        }
      ),
      warrantyList: this.mapFlexibleOptions(
        this.normalizeItems(this.pickFirstDefined(metadataData, ['mfk_warranty', 'warranty', 'warranty_list'])).slice().sort(
          (a: any, b: any) => Number(a?.id ?? 0) - Number(b?.id ?? 0)
        ),
        {
          labelKeys: ['name', 'code'],
          valueKeys: ['id', 'code', 'name']
        }
      ),
      accidentVehicleOptions: this.mapFlexibleOptions(
        this.normalizeItems(this.pickFirstDefined(metadataData, ['accident_vehicle'])),
        {
          labelKeys: ['name', 'code'],
          valueKeys: ['id', 'code', 'name']
        }
      ),
      energyEfficiencyOptions: this.mapFlexibleOptions(
        this.normalizeItems(this.pickFirstDefined(metadataData, ['energy_efficiency_raw', 'energy_efficiency', 'energyEfficiency'])),
        {
          labelKeys: ['grade', 'name', 'code'],
          valueKeys: ['grade', 'id', 'code', 'name']
        }
      ),
      kilometersRangeAnalytics,
      priceRangeAnalytics,
      yearRangeAnalytics,
      seats: this.mapFlexibleOptions(this.normalizeItems(metadataData?.seats ?? metadataData?.seat_range ?? {}), {
        labelKeys: ['name', 'code'],
        valueKeys: ['id', 'code', 'name']
      }),
      doors: this.mapFlexibleOptions(this.normalizeItems(metadataData?.doors ?? metadataData?.door_range ?? {}), {
        labelKeys: ['name', 'code'],
        valueKeys: ['id', 'code', 'name']
      }),
      sellerType: this.mapFlexibleOptions(
        this.normalizeItems(this.pickFirstDefined(metadataData, ['seller_type', 'sellerTypes'])),
        {
          labelKeys: ['seller_type', 'name', 'code'],
          valueKeys: ['seller_type', 'id', 'code', 'name']
        }
      ),
      cars,
      totalCars,
      currentPage,
      pageSize,
      totalItems: totalCars,
      totalPages
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
      page: 1,
      limit: 10,
      make_model_selection: [],
      seller_type: [],
      fuel_type_id: [],
      state_id: [],
      body_type_id: [],
      transmission: [],
      drive_type: [],
      accident_vehicle: [],
      mfk_warranty: [],
      exterior_color: [],
      interior_color: [],
      energy_efficiency: [],
      vehicle_condition: [],
      listing_age: [],
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
      engine_power: {
        min_value: null,
        max_value: null
      },
      cubic_capacity: {
        min_value: null,
        max_value: null
      },
      cylinders: {
        min_value: null,
        max_value: null
      },
      battery_capacity: {
        min_value: null,
        max_value: null
      },
      total_weight: {
        min_value: null,
        max_value: null
      },
      empty_weight: {
        min_value: null,
        max_value: null
      },
      towing_capacity: {
        min_value: null,
        max_value: null
      },
      wltp_range: {
        min_value: null,
        max_value: null
      },
      consumption: {
        min_value: null,
        max_value: null
      },
      co2_emission: {
        min_value: null,
        max_value: null
      },
      power_unit: 'PS',
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
      },
      engine_power: {
        ...current.engine_power,
        ...patch.engine_power
      },
      cubic_capacity: {
        ...current.cubic_capacity,
        ...patch.cubic_capacity
      },
      cylinders: {
        ...current.cylinders,
        ...patch.cylinders
      },
      battery_capacity: {
        ...current.battery_capacity,
        ...patch.battery_capacity
      },
      total_weight: {
        ...current.total_weight,
        ...patch.total_weight
      },
      empty_weight: {
        ...current.empty_weight,
        ...patch.empty_weight
      },
      towing_capacity: {
        ...current.towing_capacity,
        ...patch.towing_capacity
      },
      wltp_range: {
        ...current.wltp_range,
        ...patch.wltp_range
      },
      consumption: {
        ...current.consumption,
        ...patch.consumption
      },
      co2_emission: {
        ...current.co2_emission,
        ...patch.co2_emission
      }
    };
  }

  private extractCars(data: any): any[] {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    return [];
  }

  private extractTotalCars(metadataData: any, carsData?: any, cars: any[] = []): number {
    return Number(
      metadataData?.total_cars ??
      metadataData?.total_cars_found ??
      metadataData?.totalCars ??
      carsData?.total ??
      carsData?.total_cars ??
      carsData?.totalCars ??
      carsData?.matching_vehicles ??
      cars.length ??
      0
    );
  }

  private buildFiltersQuery(payload: FilterPayload): string {
    const defaults = this.createDefaultPayload();
    const params = new URLSearchParams();
    const makeModelData = this.buildMakeModelRequestData(payload.make_model_selection);

    this.setIfValue(params, 'lang', payload.lang || defaults.lang);

    if (this.hasRangeChanged(payload.kilometers_range, defaults.kilometers_range)) {
      this.setIfValue(params, 'from_km', payload.kilometers_range.min_km);
      this.setIfValue(params, 'to_km', payload.kilometers_range.max_km);
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
      this.setIfValue(params, 'seat_from', payload.seat_range.min_seat);
      this.setIfValue(params, 'seat_to', payload.seat_range.max_seat);
    }

    if (this.hasRangeChanged(payload.door_range, defaults.door_range)) {
      this.setIfValue(params, 'door_from', payload.door_range.min_door);
      this.setIfValue(params, 'door_to', payload.door_range.max_door);
    }

    this.setRangeQueryParams(params, 'power_from', 'power_to', payload.engine_power, defaults.engine_power);
    if (this.hasNumericFacetRangeChanged(payload.engine_power, defaults.engine_power)) {
      this.setIfValue(params, 'power_unit', payload.power_unit || defaults.power_unit);
    }

    this.setRangeQueryParams(
      params,
      'cubic_capacity_from',
      'cubic_capacity_to',
      payload.cubic_capacity,
      defaults.cubic_capacity
    );
    this.setRangeQueryParams(params, 'cylinders_from', 'cylinders_to', payload.cylinders, defaults.cylinders);
    this.setRangeQueryParams(
      params,
      'battery_capacity_from',
      'battery_capacity_to',
      payload.battery_capacity,
      defaults.battery_capacity
    );
    this.setRangeQueryParams(
      params,
      'total_weight_from',
      'total_weight_to',
      payload.total_weight,
      defaults.total_weight
    );
    this.setRangeQueryParams(
      params,
      'empty_weight_from',
      'empty_weight_to',
      payload.empty_weight,
      defaults.empty_weight
    );
    this.setRangeQueryParams(params, 'towing_from', 'towing_to', payload.towing_capacity, defaults.towing_capacity);
    this.setRangeQueryParams(params, 'wltp_range_from', 'wltp_range_to', payload.wltp_range, defaults.wltp_range);
    this.setRangeQueryParams(
      params,
      'consumption_from',
      'consumption_to',
      payload.consumption,
      defaults.consumption
    );
    this.setRangeQueryParams(params, 'co2_from', 'co2_to', payload.co2_emission, defaults.co2_emission);

    this.setIfValue(params, 'sellerType', payload.seller_type);
    this.setIfValue(params, 'brandName', makeModelData.makeLabels);
    this.setIfValue(params, 'carModel', makeModelData.modelLabels);
    this.setIfValue(params, 'state_ids', payload.state_id);
    this.setIfValue(params, 'body_type', payload.body_type_id);
    this.setIfValue(params, 'fuelType', payload.fuel_type_id);
    this.setIfValue(params, 'transmission', payload.transmission);
    this.setIfValue(params, 'drive_type', payload.drive_type);
    this.setIfValue(params, 'vehicle_accident_status_id', payload.accident_vehicle);
    this.setIfValue(params, 'mfk_warrenty_id', payload.mfk_warranty);
    this.setIfValue(params, 'interior_color_id', payload.interior_color);
    this.setIfValue(params, 'exterior_color_id', payload.exterior_color);
    this.setIfValue(params, 'carCondition', payload.vehicle_condition);
    this.setIfValue(params, 'energy_efficiency', payload.energy_efficiency);
    this.setIfValue(params, 'listing_age', payload.listing_age);

    const query = params.toString();
    return query ? `?${query}` : '';
  }

  private buildFacetedPayload(payload: FilterPayload): Record<string, any> {
    const defaults = this.createDefaultPayload();
    const makeModelData = this.buildMakeModelRequestData(payload.make_model_selection);
    const compactPayload: Record<string, any> = {
      lang: payload.lang || defaults.lang,
      page: payload.page || defaults.page,
      limit: payload.limit || defaults.limit
    };

    if (makeModelData.makeLabels.length > 0) {
      compactPayload['brandName'] = makeModelData.makeLabels;
    }

    if (makeModelData.modelLabels.length > 0) {
      compactPayload['carModel'] = makeModelData.modelLabels;
    }

    if (payload.seller_type.length > 0) {
      compactPayload['seller_types'] = payload.seller_type;
    }

    if (payload.fuel_type_id.length > 0) {
      compactPayload['fuel_type_ids'] = payload.fuel_type_id;
    }

    if (payload.state_id.length > 0) {
      compactPayload['state_ids'] = payload.state_id;
    }

    if (payload.body_type_id.length > 0) {
      compactPayload['body_type_ids'] = payload.body_type_id;
    }

    if (payload.transmission.length > 0) {
      compactPayload['transmission_ids'] = payload.transmission;
    }

    if (payload.drive_type.length > 0) {
      compactPayload['drive_ids'] = payload.drive_type;
    }

    if (payload.accident_vehicle.length > 0) {
      compactPayload['accident_vehicle'] = payload.accident_vehicle;
    }

    if (payload.mfk_warranty.length > 0) {
      compactPayload['mfk_warranty'] = payload.mfk_warranty;
    }

    if (payload.exterior_color.length > 0) {
      compactPayload['exterior_color_ids'] = payload.exterior_color;
    }

    if (payload.interior_color.length > 0) {
      compactPayload['interior_color_ids'] = payload.interior_color;
    }

    if (payload.energy_efficiency.length > 0) {
      compactPayload['energy_efficiency_codes'] = payload.energy_efficiency;
    }

    if (payload.vehicle_condition.length > 0) {
      compactPayload['vehicle_condition'] = payload.vehicle_condition;
    }

    if (payload.listing_age.length > 0) {
      compactPayload['listing_age'] = payload.listing_age;
    }

    if (this.hasRangeChanged(payload.year_range, defaults.year_range)) {
      compactPayload['year'] = {
        min: payload.year_range.min_year,
        max: payload.year_range.max_year
      };
    }

    if (this.hasRangeChanged(payload.kilometers_range, defaults.kilometers_range)) {
      compactPayload['mileage'] = {
        min: payload.kilometers_range.min_km,
        max: payload.kilometers_range.max_km
      };
    }

    if (this.hasRangeChanged(payload.price_range, defaults.price_range)) {
      compactPayload['price'] = {
        min: payload.price_range.min_price,
        max: payload.price_range.max_price,
        type: (payload.price_type || defaults.price_type).toLowerCase()
      };
    }

    if (this.hasRangeChanged(payload.seat_range, defaults.seat_range)) {
      compactPayload['seat'] = {
        min: payload.seat_range.min_seat,
        max: payload.seat_range.max_seat
      };
    }

    if (this.hasRangeChanged(payload.door_range, defaults.door_range)) {
      compactPayload['door'] = {
        min: payload.door_range.min_door,
        max: payload.door_range.max_door
      };
    }

    if (this.hasNumericFacetRangeChanged(payload.engine_power, defaults.engine_power)) {
      compactPayload['powerOutput'] = {
        min_po: payload.engine_power.min_value,
        max_po: payload.engine_power.max_value,
        unit: payload.power_unit || defaults.power_unit
      };
    }
    this.assignNumericRangePayload(compactPayload, 'cubic_capacity', payload.cubic_capacity, defaults.cubic_capacity, 'min', 'max');
    this.assignNumericRangePayload(compactPayload, 'cylinders', payload.cylinders, defaults.cylinders, 'min', 'max');
    this.assignNumericRangePayload(compactPayload, 'battery_capacity', payload.battery_capacity, defaults.battery_capacity, 'min', 'max');
    this.assignNumericRangePayload(compactPayload, 'total_weight', payload.total_weight, defaults.total_weight, 'min', 'max');
    this.assignNumericRangePayload(compactPayload, 'empty_weight', payload.empty_weight, defaults.empty_weight, 'min', 'max');
    this.assignNumericRangePayload(compactPayload, 'towing_capacity', payload.towing_capacity, defaults.towing_capacity, 'min', 'max');
    this.assignNumericRangePayload(compactPayload, 'wltp_range', payload.wltp_range, defaults.wltp_range, 'min', 'max');
    this.assignNumericRangePayload(compactPayload, 'consumption', payload.consumption, defaults.consumption, 'min', 'max');
    this.assignNumericRangePayload(compactPayload, 'co2_emission', payload.co2_emission, defaults.co2_emission, 'min', 'max');

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
      this.hasNumericFacetRangeChanged(payload.engine_power, defaults.engine_power) ||
      this.hasNumericFacetRangeChanged(payload.cubic_capacity, defaults.cubic_capacity) ||
      this.hasNumericFacetRangeChanged(payload.cylinders, defaults.cylinders) ||
      this.hasNumericFacetRangeChanged(payload.battery_capacity, defaults.battery_capacity) ||
      this.hasNumericFacetRangeChanged(payload.total_weight, defaults.total_weight) ||
      this.hasNumericFacetRangeChanged(payload.empty_weight, defaults.empty_weight) ||
      this.hasNumericFacetRangeChanged(payload.towing_capacity, defaults.towing_capacity) ||
      this.hasNumericFacetRangeChanged(payload.wltp_range, defaults.wltp_range) ||
      this.hasNumericFacetRangeChanged(payload.consumption, defaults.consumption) ||
      this.hasNumericFacetRangeChanged(payload.co2_emission, defaults.co2_emission) ||
      payload.make_model_selection.length > 0 ||
      payload.price_type !== defaults.price_type ||
      payload.seller_type.length > 0 ||
      payload.fuel_type_id.length > 0 ||
      payload.state_id.length > 0 ||
      payload.body_type_id.length > 0 ||
      payload.transmission.length > 0 ||
      payload.drive_type.length > 0 ||
      payload.accident_vehicle.length > 0 ||
      payload.mfk_warranty.length > 0 ||
      payload.exterior_color.length > 0 ||
      payload.interior_color.length > 0 ||
      payload.energy_efficiency.length > 0 ||
      payload.vehicle_condition.length > 0 ||
      payload.listing_age.length > 0
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

  private mapFlexibleOptions(
    items: any[],
    config: {
      labelKeys: string[];
      valueKeys: string[];
      extra?: (item: any) => Partial<FilterOption>;
    }
  ): FilterOption[] {
    return (items || [])
      .map((item) => {
        if (item === null || item === undefined || item === '') {
          return null;
        }

        if (typeof item !== 'object') {
          return {
            label: String(item).trim(),
            value: item
          } as FilterOption;
        }

        const value = this.pickFirst(item, config.valueKeys);
        const label = this.pickFirst(item, config.labelKeys) ?? value;

        if (value === null || value === undefined || value === '') {
          return null;
        }

        return {
          label: String(label ?? '').trim(),
          value,
          image: item?.image,
          ...(this.toCount(item) !== undefined ? { count: this.toCount(item) } : {}),
          ...(config.extra ? config.extra(item) : {})
        } as FilterOption;
      })
      .filter((item): item is FilterOption => !!item && !!item.label);
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
        label: item?.label ?? item?.name ?? item?.code ?? '',
        value: item?.id ?? item?.code ?? item?.name,
        count: this.toCount(item)
      }))
    }));
  }

  private mapRangeAnalytics(
    source: any,
    fallback: any,
    selectedLegacyKey: string,
    highLegacyKey: string,
    lowLegacyKey: string,
    totalLegacyKey: string
  ): any {
    const totalAll = Number(
      source?.total_cars_all ??
      source?.total_cars_all_years ??
      source?.total_cars_all_mileage ??
      source?.total_cars_found ??
      fallback?.[totalLegacyKey] ??
      0
    );

    const selectedCount = Number(
      source?.selected_range?.total_cars ??
      source?.selected_range?.count ??
      source?.[selectedLegacyKey] ??
      0
    );

    const highCount = Number(
      source?.breakdown?.older_models?.count ??
      source?.breakdown?.higher_mileage?.count ??
      source?.[highLegacyKey] ??
      0
    );

    const lowCount = Number(
      source?.breakdown?.newer_models?.count ??
      source?.breakdown?.lower_mileage?.count ??
      source?.[lowLegacyKey] ??
      0
    );

    return {
      ...fallback,
      ...(source || {}),
      [totalLegacyKey]: totalAll,
      selected_range: {
        ...(fallback?.selected_range || {}),
        ...(source?.selected_range || {}),
        total_cars: selectedCount
      },
      [selectedLegacyKey]: selectedCount,
      breakdown: {
        ...(fallback?.breakdown || {}),
        ...(source?.breakdown || {})
      },
      [highLegacyKey]: highCount,
      [lowLegacyKey]: lowCount,
      total_cars_all: totalAll,
      total_cars_found: Number(source?.total_cars_found ?? totalAll)
    };
  }

  private mapPriceAnalytics(source: any): any {
    const matchingVehicles = Number(
      source?.matching_vehicles ??
      source?.selected_range?.total_cars ??
      source?.total_cars_found ??
      0
    );

    return {
      ...DEFAULT_PRICE_ANALYTICS,
      ...(source || {}),
      matching_vehicles: matchingVehicles
    };
  }

  private buildLegacyRawMetadata(
    metadataData: any,
    context: {
      yearRangeAnalytics: any;
      kilometersRangeAnalytics: any;
      priceRangeAnalytics: any;
      totalCars: number;
    }
  ): any {
    return {
      ...(metadataData || {}),
      total_cars: Number(metadataData?.total_cars ?? metadataData?.total_cars_found ?? context.totalCars ?? 0),
      year_range: {
        ...(metadataData?.year_range || {}),
        selected_model_years: context.yearRangeAnalytics?.selected_model_years ?? 0,
        older_model_years: context.yearRangeAnalytics?.older_model_years ?? 0,
        newly_model_years: context.yearRangeAnalytics?.newly_model_years ?? 0,
        total_cars_found: context.yearRangeAnalytics?.total_cars_found ?? context.yearRangeAnalytics?.total_cars_all ?? 0
      },
      kilometer_range: {
        ...(metadataData?.kilometer_range || metadataData?.kilometers_range || {}),
        selected_mileage: context.kilometersRangeAnalytics?.selected_mileage ?? 0,
        higher_mileage: context.kilometersRangeAnalytics?.higher_mileage ?? 0,
        lower_mileage: context.kilometersRangeAnalytics?.lower_mileage ?? 0,
        total_cars_found:
          context.kilometersRangeAnalytics?.total_cars_found ?? context.kilometersRangeAnalytics?.total_cars_all ?? 0
      },
      price_range: {
        ...(metadataData?.price_range || {}),
        matching_vehicles: context.priceRangeAnalytics?.matching_vehicles ?? 0
      }
    };
  }

  private splitIntoColumns(items: FilterOption[], columnCount: number): FilterOption[][] {
    const columns: FilterOption[][] = Array.from({ length: columnCount }, () => []);
    items.forEach((item, index) => {
      columns[index % columnCount].push(item);
    });
    return columns;
  }

  private setRangeQueryParams(
    params: URLSearchParams,
    fromKey: string,
    toKey: string,
    value: FilterNumericRange,
    defaults: FilterNumericRange
  ): void {
    if (!this.hasNumericFacetRangeChanged(value, defaults)) {
      return;
    }

    this.setIfValue(params, fromKey, value.min_value);
    this.setIfValue(params, toKey, value.max_value);
  }

  private assignNumericRangePayload(
    target: Record<string, any>,
    key: string,
    value: FilterNumericRange,
    defaults: FilterNumericRange,
    minKey = 'min_value',
    maxKey = 'max_value',
    extras?: Record<string, any>
  ): void {
    if (!this.hasNumericFacetRangeChanged(value, defaults)) {
      return;
    }

    target[key] = {
      [minKey]: value.min_value,
      [maxKey]: value.max_value,
      ...(extras || {})
    };
  }

  private hasNumericFacetRangeChanged(current: FilterNumericRange, initial: FilterNumericRange): boolean {
    return current?.min_value !== initial?.min_value || current?.max_value !== initial?.max_value;
  }

  private normalizeMakeOptions(payload: any): MakeModelOption[] {
    const source = this.extractArray(payload, ['data', 'makes', 'brands', 'results', 'items']);
    const optionMap = new Map<string, MakeModelOption>();

    source.forEach((item: any, index: number) => {
      const value = this.pickFirst(item, ['make_id', 'brand_id', 'id', 'value']) ?? index;
      const label = this.pickFirst(item, ['make_display', 'brand_name', 'make', 'brand', 'name', 'label', 'title']);

      if (!label) {
        return;
      }

      const key = String(value ?? this.normalizeText(label));
      if (!optionMap.has(key)) {
        optionMap.set(key, {
          label: String(label),
          value,
          count: this.toCount(item),
          raw: item
        });
      }
    });

    return Array.from(optionMap.values()).sort((left, right) => left.label.localeCompare(right.label));
  }

  private normalizeModelOptions(payload: any): MakeModelOption[] {
    const source = this.extractArray(payload, ['data', 'models', 'results', 'items']);
    const optionMap = new Map<string, MakeModelOption>();

    source.forEach((item: any, index: number) => {
      const value = this.pickFirst(item, ['model_id', 'id', 'value']) ?? index;
      const label = this.pickFirst(item, ['model_name', 'model', 'name', 'label', 'title']);

      if (!label) {
        return;
      }

      const key = String(value ?? this.normalizeText(label));
      if (!optionMap.has(key)) {
        optionMap.set(key, {
          label: String(label),
          value,
          count: this.toCount(item),
          raw: item
        });
      }
    });

    return Array.from(optionMap.values()).sort((left, right) => left.label.localeCompare(right.label));
  }

  private normalizeMakeOptionsFromCars(cars: any[]): MakeModelOption[] {
    const optionMap = new Map<string, MakeModelOption>();

    (cars || []).forEach((car: any, index: number) => {
      const label = this.pickFirst(car, ['brandName', 'brand_name', 'brand', 'make_display', 'make']);
      const value = this.pickFirst(car, ['make_id', 'brand_id', 'id']) ?? label ?? index;

      if (!label) {
        return;
      }

      const key = String(value ?? this.normalizeText(label));
      if (!optionMap.has(key)) {
        optionMap.set(key, {
          label: String(label),
          value
        });
      }
    });

    return Array.from(optionMap.values()).sort((left, right) => left.label.localeCompare(right.label));
  }

  private buildMakeModelRequestData(selection: SelectedMakeModel[]) {
    const normalizedSelection = (selection || [])
      .filter((item) => item?.makeId !== null && item?.makeId !== undefined && item?.makeLabel)
      .map((item) => ({
        make_id: item.makeId,
        make: item.makeLabel,
        models_data: Array.from(
          new Map(
            (item.models || [])
              .filter((model) => model?.modelId !== null && model?.modelId !== undefined && model?.modelLabel)
              .map((model) => [
                String(model.modelId),
                {
                  model_id: model.modelId,
                  model: model.modelLabel.trim()
                }
              ])
          ).values()
        ),
        models: Array.from(
          new Set(
            (item.models || [])
              .map((model) => model?.modelLabel?.trim())
              .filter((label): label is string => !!label)
          )
        )
      }));

    return {
      selection: normalizedSelection,
      makeLabels: Array.from(
        new Set(
          normalizedSelection
            .map((item) => item.make)
            .filter((label): label is string => !!label)
        )
      ),
      modelLabels: Array.from(
        new Set(
          normalizedSelection.flatMap((item) => item.models || [])
        )
      )
    };
  }

  private extractArray(payload: any, preferredKeys: string[] = []): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    for (const key of preferredKeys) {
      if (Array.isArray(payload?.[key])) {
        return payload[key];
      }
    }

    const nestedCandidates = [payload?.data, payload?.results, payload?.items];
    for (const candidate of nestedCandidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }

      for (const key of preferredKeys) {
        if (Array.isArray(candidate?.[key])) {
          return candidate[key];
        }
      }

      if (Array.isArray(candidate?.data)) {
        return candidate.data;
      }
    }

    return [];
  }

  private pickFirstDefined(source: any, keys: string[]): any {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== null && value !== undefined) {
        return value;
      }
    }

    return null;
  }

  private pickFirst(item: any, keys: string[]): any {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== null && value !== undefined && value !== '') {
        return value;
      }
    }

    return null;
  }

  private normalizeText(value: any): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private toCount(item: any): number | undefined {
    const value = item?.count ?? item?.total_cars ?? item?.total;
    return value === null || value === undefined || value === '' ? undefined : Number(value);
  }
}
