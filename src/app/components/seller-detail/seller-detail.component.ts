import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { CommonService } from '../../services/common.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterService, MakeModelOption } from '../../services/filter.service';
declare var Swiper: any;

@Component({
  selector: 'app-seller-detail',
  imports: [TranslateModule, CommonModule, FormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './seller-detail.component.html',
  styleUrl: './seller-detail.component.css'
})
export class SellerDetailComponent implements OnInit, OnDestroy {
  sellerId!: number;
  sellerDetails: any;
  loading: boolean = false;

  isLoadingFilters: boolean = false;
  makeOptions: MakeModelOption[] = [];
  bodyTypes: any[] = [];
  filters = {
    brandName: [] as string[],
    body_type_id: [] as number[],
    search: '',
    minPrice: null as number | null,
    maxPrice: null as number | null
  };

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: CommonService,
    private filterService: FilterService
  ) { }

  ngOnInit() {
    this.loadFilterOptions();

    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchValue => {
      this.filters.search = searchValue;
      this.applyFilters();
    });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.sellerId = params['id'];
      if (this.sellerId) {
        this.getSellerDetails();
      }
    });
  }

  getSellerDetails() {
    this.loading = true;
    const params: any = {};
    if (this.filters.brandName.length) params.brandName = JSON.stringify(this.filters.brandName);
    if (this.filters.body_type_id.length) params.body_type_id = JSON.stringify(this.filters.body_type_id);
    if (this.filters.search) params.search = this.filters.search;
    if (this.filters.minPrice !== null) params.minPrice = this.filters.minPrice;
    if (this.filters.maxPrice !== null) params.maxPrice = this.filters.maxPrice;

    this.service.fetchSellerById(this.sellerId, params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          console.log('Fetch Seller By ID Response:', res);
          this.sellerDetails = res.data;
          this.loading = false;
          if (this.sellerDetails?.cars?.length) {
            setTimeout(() => this.loadSwiper());
          }
        },
        error: (err) => {
          console.error('Failed to fetch seller details:', err);
          this.loading = false;
        }
      });
  }

  private loadFilterOptions(): void {
    this.isLoadingFilters = true;

    this.filterService.loadMakeOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options) => {
          this.makeOptions = options;
        },
        error: () => {
          this.makeOptions = [];
        }
      });

    this.service.get('user/body-type')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.bodyTypes = (res?.data?.types || []).map((item: any) => ({
            id: item?.id,
            name: item?.name || item?.code || '',
            image: item?.image || '',
            count: item?.count || 0
          })).filter((item: any) => item.id !== null && item.id !== undefined && item.name);
          this.isLoadingFilters = false;
        },
        error: () => {
          this.bodyTypes = [];
          this.isLoadingFilters = false;
        }
      });
  }

  isMakeSelected(value: string | number): boolean {
    return this.filters.brandName.includes(String(value));
  }

  onMakeToggle(make: MakeModelOption, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const makeVal = String(make.value);
    if (isChecked) {
      if (!this.filters.brandName.includes(makeVal)) {
        this.filters.brandName.push(makeVal);
      }
    } else {
      this.filters.brandName = this.filters.brandName.filter(val => val !== makeVal);
    }
  }

  isBodyTypeSelected(id: any): boolean {
    return this.filters.body_type_id.includes(Number(id));
  }

  onBodyTypeToggle(bodyType: any, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const typeId = Number(bodyType.id);
    if (isChecked) {
      if (!this.filters.body_type_id.includes(typeId)) {
        this.filters.body_type_id.push(typeId);
      }
    } else {
      this.filters.body_type_id = this.filters.body_type_id.filter(val => val !== typeId);
    }
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  applyFilters(): void {
    this.getSellerDetails();
  }

  resetFilters(): void {
    this.filters = {
      brandName: [],
      body_type_id: [],
      search: '',
      minPrice: null,
      maxPrice: null
    };
    this.getSellerDetails();
  }

  getFormattedUrl(url: string | null): string {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return 'https://' + url;
  }

  private loadSwiper(): void {
    this.sellerDetails?.cars?.forEach((_: any, i: number) => {
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToCarDetail(carId: string | number) {
    this.router.navigate(['/car-detail'], { queryParams: { id: carId } });
  }

  handleCarDetailKeydown(event: KeyboardEvent, carId: string | number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.goToCarDetail(carId);
    }
  }
}
