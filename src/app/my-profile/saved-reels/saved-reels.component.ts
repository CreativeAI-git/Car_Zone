import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../services/common.service';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LoaderService } from '../../services/loader.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-saved-reels',
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './saved-reels.component.html',
  styleUrl: './saved-reels.component.css'
})
export class SavedReelsComponent {
  private destroy$ = new Subject<void>();
  savedReels: any = []
  constructor(private service: CommonService, private loader: LoaderService, private router: Router, private translate:TranslateService) { 
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

  removeFromSaved(item: any) {
    item.isWishlist = !item.isWishlist
    this.service.delete('user/removeSavedCarsReel', { carId: item.carId }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.savedReels.splice(this.savedReels.indexOf(item), 1)
    })
  }

  openReel(item: any) {
    this.router.navigate(['reel-player'], { queryParams: { id: item.id } });
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
