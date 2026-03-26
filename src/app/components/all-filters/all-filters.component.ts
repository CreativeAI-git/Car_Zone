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
      .subscribe(() => this.getPriceRangeAnalytics());

    this.kmRangeChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.getKilometersRange());

    this.seatRangeChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.getCarSeats());

    this.doorRangeChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.getCarDoors());
  }

  getFiltersData() {
    this.getKilometersRange();
    this.getPriceRangeAnalytics();
    this.getYearRangeAnalytics();
    this.getFuelTypes();
    this.getTransmissions();
    this.getDriveTypes();
    this.getBodyTypes();
    this.getVhicleConditions();
    this.getCarState();
    this.getWarrantyList();
    this.getCarColors();
    this.getEnergyEfficiency();
    this.getCarSeats();
    this.getCarDoors();
  }

  getKilometersRange() {
    const [fromKm, toKm] = this.kmRange || [];
    const query = `from_km=${fromKm}&to_km=${toKm}`;
    this.service.get(`user/kilometers-range-analytics?${query}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.kilometersRangeAnalytics = res?.data || {};
      },
      error: (error) => {
        console.error('Error fetching kilometers range:', error);
      }
    });
  }

  onKmRangeChange() {
    this.kmRangeChange$.next();
  }

  getPriceRangeAnalytics() {
    const [priceFrom, priceTo] = this.priceRange || [];
    const query = `car_price_from=${priceFrom}&car_price_to=${priceTo}`;
    this.service.get(`user/price-range-analytics?${query}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.priceRangeAnalytics = res?.data || {};
      },
      error: (error) => {
        console.error('Error fetching price range analytics:', error);
      }
    });
  }

  onPriceTypeChange() {
    this.getPriceRangeAnalytics();
  }

  onPriceRangeChange() {
    this.priceRangeChange$.next();
  }

  getYearRangeAnalytics() {
    const [fromYear, toYear] = this.yearRange || [];
    const query = `from_year=${fromYear}&to_year=${toYear}`;
    this.service.get(`user/year-range-analytics?${query}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.yearRangeAnalytics = res?.data || {};
      },
      error: (error) => {
        console.error('Error fetching year range analytics:', error);
      }
    });
  }

  onYearRangeChange() {
    this.getYearRangeAnalytics();
  }

  getFuelTypes() {
    this.service.get(`user/fuel?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const data = res?.data || {};
        this.fuelTypeGroups = this.buildFuelTypeGroups(data);
      },
      error: (error) => {
        console.error('Error fetching fuel types:', error);
      }
    });
  }


  getTransmissions() {
    this.service.get(`user/transmission?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const items = res?.data?.types || [];
        this.transmissions = this.mapOptions(items, 'label', 'id');
      },
      error: (error) => {
        console.error('Error fetching transmissions:', error);
      }
    });
  }

  getDriveTypes() {
    this.service.get(`user/drive?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const items = res?.data?.types || [];
        this.driveTypes = this.mapOptions(items, 'label', 'id');
      },
      error: (error) => {
        console.error('Error fetching drive types:', error);
      }
    });
  }

  getBodyTypes() {
    this.service.get(`user/body-type?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const items = res?.data?.types || [];
        this.bodyTypes = this.mapOptions(items, 'label', 'id');
      },
      error: (error) => {
        console.error('Error fetching body types:', error);
      }
    });
  }

  getVhicleConditions() {
    this.service.get(`user/vehicle-conditions?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const items = res?.data || [];
        this.conditions = this.mapOptions(items, 'name', 'id');
      },
      error: (error) => {
        console.error('Error fetching vehicle conditions:', error);
      }
    });
  }

  getCarState() {
    this.service.get(`user/vichel-state?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const items = res?.data?.types || [];
        this.carState = this.mapOptions(items, 'label', 'id');
      },
      error: (error) => {
        console.error('Error fetching car state:', error);
      }
    });
  }

  getWarrantyList() {
    this.service.get(`user/warranty?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const items = (res?.data || []).sort((a: { id: number; }, b: { id: number; }) => a.id - b.id);
        this.warrantyList = this.mapOptions(items, 'name', 'id');
      },
      error: (error) => {
        console.error('Error fetching warranty list:', error);
      }
    });
  }


  getCarColors() {
    this.service.get(`user/colors?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const items = res?.data || [];
        this.carColors = this.mapOptions(items, 'name', 'id', (item: any) => ({
          color: item.hex_code
        }));
        this.carColorColumns = this.splitIntoColumns(this.carColors, 3);
      },
      error: (error) => {
        console.error('Error fetching car colors:', error);
      }
    });
  }

  getEnergyEfficiency() {
    this.service.get(`user/energy-efficiency?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const items = res?.data?.types || [];
        this.energyEfficiencyOptions = this.mapOptions(items, 'label', 'label');
      },
      error: (error) => {
        console.error('Error fetching energy efficiency options:', error);
      }
    });
  }

  getCarSeats() {
    const [min, max] = this.seatRange || [];
    const query = `min=${min}&max=${max}`;
    this.service.get(`user/seat?${query}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const items = res?.data?.types || [];
        this.seats = this.mapOptions(items, 'label', 'id');
      },
      error: (error) => {
        console.error('Error fetching car seats:', error);
      }
    });
  }

  onSeatRangeChange() {
    this.seatRangeChange$.next();
  }

  getCarDoors() {
    const [min, max] = this.doorRange || [];
    const query = `min=${min}&max=${max}`;
    this.service.get(`user/door?${query}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const items = res?.data?.types || [];
        this.doors = this.mapOptions(items, 'label', 'id');
      },
      error: (error) => {
        console.error('Error fetching car doors:', error);
      }
    });
  }

  onDoorRangeChange() {
    this.doorRangeChange$.next();
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
      ...(item?.count !== undefined || item?.total_cars !== undefined
        ? { count: item?.count ?? item?.total_cars }
        : {}),
      ...(extra ? extra(item) : {})
    }));
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
