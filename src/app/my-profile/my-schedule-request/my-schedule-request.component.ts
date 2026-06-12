import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonService } from '../../services/common.service';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoaderService } from '../../services/loader.service';
import { ChfFormatPipe } from '../../pipes/chf-format.pipe';

@Component({
  selector: 'app-my-schedule-request',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterLink, ChfFormatPipe, FormsModule],
  templateUrl: './my-schedule-request.component.html',
  styleUrl: './my-schedule-request.component.css'
})
export class MyScheduleRequestComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  requests: any[] = [];
  filteredRequests: any[] = [];
  searchTerm: string = '';
  statusFilter: string = 'all';

  constructor(private service: CommonService, private loader: LoaderService) { }

  ngOnInit(): void {
    this.getRequests();
  }

  getRequests() {
    this.loader.show();
    this.service.get('user/my-sent-visit-requests')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.requests = res.data || [];
          this.filterRequests();
          this.loader.hide();
        },
        error: (err: any) => {
          console.error(err);
          this.loader.hide();
        }
      });
  }

  filterRequests() {
    let filtered = this.requests;

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status?.toLowerCase() === this.statusFilter.toLowerCase());
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.vehicle?.brandName?.toLowerCase().includes(term) ||
        item.vehicle?.carModel?.toLowerCase().includes(term) ||
        item.seller?.full_name?.toLowerCase().includes(term)
      );
    }

    this.filteredRequests = filtered;
  }

  onFilterChange() {
    this.filterRequests();
  }

  getStatusClass(status: string) {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'status-badge-success';
      case 'pending': return 'status-badge-warning';
      case 'rejected': return 'status-badge-danger';
      default: return 'status-badge-warning';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
