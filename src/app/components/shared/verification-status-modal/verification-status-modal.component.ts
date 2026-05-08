import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-verification-status-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verification-status-modal.component.html',
  styleUrl: './verification-status-modal.component.css'
})
export class VerificationStatusModalComponent {
  @Input() type: 'private' | 'company' = 'private';

  constructor(private modal: ModalService) { }

  get title(): string {
    return this.type === 'company'
      ? 'Verification Submitted'
      : 'Account Verified Successfully';
  }

  get description(): string {
    return this.type === 'company'
      ? 'Your account is under review. We will contact you shortly.'
      : 'Your email has been verified. You can now continue using CarZone.';
  }

  get actionLabel(): string {
    return this.type === 'company' ? 'Explore CarZone' : 'Continue';
  }

  async continueToApp() {
    await this.modal.closeActiveModal();
  }
}
