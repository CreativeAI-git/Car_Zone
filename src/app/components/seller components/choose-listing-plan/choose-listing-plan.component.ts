import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../../services/common.service';
import { CommonModule, Location } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SubmitButtonComponent } from '../../shared/submit-button/submit-button.component';

type PlanDuration = 'monthly' | 'yearly';

interface ListingPlan {
  id: number;
  name: string;
  price: string;
  slot_count: number;
  plan_type: 'basic' | 'additional' | 'bulk';
  duration_type: PlanDuration;
  is_public: number;
  user_id: number | null;
}

@Component({
  selector: 'app-choose-listing-plan',
  imports: [RouterLink, CommonModule, TranslateModule, SubmitButtonComponent],
  templateUrl: './choose-listing-plan.component.html',
  styleUrl: './choose-listing-plan.component.css'
})
export class ChooseListingPlanComponent {
  private destroy$ = new Subject<void>();
  planList: ListingPlan[] = [];
  selectedPlan: ListingPlan | null = null;
  activeDuration: PlanDuration = 'monthly';
  isUsed: boolean = false;
  Loading: boolean = false;

  constructor(private service: CommonService, private message: NzMessageService, private translate: TranslateService, private location: Location,) {
    this.translate.use(localStorage.getItem('lang') || 'en');
  }

  ngOnInit(): void {
    this.getPlans()
  }

  getPlans() {
    this.service.get('user/getAllPlan').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.isUsed = res.alreadyUsed == 1 ? true : false;
      this.planList = res.plans || [];
    });
  }

  backClicked() {
    this.location.back();
  }

  get featuredPlans(): ListingPlan[] {
    return this.planList.filter((plan) => plan.plan_type === 'basic' || plan.plan_type === 'additional');
  }

  get monthlyPlans(): ListingPlan[] {
    return this.planList.filter((plan) => plan.plan_type === 'bulk' && plan.duration_type === 'monthly');
  }

  get yearlyPlans(): ListingPlan[] {
    return this.planList.filter((plan) => plan.plan_type === 'bulk' && plan.duration_type === 'yearly');
  }

  get visibleBulkPlans(): ListingPlan[] {
    return this.activeDuration === 'monthly' ? this.monthlyPlans : this.yearlyPlans;
  }

  setDuration(duration: PlanDuration) {
    this.activeDuration = duration;
  }

  selectPlan(plan: ListingPlan) {
    if (this.isUsed && plan.plan_type == 'basic') {
      return;
    }
    this.selectedPlan = plan;
  }

  purchasePlan() {
    if (!this.selectedPlan) {
      return;
    }

    this.Loading = true
    let formData = {
      plan_id: this.selectedPlan.id,
      success_url: window.location.origin + '/payment-success',
      cancel_url: window.location.origin + '/payment-failed',
    }
    this.service.post('user/purchaseSlotPlan', formData).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.Loading = false
        window.location.href = res.url
      },
      error: (error) => {
        this.message.error(error)
        this.Loading = false
      }
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
