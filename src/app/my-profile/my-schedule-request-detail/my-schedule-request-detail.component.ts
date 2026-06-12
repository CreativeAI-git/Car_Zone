import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../services/common.service';
import { LoaderService } from '../../services/loader.service';
import { CommonModule } from '@angular/common';
import { ChfFormatPipe } from '../../pipes/chf-format.pipe';

@Component({
  selector: 'app-my-schedule-request-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ChfFormatPipe],
  templateUrl: './my-schedule-request-detail.component.html',
  styleUrl: './my-schedule-request-detail.component.css'
})
export class MyScheduleRequestDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  requestId: string | null = null;
  requestDetail: any = null;

  constructor(
    private route: ActivatedRoute,
    private service: CommonService,
    private loader: LoaderService
  ) {}

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
    this.service.get(`user/my-sent-visit-requests?id=${this.requestId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (Array.isArray(res.data)) {
            this.requestDetail = res.data.find((item: any) => item.id == this.requestId) || res.data[0];
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
