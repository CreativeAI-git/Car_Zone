import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CommonService } from '../../../services/common.service';
import { LoaderService } from '../../../services/loader.service';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-schedule-request',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './schedule-request.component.html',
  styleUrl: './schedule-request.component.css'
})
export class ScheduleRequestComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  requests: any[] = [];
  filteredRequests: any[] = [];
  searchTerm: string = '';
  statusFilter: string = 'all';

  constructor(
    private service: CommonService,
    private loader: LoaderService
  ) { }

  ngOnInit(): void {
    this.getRequests();
  }

  getRequests() {
    this.loader.show();
    this.service.get('user/get-Schedule-visit')
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
        item.requester?.full_name?.toLowerCase().includes(term)
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
