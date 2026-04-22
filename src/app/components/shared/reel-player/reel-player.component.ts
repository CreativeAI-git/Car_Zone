import { CommonModule, Location } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../../services/common.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ModalService } from '../../../services/modal.service';
declare var Swiper: any

@Component({
  selector: 'app-reel-player',
  imports: [CommonModule, RouterLink],
  templateUrl: './reel-player.component.html',
  styleUrl: './reel-player.component.css',
})
export class ReelPlayerComponent {

  private destroy$ = new Subject<void>();
  carReels: any = []
  swiper: any;
  reelId: any
  currentIndex: number = 0
  token: any
  isPlaying: boolean = true
  page: number = 1;
  hasMore: boolean = true;
  isLoadingMore: boolean = false;
  readonly preloadThreshold: number = 2;
  constructor(private service: CommonService, private authService: AuthService, private route: ActivatedRoute, public location: Location, private modalService: ModalService) {
    this.route.queryParamMap.subscribe(params => {
      this.reelId = params.get('id')
    })
  }

  ngOnInit(): void {
    this.token = this.authService.getToken();
    this.getReels(true)
  }

  getReels(isInitialLoad: boolean = false) {
    if (this.isLoadingMore || (!isInitialLoad && !this.hasMore)) {
      return;
    }

    this.isLoadingMore = true;
    const endpoint = this.token
      ? `user/fetchAllCarReels`
      : `user/asGuestUsersfetchAllCarReels`;

    const queryParams = isInitialLoad
      ? `?car_id=${this.reelId}`
      : `?page=${this.page}`;

    this.service.get(endpoint + queryParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const reels = res?.data?.data ?? [];
          const currentPage = Number(res?.data?.currentPage ?? this.page);
          const totalPages = Number(res?.data?.totalPages ?? currentPage);

          if (isInitialLoad) {
            this.carReels = reels;
            this.currentIndex = this.carReels.findIndex((item: any) => item.id == this.reelId);
            this.currentIndex = this.currentIndex >= 0 ? this.currentIndex : 0;
            this.page = currentPage + 1;

            setTimeout(() => {
              this.initSwiper();
            }, 100);
          } else {
            const existingIds = new Set(this.carReels.map((item: any) => item.id));
            const newReels = reels.filter((item: any) => !existingIds.has(item.id));

            if (newReels.length) {
              this.carReels = [...this.carReels, ...newReels];
              setTimeout(() => {
                this.swiper?.update();
              }, 50);
            }

            this.page = currentPage + 1;
          }

          this.hasMore = currentPage < totalPages;
          this.isLoadingMore = false;
        },
        error: () => {
          this.isLoadingMore = false;
        }
      });
  }


  initSwiper() {
    if (this.swiper) {
      this.swiper.destroy(true, true);
    }

    setTimeout(() => {
      this.swiper = new Swiper('.mySwiper', {
        direction: 'vertical',
        loop: false,
        currrentIndex: 4,
        mousewheel: {
          forceToAxis: true,
          sensitivity: 1,
          releaseOnEdges: true,
        },
        touchReleaseOnEdges: true,
        slidesPerView: 1,
        spaceBetween: 30,
        initialSlide: this.currentIndex,
        resistance: true,
        resistanceRatio: 0.85,
        speed: 300,
        on: {
          init: () => {
            console.log('Swiper initialized');
            setTimeout(() => this.handleVideoPlay(), 100);
          },
          slideChangeTransitionStart: () => {
            console.log('Slide change started');
          },
          slideChangeTransitionEnd: () => {
            console.log('Slide change ended');
            this.handleSlideChange();
            this.handleVideoPlay();
          },
        },
      });
    }, 100);
  }

  private handleSlideChange() {
    if (!this.swiper) {
      return;
    }

    const activeIndex = this.swiper.activeIndex ?? 0;
    this.currentIndex = activeIndex;

    const shouldLoadMore =
      this.hasMore &&
      !this.isLoadingMore &&
      activeIndex >= this.carReels.length - this.preloadThreshold;

    if (shouldLoadMore) {
      this.getReels();
    }
  }

  handleVideoPlay() {
    const allVideos = document.querySelectorAll<HTMLVideoElement>('.swiper-slide video');

    console.log('Total videos found:', allVideos.length);

    allVideos.forEach((vid, index) => {
      vid.pause();
      vid.currentTime = 0;
      vid.muted = true;
      vid.volume = 0;
    });

    const activeSlide = document.querySelector('.swiper-slide-active');
    if (!activeSlide) {
      return;
    }

    const activeVideo = activeSlide.querySelector<HTMLVideoElement>('video');
    if (!activeVideo) {
      return;
    }
    activeVideo.muted = true;
    activeVideo.volume = 0;
    this.playActiveVideo(activeVideo);
  }

  private playActiveVideo(video: HTMLVideoElement) {
    video.muted = false;
    video.volume = 1;

    // Add these attributes to prevent power-saving pause
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('disableremoteplayback', '');

    // Add these styles to ensure video is considered "visible"
    video.style.objectFit = 'cover';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.display = 'block';

    this.isPlaying = true
    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Video playing successfully');
          console.log('Video muted status:', video.muted);
          console.log('Video paused status:', video.paused);
          this.monitorVideoPlayback(video);
        })
        .catch((error) => {
          console.warn('Autoplay failed:', error);
          console.log('Video muted status on error:', video.muted);
        });
    }
  }

  private monitorVideoPlayback(video: HTMLVideoElement) {
    let playAttempts = 0;
    const maxPlayAttempts = 0;

    const checkAndRestart = () => {
      if (video.paused && playAttempts < maxPlayAttempts) {
        console.log('Video was paused, attempting to restart...');
        playAttempts++;

        video.play()
          .then(() => {
            console.log(`Video restarted successfully (attempt ${playAttempts})`);
          })
          .catch((error) => {
            console.warn(`Restart attempt ${playAttempts} failed:`, error);
          });
      }
    };

    const interval = setInterval(() => {
      if (video.paused) {
        checkAndRestart();
      }

      if (playAttempts >= maxPlayAttempts) {
        clearInterval(interval);
      }
    }, 1000);

    // Also listen for pause events
    video.addEventListener('pause', () => {
      console.log('Video was paused by browser');
      checkAndRestart();
    });
  }

  // private addVideoPlayButton(video: HTMLVideoElement) {
  //   // Remove existing play buttons
  //   const existingButton = video.parentElement?.querySelector('.play-overlay');
  //   if (existingButton) {
  //     existingButton.remove();
  //   }

  //   // Add play button overlay
  //   const playButton = document.createElement('div');
  //   playButton.className = 'play-overlay';
  //   playButton.innerHTML = '▶';
  //   playButton.style.cssText = `
  //     position: absolute;
  //     top: 50%;
  //     left: 50%;
  //     transform: translate(-50%, -50%);
  //     width: 60px;
  //     height: 60px;
  //     background: rgba(0,0,0,0.7);
  //     border-radius: 50%;
  //     display: flex;
  //     align-items: center;
  //     justify-content: center;
  //     color: white;
  //     font-size: 24px;
  //     cursor: pointer;
  //     z-index: 10;
  //   `;

  //   playButton.addEventListener('click', () => {
  //     video.play().then(() => {
  //       playButton.style.display = 'none';
  //     });
  //   });

  //   video.parentElement?.style.setProperty('position', 'relative');
  //   video.parentElement?.appendChild(playButton);
  // }

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

  togglePlay(video: HTMLVideoElement) {
    if (video.paused) {
      this.isPlaying = true;
      video.play();
    } else {
      this.isPlaying = false;
      video.pause();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
