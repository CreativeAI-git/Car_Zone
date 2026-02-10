import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../services/common.service';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader.service';
import { ChfFormatPipe } from '../../pipes/chf-format.pipe';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzImageModule } from 'ng-zorro-antd/image';
declare var Swiper: any;
@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, CommonModule, ChfFormatPipe, TranslateModule, NzImageModule],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.css'
})
export class WishlistComponent {
  private destroy$ = new Subject<void>();
  wishList: any
  loaded: boolean = false;
  constructor(private service: CommonService, private loader: LoaderService, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en')
  }

  ngOnInit(): void {
    this.getWishList()
  }

  getWishList() {
    this.loader.show()
    this.service.get('user/fetchUserWishlist').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.wishList = res.data
      this.loader.hide()
      this.loaded = true;
      setTimeout(() => {
        this.loadSwiper()
      });
    },
      err => {
        this.loader.hide()
      })
  }

  loadSwiper(): void {
    this.wishList.forEach((_: any, i: any) => {
      const thumbs = new Swiper(`.mySwiperThumbs-${i}`, {
        slidesPerView: 6,
        spaceBetween: 10,
        watchSlidesProgress: true,
      });

      new Swiper(`.mySwiperMain-${i}`, {
        slidesPerView: 1,
        spaceBetween: 10,
        pagination: {
          el: ".swiper-pagination",
          type: "fraction",
        },
        thumbs: {
          swiper: thumbs
        }
      });
    });
  }

  removeFromWishlist(item: any) {
    item.isWishlist = !item.isWishlist
    this.service.delete('user/removeCarFromWishlist', { carId: item.carId }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.wishList.splice(this.wishList.indexOf(item), 1)
    })
  }


  trackByImage(index: number, img: string) {
    return img;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
