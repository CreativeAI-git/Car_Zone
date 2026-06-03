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
    this.getMyReels()
  }

  getMyReels() {
    this.loader.show()
    this.service.get('user/fetchMyReels').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.savedReels = res.data
      this.loader.hide()
    },
      err => {
        this.loader.hide()
      })
  }

  openReel(item: any) {
    this.router.navigate(['reel-player'], { queryParams: { id: item.id, type: item.reel_type } });
  }

  navigateToUploadReel() {
    this.router.navigate(['/my-profile/upload-reel']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
