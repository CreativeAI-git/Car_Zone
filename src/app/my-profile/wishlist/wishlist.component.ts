import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../services/common.service';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader.service';
import { ChfFormatPipe } from '../../pipes/chf-format.pipe';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, CommonModule, ChfFormatPipe, TranslateModule],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.css'
})
export class WishlistComponent {
  private destroy$ = new Subject<void>();
  wishList: any
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
    },
      err => {
        this.loader.hide()
      })
  }

  removeFromWishlist(item: any) {
    item.isWishlist = !item.isWishlist
    this.service.delete('user/removeCarFromWishlist', { carId: item.carId }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.wishList.splice(this.wishList.indexOf(item), 1)
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
