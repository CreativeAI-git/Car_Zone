import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../../services/common.service';
import { RouterLink } from '@angular/router';
import { LoaderService } from '../../../services/loader.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-listing-slot-plan',
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './listing-slot-plan.component.html',
  styleUrl: './listing-slot-plan.component.css'
})
export class ListingSlotPlanComponent {
  private destroy$ = new Subject<void>();
  planList: any
  selectedPlan: any = null;

  constructor(private service: CommonService, private loader: LoaderService, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
  }

  ngOnInit(): void {
    this.loader.show()
    this.getPlans()
  }

  getPlans() {
    this.service.get('user/getMyPlan').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.planList = res.planData
      this.loader.hide()
    },
      err => {
        this.loader.hide()
      }
    )
  }

  get historyList(): any[] {
    return Array.isArray(this.planList?.history) ? this.planList.history : [];
  }

  getStatusClass(isActive: number | boolean): string {
    return isActive ? 'approved' : 'rejected';
  }

  getStatusKey(isActive: number | boolean): string {
    return isActive ? 'status.active' : 'status.expired';
  }

  getPurchaseTypeKey(type: string): string {
    return type === 'additional' ? 'common.additional' : 'common.main';
  }

  formatDate(date: string): string {
    if (!date) return '-';

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return '-';

    const lang = this.translate.currentLang || localStorage.getItem('lang') || 'en';
    const localeMap: Record<string, string> = {
      en: 'en-GB',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT'
    };

    return new Intl.DateTimeFormat(localeMap[lang] || 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(parsedDate);
  }

  formatPrice(value: string | number): string {
    const amount = Number(value);
    if (Number.isNaN(amount)) return 'CHF 0.00';
    return `CHF ${amount.toFixed(2)}`;
  }

  convert(val: string, type: 'used' | 'total'): number {
    if (!val) return 0;
    const [used, total] = val.replace(/\s/g, '').split('/').map(Number);
    return type === 'used' ? used : total;
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
