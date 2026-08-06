import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../services/common.service';
import { CommonModule } from '@angular/common';
declare var Swiper: any;

@Component({
  selector: 'app-seller-detail',
  imports: [TranslateModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './seller-detail.component.html',
  styleUrl: './seller-detail.component.css'
})
export class SellerDetailComponent implements OnInit, OnDestroy {
  sellerId!: number;
  sellerDetails: any;
  loading: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private service: CommonService
  ) { }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.sellerId = params['id'];
      if (this.sellerId) {
        this.getSellerDetails();
      }
    });
  }

  getSellerDetails() {
    this.loading = true;
    const params = {
      // brandName: JSON.stringify(["Audi", "Jaguar"]),
      // body_type_id: JSON.stringify([2]),
      // search: 'A8',
      // minPrice: 100,
      // maxPrice: 300
    };

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
}
