import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
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
export class CarPreviewComponent {
  @Input() carData: any;


  ngAfterViewInit(): void {
    this.loadSweper()
  }

  loadSweper() {
    setTimeout(() => {
      const thumbs = new Swiper(`.mySwiperThumbs`, {
        slidesPerView: 6,
        spaceBetween: 10,
        watchSlidesProgress: true,
      });

      new Swiper(`.mySwiperMain`, {
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

  trackByImage(index: number, img: any) {
    return img?.id ?? img?.url ?? index;
  }
}
