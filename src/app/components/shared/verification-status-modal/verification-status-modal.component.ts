import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input } from '@angular/core';
import { ModalService } from '../../../services/modal.service';
declare var bootstrap: any;

@Component({
  selector: 'app-verification-status-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verification-status-modal.component.html',
  styleUrl: './verification-status-modal.component.css'
})
export class VerificationStatusModalComponent {
  @Input() type: 'private' | 'company' = 'private';
  @Input() customTitle?: string;
  @Input() customDescription?: string;
  @Input() customActionLabel?: string;

  constructor(private modal: ModalService, private elementRef: ElementRef<HTMLElement>) { }

  get title(): string {
    if (this.customTitle) {
      return this.customTitle;
    }

    return this.type === 'company'
      ? 'Verification Submitted'
      : 'Account Verified Successfully';
  }

  get description(): string {
    if (this.customDescription) {
      return this.customDescription;
    }

    return this.type === 'company'
      ? 'Your account is under review. Our team will review it shortly, and you will be notified once it is approved or rejected.'
      : 'Your email has been verified. You can now continue using CarZone.';
  }

  get actionLabel(): string {
    if (this.customActionLabel) {
      return this.customActionLabel;
    }

    return this.type === 'company' ? 'Explore CarZone' : 'Continue';
  }

  async continueToApp() {
    const modalElement = this.elementRef.nativeElement.closest('.modal') as HTMLElement | null;

    if (modalElement) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
      modalInstance.hide();
      return;
    }

    await this.modal.closeActiveModal();
  }
}
