import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface SlotRequestSummary {
  requestedSlots: number | string;
  message: string;
  submittedAt: string;
  status: string;
}

@Component({
  selector: 'app-application-under-review',
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './application-under-review.component.html',
  styleUrl: './application-under-review.component.css'
})
export class ApplicationUnderReviewComponent {
  private readonly requestSummaryStorageKey = 'latestSlotRequestSummary';

  requestSummary: SlotRequestSummary = {
    requestedSlots: 0,
    message: '',
    submittedAt: new Date().toISOString(),
    status: 'underReview'
  };

  constructor(private router: Router, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
  }

  ngOnInit(): void {
    const navigationState = this.router.getCurrentNavigation()?.extras.state?.['requestSummary'];
    const historyState = history.state?.requestSummary;
    const storedState = sessionStorage.getItem(this.requestSummaryStorageKey);

    this.requestSummary = navigationState || historyState || (storedState ? JSON.parse(storedState) : this.requestSummary);
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(parsedDate);
  }

}
