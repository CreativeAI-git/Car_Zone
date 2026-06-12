import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonService } from '../../services/common.service';
import { AuthService } from '../../services/auth.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ValidationErrorService } from '../../services/validation-error.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';
import { ChfFormatPipe } from '../../pipes/chf-format.pipe';

export interface PhysicalVisitPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  visitDate: string;
  visitTime: string;
  message?: string;
  car_id?: string | number;
  seller_id?: string | number;
}

@Component({
  selector: 'app-schedule-physical-visit',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule, RouterModule, SubmitButtonComponent, ChfFormatPipe],
  templateUrl: './schedule-physical-visit.component.html',
  styleUrl: './schedule-physical-visit.component.css'
})
export class SchedulePhysicalVisitComponent implements OnInit, OnDestroy {
  Form: FormGroup;
  loading: boolean = false;
  private destroy$ = new Subject<void>();
  carId: any;
  carData: any;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private toastr: NzMessageService,
    public validationErrorService: ValidationErrorService,
    private translate: TranslateService
  ) {
    this.Form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9+() -]+$'), Validators.minLength(8)]],
      visitDate: ['', [Validators.required, this.futureDateValidator]],
      visitTime: ['', [Validators.required]],
      message: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.carId = params.get('id');
      if (this.carId) {
        this.getCarDetail();
      }
    });

    this.patchUserData();
  }

  getCarDetail() {
    const token = this.authService.getToken();
    const endpoint = token ? `user/getCar/${this.carId}` : `user/asGuestUserGetCar/${this.carId}`;
    this.commonService.get(endpoint).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.carData = res;
      },
      error: (err) => console.error('Failed to fetch car details', err)
    });
  }

  patchUserData() {
    const userProfile = this.commonService.userData();
    if (!userProfile) {
      if (this.authService.isLogedIn()) {
        this.commonService.get('user/web/getUserProfile').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
          const profile = res.data;
          this.commonService.userData.set(profile);
          this.Form.patchValue({
            fullName: profile.fullName || '',
            email: profile.email || '',
            phoneNumber: `${profile.countryCode || ''}${profile.phoneNumber || ''}`
          });
        });
      }
    } else {
      this.Form.patchValue({
        fullName: userProfile.fullName || '',
        email: userProfile.email || '',
        phoneNumber: `${userProfile.countryCode || ''}${userProfile.phoneNumber || ''}`
      });
    }
  }

  futureDateValidator(control: any) {
    if (!control.value) return null;
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today ? null : { pastDate: true };
  }

  onSubmit() {
    if (this.Form.invalid) {
      this.Form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload: PhysicalVisitPayload = {
      ...this.Form.value,
      car_id: this.carData?.vehicle?.id,
      seller_id: this.carData?.seller?.id
    };

    this.commonService.post('user/web/schedule-physical-visit', payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.toastr.success(res.message || 'Physical visit scheduled successfully!');
          this.Form.reset();
        },
        error: (error: any) => {
          this.loading = false;
          this.toastr.error(error?.error?.message || error?.message || 'Unable to schedule visit. Please try again.');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

