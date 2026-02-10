import { Component, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RoleDirective } from '../../directives/role.directive';
import { CommonService } from '../../services/common.service';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LoaderService } from '../../services/loader.service';
import { AuthService } from '../../services/auth.service';
import { ChfFormatPipe } from '../../pipes/chf-format.pipe';
import { RoleService } from '../../services/role.service';
import { ModalService } from '../../services/modal.service';
import { NzImage, NzImageService } from 'ng-zorro-antd/image';
declare var Swiper: any;
@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule, RoleDirective, TranslateModule, ChfFormatPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  providers: [NzImageService],
})
export class HomeComponent {
  userData: any
  private destroy$ = new Subject<void>();
  carsList: any[] = []
  token: any;
  constructor(private commonService: CommonService, private router: Router, private translate: TranslateService, private loader: LoaderService, private authService: AuthService, private roleService: RoleService, public modal: ModalService, private nzImageService: NzImageService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    effect(() => {
      this.userData = this.commonService.userData
      this.roleService.getLoggedInRole()
      if (this.roleService.getLoggedInRole() === 'buyer') {
        this.getCars();
      }
    })
  }

  ngOnInit(): void {
    this.token = this.authService.getToken();
  }

  listCar() {
    if (this.userData().slotAvailable) {
      this.router.navigate(['/list-your-car'])
    } else {
      this.router.navigate(['/choose-listing-plan'])
    }
  }

  loadSwipers(): void {
    new Swiper('.mySwiper', {
      direction: 'horizontal',
      slidesPerView: 6,
      spaceBetween: 10,
      loop: true,
      autoplay: {
        delay: 2000,
        disableOnInteraction: false
      },
      mousewheel: false,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      breakpoints: {
        640: {
          slidesPerView: 3,
        },
        768: {
          slidesPerView: 5,
        },
        1024: {
          slidesPerView: 6,
        },
      },
    });

    new Swiper('.CarSwiper', {
      direction: 'horizontal',
      slidesPerView: 3,
      spaceBetween: 10,
      loop: true,
      mousewheel: false,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      breakpoints: {
        640: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 2,
        },
        1024: {
          slidesPerView: 3,
        },
      },
    });

  }

  isLoading = false;
  getCars() {
    this.loader.show()
    this.commonService.get(this.token ? 'user/fetchOtherSellerCarsList' : 'user/asGuestUserFetchSellerCarsList').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.carsList = res.data
      this.loadSwipers()
      setTimeout(() => {
        this.loadSwiper()
      }, 100);
      this.loader.hide()
    }, err => {
      this.loader.hide()
    })
  }

  addToWishlist(item: any) {
    item.isWishlist = !item.isWishlist;
    this.commonService.post('user/addToWishlist', { carId: item.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          // success response
        },
        error: (err) => {
          console.error('Wishlist API failed:', err);
          item.isWishlist = !item.isWishlist;
          this.modal.openLoginModal();
        }
      });
  }


  removeFromWishlist(item: any) {
    item.isWishlist = !item.isWishlist
    this.commonService.delete('user/removeCarFromWishlist', { carId: item.id }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
    })
  }

  loadSwiper(): void {
    this.carsList.forEach((_, i) => {
      new Swiper(`.mySwiperMain-${i}`, {
        slidesPerView: 1,
        pagination: {
          el: ".swiper-pagination",
          type: "fraction",
        },
        navigation: {
          nextEl: `.swiper-button-next`,
          prevEl: `.swiper-button-prev`,
        },
      });
    });
  }

  previewImage(item: any) {
    let images: NzImage[] = [];
    item.forEach((_e: any) => {
      images.push({
        src: _e,
      })
    })
    this.nzImageService.preview(images);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
