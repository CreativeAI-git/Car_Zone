import { Component } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../services/common.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-notifications',
  imports: [TranslateModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent {
  private destroy$ = new Subject<void>();
  notifications: any
  constructor(private service: CommonService, private message: NzMessageService, public translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
  }

  ngOnInit(): void {
    this.getNotificationList()
  }

  getNotificationList() {
    this.service.post('user/readAllNotifications', {}).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.notifications = res.data
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
