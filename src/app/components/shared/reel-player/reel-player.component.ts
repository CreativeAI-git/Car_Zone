import { CommonModule, Location } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, QueryList, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../../services/common.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ModalService } from '../../../services/modal.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { FilterService, MakeModelOption } from '../../../services/filter.service';
declare var Swiper: any

@Component({
  selector: 'app-reel-player',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './reel-player.component.html',
  styleUrl: './reel-player.component.css',
})
export class ReelPlayerComponent implements AfterViewInit {

  private destroy$ = new Subject<void>();
  expandedCaptionIds = new Set<number | string>();
  overflowingCaptionIds = new Set<string>();
  carReels: any = []
  @ViewChildren('captionText') captionTexts!: QueryList<ElementRef<HTMLElement>>;
  swiper: any;
  reelId: any
  currentIndex: number = 0
  token: any
  isPlaying: boolean = true
  page: number = 1;
  hasMore: boolean = true;
  isLoadingMore: boolean = false;
  readonly preloadThreshold: number = 2;
  reelType: string | undefined | null = null;
  showFilterPanel = false;
  isLoadingFilters = false;
  isRefreshingFilters = false;
  showMakeDropdown = false;
  showBodyTypeDropdown = false;
  makeOptions: MakeModelOption[] = [];
  bodyTypes: Array<{ id: number | string; name: string; image: string; count: number }> = [];
  selectedMakeIds: Array<string | number> = [];
  selectedBodyTypeIds: Array<string | number> = [];
  filters = {
    make: [] as string[],
    body_type_id: [] as Array<string | number>,
    price_from: null as number | null,
    price_to: null as number | null
  };
  constructor(private service: CommonService, private authService: AuthService, private route: ActivatedRoute, public location: Location, private modalService: ModalService, private message: NzMessageService, private filterService: FilterService) {
    this.route.queryParamMap.subscribe(params => {
      this.reelId = params.get('id')
      this.reelType = params.get('type')
    })
  }

  ngOnInit(): void {
    this.token = this.authService.getToken();
    if (this.reelType) {
      this.getMyReels(true)
    } else {
      this.loadFilterOptions();
      this.getReels(true)
    }
  }

