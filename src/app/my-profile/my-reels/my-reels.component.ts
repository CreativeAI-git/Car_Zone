import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../services/common.service';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-my-reels',
  imports: [TranslateModule],
  templateUrl: './my-reels.component.html',
  styleUrl: './my-reels.component.css'
})
export class MyReelsComponent {
  private destroy$ = new Subject<void>();
  savedReels: any = []
  constructor(private service: CommonService, private loader: LoaderService, private router: Router, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en')
  }

  ngOnInit(): void {
    this.getSavedReels()
  }

  getSavedReels() {
    this.loader.show()
    this.service.get('user/fetchCarReels').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.savedReels = res.data.data
      this.loader.hide()
    },
      err => {
        this.loader.hide()
      })
  }

  openReel(item: any) {
    this.router.navigate(['reel-player'], { queryParams: { id: item.carId } });
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
