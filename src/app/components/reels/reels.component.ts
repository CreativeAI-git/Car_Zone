import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../services/common.service';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LoaderService } from '../../services/loader.service';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-reels',
  imports: [CommonModule, RouterLink],
  templateUrl: './reels.component.html',
  styleUrl: './reels.component.css'
})
export class ReelsComponent {
  private destroy$ = new Subject<void>();
  carReels: any = [];
  private observer!: IntersectionObserver;
  @ViewChild('anchor', { static: false }) anchor!: ElementRef;
  page: number = 1
  token: any
  constructor(private service: CommonService, private loader: LoaderService, private router: Router, private authService: AuthService, private modalService: ModalService) { }

  ngOnInit(): void {
    this.loader.show()
    this.token = this.authService.getToken();
    this.getReels()
  }

  getReels() {
    this.isLoading = true;
    // this.loader.show();

    const endpoint = this.token
      ? `user/fetchAllCarReels?page=${this.page}`
      : `user/asGuestUsersfetchAllCarReels?page=${this.page}`;

    this.service.get(endpoint)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const carReels = [...this.carReels, ...res.data.data];
          this.carReels = carReels.filter(reel => reel.reelType !== 'profile');
          this.isLoading = false;
          this.loader.hide();

          this.hasMore = res.data.currentPage < res.data.totalPages;
          this.page++;
        },
        error: (err) => {
          console.error('Failed to fetch reels:', err);
          this.isLoading = false;
          this.loader.hide();
        }
      });
  }


  openReel(item: any) {
    this.router.navigate(['reel-player'], { queryParams: { id: item.id } });
  }

  isLoading = false;
  hasMore = true;

  @HostListener('window:scroll', [])
  onScroll(): void {
    const threshold = 300; // px from bottom
    const pos = window.innerHeight + window.scrollY;
    const max = document.body.offsetHeight;

    if (!this.isLoading && this.hasMore && pos >= max - threshold) {
      this.getReels();
    }
  }

  // saveReel(item: any) {
  //   item.isSavedReel = !item.isSavedReel
  //   this.service.post('user/saveCarReels', { carId: item.id }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
  //   })
  // }

  saveReel(item: any) {
    // Optimistically toggle saved state
    item.isSavedReel = !item.isSavedReel;

    this.service.post('user/saveCarReels', { carId: item.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          // ✅ Successfully saved reel
        },
        error: (err) => {
          console.error('Save reel API failed:', err);

          // ❌ Revert the toggle if API fails
          item.isSavedReel = !item.isSavedReel;

          // 🧩 Open login modal on error
          this.modalService.openLoginModal();
        }
      });
  }


  removeFromSaved(item: any) {
    item.isSavedReel = !item.isSavedReel
    this.service.delete('user/removeSavedCarsReel', { carId: item.id }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
