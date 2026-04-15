import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../../services/common.service';
import { LoaderService } from '../../../services/loader.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChfFormatPipe } from '../../../pipes/chf-format.pipe';

type SlotRequestStatus = 'approved' | 'pending' | 'rejected';
type SlotRequestFilter = 'all' | SlotRequestStatus;

interface SlotRequestItem {
  id: number;
  user_id: number;
  requested_slots: number;
  message: string;
  status: string;
  admin_message: string | null;
  created_at: string;
  updated_at: string;
  approved_price: string | number;
  plan_id: number | null;
}

@Component({
  selector: 'app-requested-slots',
  imports: [CommonModule, TranslateModule, ChfFormatPipe],
  templateUrl: './requested-slots.component.html',
  styleUrl: './requested-slots.component.css'
})
export class RequestedSlotsComponent {
  private destroy$ = new Subject<void>();
  slotRequests: SlotRequestItem[] = [];
  activeFilter: SlotRequestFilter = 'all';
  selectedRequest: SlotRequestItem | null = null;

  readonly filters: { key: SlotRequestFilter; label: string }[] = [
    { key: 'all', label: 'common.allAlt' },
    { key: 'approved', label: 'status.approved' },
    { key: 'pending', label: 'status.pending' },
    { key: 'rejected', label: 'status.rejected' }
  ];

  constructor(
    private service: CommonService,
    private loader: LoaderService,
    private translate: TranslateService
  ) {
    this.translate.use(localStorage.getItem('lang') || 'en');
  }

  ngOnInit(): void {
    this.getSlotRequests();
  }

  getSlotRequests() {
    this.loader.show();
    this.service.get('user/getAllSlotRequests').pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.slotRequests = Array.isArray(res?.data) ? res.data : [];
        this.loader.hide();
      },
      error: () => {
        this.slotRequests = [];
        this.loader.hide();
      }
    });
  }

  get filteredRequests(): SlotRequestItem[] {
    if (this.activeFilter === 'all') {
      return this.slotRequests;
    }

    return this.slotRequests.filter((item) => item.status?.toLowerCase() === this.activeFilter);
  }

  setFilter(filter: SlotRequestFilter) {
    this.activeFilter = filter;
  }

  openDetails(item: SlotRequestItem) {
    this.selectedRequest = item;
  }

  closeDetails() {
    this.selectedRequest = null;
  }

  getStatusKey(status: string): string {
    const normalizedStatus = status?.toLowerCase();
    if (normalizedStatus === 'approved') return 'status.approved';
    if (normalizedStatus === 'rejected') return 'status.rejected';
    return 'status.pending';
  }

  getStatusClass(status: string): string {
    const normalizedStatus = status?.toLowerCase();
    if (normalizedStatus === 'approved') return 'approved';
    if (normalizedStatus === 'rejected') return 'rejected';
    return 'pending';
  }

  getSlotTitle(item: SlotRequestItem): string {
    return `${this.translate.instant('listing.slotLabel')} - ${item.requested_slots} ${this.translate.instant('listing.listings')}`;
  }


  get emptyStateMessageKey(): string {
    if (this.activeFilter === 'approved') {
      return 'listing.noApprovedSlotRequests';
    }

    if (this.activeFilter === 'pending') {
      return 'listing.noPendingSlotRequests';
    }

    if (this.activeFilter === 'rejected') {
      return 'listing.noRejectedSlotRequests';
    }

    return 'listing.noSlotRequestsSubmitted';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