  ngAfterViewInit(): void {
    this.captionTexts.changes
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        setTimeout(() => this.updateCaptionOverflow(), 0);
      });

    setTimeout(() => this.updateCaptionOverflow(), 0);
  }

  getReels(isInitialLoad: boolean = false) {
    if (this.isLoadingMore || (!isInitialLoad && !this.hasMore)) {
      return;
    }

    this.isLoadingMore = true;
    const endpoint = this.token
      ? `user/fetchAllCarReels`
      : `user/asGuestUsersfetchAllCarReels`;
    const queryParams = this.buildReelQueryParams(isInitialLoad);

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
              this.updateCaptionOverflow();
            }, 100);
          } else {
            const existingIds = new Set(this.carReels.map((item: any) => item.id));
            const newReels = reels.filter((item: any) => !existingIds.has(item.id));

            if (newReels.length) {
              this.carReels = [...this.carReels, ...newReels];
              setTimeout(() => {
                this.swiper?.update();
                this.updateCaptionOverflow();
              }, 50);
            }

            this.page = currentPage + 1;
          }

          this.hasMore = currentPage < totalPages;
          this.isLoadingMore = false;
          this.isRefreshingFilters = false;
        },
        error: () => {
          this.isLoadingMore = false;
          this.isRefreshingFilters = false;
        }
      });
  }

  getMyReels(isInitialLoad: boolean = false) {
    if (this.isLoadingMore || (!isInitialLoad && !this.hasMore)) {
      return;
    }

    this.isLoadingMore = true;
    const endpoint = `user/fetchReelById`;

    const queryParams = isInitialLoad
      ? `?reel_id=${this.reelId}&reelType=${this.reelType}`
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
              this.updateCaptionOverflow();
            }, 100);
          } else {
            const existingIds = new Set(this.carReels.map((item: any) => item.id));
            const newReels = reels.filter((item: any) => !existingIds.has(item.id));

            if (newReels.length) {
              this.carReels = [...this.carReels, ...newReels];
              setTimeout(() => {
                this.swiper?.update();
                this.updateCaptionOverflow();
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

  toggleFilterPanel(): void {
    this.showFilterPanel = !this.showFilterPanel;
    if (!this.showFilterPanel) {
      this.showMakeDropdown = false;
      this.showBodyTypeDropdown = false;
    }
  }

  toggleMakeDropdown(event?: Event): void {
    event?.stopPropagation();
    this.showMakeDropdown = !this.showMakeDropdown;
    if (this.showMakeDropdown) {
      this.showBodyTypeDropdown = false;
    }
  }

  toggleBodyTypeDropdown(event?: Event): void {
    event?.stopPropagation();
    this.showBodyTypeDropdown = !this.showBodyTypeDropdown;
    if (this.showBodyTypeDropdown) {
      this.showMakeDropdown = false;
    }
  }

  onMakeToggle(make: MakeModelOption, event: Event): void {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    this.selectedMakeIds = this.toggleSelection(this.selectedMakeIds, make.value, input.checked);
    this.filters.make = this.makeOptions
      .filter((item) => this.selectedMakeIds.some((selectedId) => String(selectedId) === String(item.value)))
      .map((item) => item.label);
  }

  onBodyTypeToggle(bodyType: { id: number | string; name: string }, event: Event): void {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    this.selectedBodyTypeIds = this.toggleSelection(this.selectedBodyTypeIds, bodyType.id, input.checked);
    this.filters.body_type_id = [...this.selectedBodyTypeIds];
  }

  applyFilters(): void {
    this.showFilterPanel = false;
    this.showMakeDropdown = false;
    this.showBodyTypeDropdown = false;
    this.prepareInitialFetchState();
    this.isRefreshingFilters = true;
    this.getReels(true);
  }

  resetFilters(): void {
    this.selectedMakeIds = [];
    this.selectedBodyTypeIds = [];
    this.filters = {
      make: [],
      body_type_id: [],
      price_from: null,
      price_to: null
    };
    this.showFilterPanel = false;
    this.showMakeDropdown = false;
    this.showBodyTypeDropdown = false;
    this.prepareInitialFetchState();
    this.isRefreshingFilters = true;
    this.getReels(true);
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

    if (shouldLoadMore && !this.reelType) {
      this.getReels();
    } else if (shouldLoadMore && this.reelType) {
      this.getMyReels();
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


  getSellerAvatar(item: any): string {
    return item?.sellerLogo || item?.profileImage || 'img/icons/user-circle-img.png';
  }

  isCaptionExpanded(item: any): boolean {
    return this.expandedCaptionIds.has(item?.id);
  }

  expandCaption(item: any): void {
    if (item?.id !== undefined && item?.id !== null) {
      this.expandedCaptionIds.add(item.id);
      this.overflowingCaptionIds.delete(String(item.id));
      setTimeout(() => this.updateCaptionOverflow(), 0);
    }
  }

  shouldShowCaptionToggle(item: any): boolean {
    return this.overflowingCaptionIds.has(String(item?.id));
  }

  async shareReel(item: any) {
    const shareUrl = this.buildReelShareUrl(item);
    const shareTitle = item?.fullModel || 'Car Reel';
    const shareText = item?.carReelInfo || shareTitle;

    if (!shareUrl) {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      this.message.success('Link copied');
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      this.message.success('Link copied');
    }
  }

  private buildReelShareUrl(item: any): string {
    const origin = globalThis.location?.origin || '';
    const reelPath = '/reel-player';
    const reelIdentifier = item?.id || this.reelId;

    if (!reelIdentifier) {
      return globalThis.location?.href || '';
    }

    return `${origin}${reelPath}?id=${reelIdentifier}`;
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filters.make.length ||
      this.filters.body_type_id.length ||
      this.filters.price_from !== null ||
      this.filters.price_to !== null
    );
  }

  get displayReels(): any[] {
    return this.carReels.filter((item: any) => !!item?.carReel);
  }

  get showEmptyReelState(): boolean {
    return !this.isRefreshingFilters && this.displayReels.length === 0;
  }

  get emptyStateTitle(): string {
    return this.hasActiveFilters ? 'No reels match these filters' : 'No reels available right now';
  }

  get emptyStateMessage(): string {
    return this.hasActiveFilters
      ? 'Try changing make, body type, or price range to see more reels.'
      : 'Please check back in a moment for new seller reels.';
  }

  get selectedMakeLabel(): string {
    if (!this.filters.make.length) {
      return 'All makes';
    }

    return this.buildSelectionLabel(this.filters.make, 'makes');
  }

  get selectedBodyTypeLabel(): string {
    if (!this.selectedBodyTypeIds.length) {
      return 'All body types';
    }

    const labels = this.bodyTypes
      .filter((item) => this.selectedBodyTypeIds.some((selectedId) => String(selectedId) === String(item.id)))
      .map((item) => item.name)
      .filter(Boolean);

    return this.buildSelectionLabel(labels, 'body types');
  }

  private loadFilterOptions(): void {
    this.isLoadingFilters = true;

    this.filterService.loadMakeOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options) => {
          this.makeOptions = options;
        },
        error: () => {
          this.makeOptions = [];
        }
      });

    this.service.get('user/body-type')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.bodyTypes = (res?.data?.types || []).map((item: any) => ({
            id: item?.id,
            name: item?.name || item?.code || '',
            image: item?.image || '',
            count: item?.count || 0
          })).filter((item: any) => item.id !== null && item.id !== undefined && item.name);
          this.isLoadingFilters = false;
        },
        error: () => {
          this.bodyTypes = [];
          this.isLoadingFilters = false;
        }
      });
  }

  private buildReelQueryParams(isInitialLoad: boolean): string {
    const params = new URLSearchParams();

    if (!this.hasActiveFilters && isInitialLoad && this.reelId) {
      params.set('car_id', this.reelId);
      return `?${params.toString()}`;
    }

    params.set('page', String(isInitialLoad ? 1 : this.page));

    if (this.filters.make.length) {
      params.set('make', JSON.stringify(this.filters.make));
    }

    if (this.filters.body_type_id.length) {
      params.set('body_type_id', JSON.stringify(this.filters.body_type_id.map((id) => String(id))));
    }

    if (this.filters.price_from !== null && this.filters.price_from !== undefined) {
      params.set('price_from', String(this.filters.price_from));
    }

    if (this.filters.price_to !== null && this.filters.price_to !== undefined) {
      params.set('price_to', String(this.filters.price_to));
    }

    return `?${params.toString()}`;
  }

  private resetReelsState(): void {
    this.page = 1;
    this.hasMore = true;
    this.isLoadingMore = false;
    this.currentIndex = 0;
    this.carReels = [];
    this.expandedCaptionIds.clear();
    this.overflowingCaptionIds.clear();
  }

  private prepareInitialFetchState(): void {
    this.page = 1;
    this.hasMore = true;
    this.isLoadingMore = false;
    this.currentIndex = 0;
    this.expandedCaptionIds.clear();
    this.overflowingCaptionIds.clear();
  }

  private updateCaptionOverflow(): void {
    if (!this.captionTexts) {
      return;
    }

    this.overflowingCaptionIds.clear();

    this.captionTexts.forEach((captionRef) => {
      const element = captionRef.nativeElement;
      const captionId = element.dataset['captionId'];

      if (!captionId || this.expandedCaptionIds.has(captionId)) {
        return;
      }

      if (element.scrollHeight > element.clientHeight + 1) {
        this.overflowingCaptionIds.add(captionId);
      }
    });
  }

  private toggleSelection<T>(list: T[], value: T, checked: boolean): T[] {
    if (checked) {
      return list.some((item) => String(item) === String(value)) ? list : [...list, value];
    }

    return list.filter((item) => String(item) !== String(value));
  }

  isMakeSelected(makeId: string | number): boolean {
    return this.selectedMakeIds.some((item) => String(item) === String(makeId));
  }

  isBodyTypeSelected(bodyTypeId: string | number): boolean {
    return this.selectedBodyTypeIds.some((item) => String(item) === String(bodyTypeId));
  }

  onDropdownInteraction(event: Event): void {
    event.stopPropagation();
  }

  onDropdownWheel(event: WheelEvent): void {
    event.stopPropagation();
  }

  private buildSelectionLabel(labels: string[], fallbackPluralLabel: string): string {
    const normalizedLabels = (labels || []).filter(Boolean);

    if (!normalizedLabels.length) {
      return `All ${fallbackPluralLabel}`;
    }

    if (normalizedLabels.length <= 3) {
      return normalizedLabels.join(', ');
    }

    const visibleLabels = normalizedLabels.slice(0, 3).join(', ');
    const remainingCount = normalizedLabels.length - 3;
    return `${visibleLabels} +${remainingCount}`;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showMakeDropdown = false;
    this.showBodyTypeDropdown = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
