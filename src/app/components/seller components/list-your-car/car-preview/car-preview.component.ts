import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { NzImageModule } from 'ng-zorro-antd/image';
import { ChfFormatPipe } from '../../../../pipes/chf-format.pipe';
import { TranslateModule } from '@ngx-translate/core';
declare var Swiper: any;
@Component({
  selector: 'app-car-preview',
  imports: [NzImageModule, CommonModule, ChfFormatPipe, TranslateModule],
  templateUrl: './car-preview.component.html',
  styleUrl: './car-preview.component.css'
})
export class CarPreviewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() carData: any;
  @ViewChild('mainSwiperRef') mainSwiperRef?: ElementRef<HTMLElement>;
  @ViewChild('thumbsSwiperRef') thumbsSwiperRef?: ElementRef<HTMLElement>;

  private mainSwiper: any;
  private thumbsSwiper: any;
  private viewInitialized = false;


  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.loadSweper();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewInitialized || !changes['carData']) {
      return;
    }

    this.loadSweper();
  }

  ngOnDestroy(): void {
    this.destroySwipers();
  }

  loadSweper() {
    setTimeout(() => {
      const images = this.carData?.carImages ?? [];
      const mainElement = this.mainSwiperRef?.nativeElement;
      const thumbsElement = this.thumbsSwiperRef?.nativeElement;

      if (!mainElement || !thumbsElement || !images.length || typeof Swiper === 'undefined') {
        this.destroySwipers();
        return;
      }

      this.destroySwipers();

      this.thumbsSwiper = new Swiper(thumbsElement, {
        slidesPerView: 6,
        spaceBetween: 10,
        watchSlidesProgress: true,
      });

      this.mainSwiper = new Swiper(mainElement, {
        slidesPerView: 1,
        spaceBetween: 10,
        pagination: {
          el: mainElement.querySelector('.swiper-pagination'),
          type: "fraction",
        },
        thumbs: {
          swiper: this.thumbsSwiper
        }
      });
    });
  }

  private destroySwipers() {
    if (this.mainSwiper?.destroy) {
      this.mainSwiper.destroy(true, true);
    }

    if (this.thumbsSwiper?.destroy) {
      this.thumbsSwiper.destroy(true, true);
    }

    this.mainSwiper = null;
    this.thumbsSwiper = null;
  }

  trackByImage(index: number, img: any) {
    return img?.id ?? img?.url ?? index;
  }
}
