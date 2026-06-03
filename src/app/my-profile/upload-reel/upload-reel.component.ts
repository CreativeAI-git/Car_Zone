import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateService } from '@ngx-translate/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../services/common.service';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-upload-reel',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './upload-reel.component.html',
  styleUrl: './upload-reel.component.css'
})
export class UploadReelComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  reelForm;
  selectedVideo: File | null = null;
  selectedThumbnail: File | null = null;
  videoPreviewUrl: string | null = null;
  thumbnailPreviewUrl: string | null = null;
  isSubmitting = false;
  showSuccessModal = false;

  constructor(
    private fb: FormBuilder,
    private service: CommonService,
    private loader: LoaderService,
    private message: NzMessageService,
    private router: Router,
    private translate: TranslateService
  ) {
    this.reelForm = this.fb.group({
      captions: ['', [Validators.required, Validators.maxLength(500)]]
    });
    this.translate.use(localStorage.getItem('lang') || 'en');
  }

  get captionsControl() {
    return this.reelForm.get('captions');
  }

  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('video/')) {
      this.message.error('Please select a valid video file.');
      input.value = '';
      return;
    }

    this.revokeVideoPreview();
    this.selectedVideo = file;
    this.videoPreviewUrl = URL.createObjectURL(file);
    input.value = '';
  }

  onThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.message.error('Please select a valid image file.');
      input.value = '';
      return;
    }

    this.revokeThumbnailPreview();
    this.selectedThumbnail = file;
    this.thumbnailPreviewUrl = URL.createObjectURL(file);
    input.value = '';
  }

  onVideoDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];

    if (file) {
      this.applyDroppedVideo(file);
    }
  }

  onThumbnailDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];

    if (file) {
      this.applyDroppedThumbnail(file);
    }
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  removeVideo(): void {
    this.selectedVideo = null;
    this.revokeVideoPreview();
  }

  removeThumbnail(): void {
    this.selectedThumbnail = null;
    this.revokeThumbnailPreview();
  }

  submitReel(): void {
    if (this.isSubmitting) {
      return;
    }

    if (!this.selectedVideo) {
      this.message.error('Please select a reel video.');
      return;
    }

    if (!this.selectedThumbnail) {
      this.message.error('Please select a reel thumbnail.');
      return;
    }

    if (this.reelForm.invalid) {
      this.reelForm.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    formData.append('profileReel', this.selectedVideo);
    formData.append('profileReelThumbnail', this.selectedThumbnail);
    formData.append('captions', this.captionsControl?.value?.trim() || '');

    this.isSubmitting = true;
    this.loader.show();

    this.service.post('user/uploadProfileReel', formData).pipe(
      finalize(() => {
        this.isSubmitting = false;
        this.loader.hide();
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.showSuccessModal = true;
        this.resetForm();
      },
      error: (error: any) => {
        this.message.error(error?.error?.message || error?.message || 'Failed to upload reel.');
      }
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
  }

  goToMyReels(): void {
    this.showSuccessModal = false;
    this.router.navigate(['/my-profile/my-reels']);
  }

  ngOnDestroy(): void {
    this.revokeVideoPreview();
    this.revokeThumbnailPreview();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyDroppedVideo(file: File): void {
    if (!file.type.startsWith('video/')) {
      this.message.error('Please drop a valid video file.');
      return;
    }

    this.revokeVideoPreview();
    this.selectedVideo = file;
    this.videoPreviewUrl = URL.createObjectURL(file);
  }

  private applyDroppedThumbnail(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.message.error('Please drop a valid image file.');
      return;
    }

    this.revokeThumbnailPreview();
    this.selectedThumbnail = file;
    this.thumbnailPreviewUrl = URL.createObjectURL(file);
  }

  private resetForm(): void {
    this.reelForm.reset();
    this.selectedVideo = null;
    this.selectedThumbnail = null;
    this.revokeVideoPreview();
    this.revokeThumbnailPreview();
  }

  private revokeVideoPreview(): void {
    if (this.videoPreviewUrl) {
      URL.revokeObjectURL(this.videoPreviewUrl);
      this.videoPreviewUrl = null;
    }
  }

  private revokeThumbnailPreview(): void {
    if (this.thumbnailPreviewUrl) {
      URL.revokeObjectURL(this.thumbnailPreviewUrl);
      this.thumbnailPreviewUrl = null;
    }
  }
}
