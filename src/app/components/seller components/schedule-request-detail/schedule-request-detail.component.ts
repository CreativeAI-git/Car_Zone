import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../../services/common.service';
import { LoaderService } from '../../../services/loader.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-schedule-request-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './schedule-request-detail.component.html',
  styleUrl: './schedule-request-detail.component.css'
})
export class ScheduleRequestDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  requestId: string | null = null;
  requestDetail: any = null;
  rescheduleDate: string = '';
  rescheduleTime: string = '';
  showRescheduleError: boolean = false;

  @ViewChild('cancelModalBtn') cancelModalBtn!: ElementRef;

  get minDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  constructor(
    private route: ActivatedRoute,
    private service: CommonService,
    private loader: LoaderService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.requestId = params['id'];
      if (this.requestId) {
        this.getDetail();
      }
    });
  }

  getDetail() {
    this.loader.show();
    this.service.get(`user/get-Schedule-visit/${this.requestId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (Array.isArray(res.data)) {
            this.requestDetail = res.data;
          } else {
            this.requestDetail = res.data;
          }
          this.loader.hide();
        },
        error: (err: any) => {
          console.error(err);
          this.loader.hide();
        }
      });
  }

  changeStatus(action: string) {
    if (!this.requestId) return;

    let payload: any = { action };
    let apiUrl = ``
    if (action === 'reschedule') {
      this.showRescheduleError = false;
      if (!this.rescheduleDate || !this.rescheduleTime) {
        this.showRescheduleError = true;
        return;
      }
      payload.preferred_date = this.rescheduleDate;
      payload.preferred_time = this.rescheduleTime;
      apiUrl = `user/schedule-requests/${this.requestId}/reschedule`
    } else {
      apiUrl = `user/seller-Schedule-visit-Action/${this.requestId}`
    }

    this.loader.show();
    this.service.post(apiUrl, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.rescheduleDate = '';
          this.rescheduleTime = '';
          this.showRescheduleError = false;
          if (this.cancelModalBtn) {
            this.cancelModalBtn.nativeElement.click();
          }
          this.getDetail();
        },
        error: (err: any) => {
          console.error(err);
          this.loader.hide();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
