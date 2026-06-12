import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonService } from '../../services/common.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ValidationErrorService } from '../../services/validation-error.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { RouterModule } from '@angular/router';
import { SubmitButtonComponent } from '../shared/submit-button/submit-button.component';

export interface PhysicalVisitPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  visitDate: string;
  visitTime: string;
  message?: string;
}

@Component({
  selector: 'app-schedule-physical-visit',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule, RouterModule, SubmitButtonComponent],
  templateUrl: './schedule-physical-visit.component.html',
  styleUrl: './schedule-physical-visit.component.css'
})
export class SchedulePhysicalVisitComponent implements OnDestroy {
  Form: FormGroup;
  loading: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
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
    const payload: PhysicalVisitPayload = this.Form.value;

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
