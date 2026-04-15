import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../../services/common.service';
import { ValidationErrorService } from '../../../services/validation-error.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-request-additional-slots',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './request-additional-slots.component.html',
  styleUrl: './request-additional-slots.component.css'
})
export class RequestAdditionalSlotsComponent {
  private destroy$ = new Subject<void>();
  private readonly requestSummaryStorageKey = 'latestSlotRequestSummary';
  isSubmitting = false;

  slotRequestForm;

  constructor(
    private fb: FormBuilder,
    private service: CommonService,
    private message: NzMessageService,
    private router: Router,
    private translate: TranslateService,
    public validationErrorService: ValidationErrorService
  ) {
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.slotRequestForm = this.fb.group({
      requestedSlots: [null as number | null, [Validators.required, Validators.min(1)]],
      message: ['', [Validators.maxLength(500)]]
    });
  }

  get requestedSlotsControl() {
    return this.slotRequestForm.get('requestedSlots');
  }

  get messageControl() {
    return this.slotRequestForm.get('message');
  }

  submitRequest() {
    if (this.slotRequestForm.invalid) {
      this.slotRequestForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const payload = new URLSearchParams({
      requestedSlots: String(this.requestedSlotsControl?.value ?? ''),
      message: this.messageControl?.value?.trim() || ''
    }).toString();

    this.service.post('user/requestSlot', payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        const requestSummary = {
          requestedSlots: this.requestedSlotsControl?.value,
          message: this.messageControl?.value?.trim() || '',
          submittedAt: new Date().toISOString(),
          status: 'underReview'
        };

        sessionStorage.setItem(this.requestSummaryStorageKey, JSON.stringify(requestSummary));
        this.message.success(res?.message || this.translate.instant('listing.slotRequestSubmitted'));
        this.slotRequestForm.reset({
          requestedSlots: null,
          message: ''
        });
        this.router.navigate(['/application-under-review'], {
          state: {
            requestSummary
          }
        });
      },
      error: (error: any) => {
        this.isSubmitting = false;
        this.message.error(error?.error?.message || error?.message || this.translate.instant('common.tryAgainLater'));
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
