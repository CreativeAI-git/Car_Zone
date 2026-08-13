import { Injectable } from '@angular/core';
declare var bootstrap: any;

@Injectable({
      providedIn: 'root'
})
export class ModalService {
      private currentModal: any = null;

      private closeCurrentModal(): Promise<void> {
            return new Promise((resolve) => {
                  if (!this.currentModal) {
                        resolve();
                        return;
                  }

                  const modalEl = this.currentModal._element as HTMLElement;

                  if (modalEl.contains(document.activeElement)) {
                        (document.activeElement as HTMLElement)?.blur();
                  }

                  const cleanup = () => {
                        this.currentModal?.dispose();
                        this.currentModal = null;
                        resolve();
                  };

                  if (!modalEl.classList.contains('show')) {
                        cleanup();
                        return;
                  }

                  modalEl.addEventListener(
                        'hidden.bs.modal',
                        cleanup,
                        { once: true }
                  );

                  this.currentModal.hide();
            });
      }



      async openRoleSelectionModal(): Promise<void> {
            await this.closeCurrentModal();

            const modalElement = document.getElementById('ct_login_modal');
            if (!modalElement) return;

            this.currentModal = new bootstrap.Modal(modalElement, {
                  backdrop: 'static',
                  keyboard: false,
                  focus: true
            });

            this.currentModal.show();
      }

      async openLoginModal(): Promise<void> {
            await this.closeCurrentModal();

            const modalElement = document.getElementById('SignInModal');
            if (!modalElement) return;

            this.currentModal = new bootstrap.Modal(modalElement, {
                  backdrop: 'static',
                  keyboard: false,
                  focus: true
            });

            this.currentModal.show();
      }

      async openSignInModal(): Promise<void> {
            await this.closeCurrentModal();
            const el = document.getElementById('SignInModal');
            if (!el) return;
            this.currentModal = new bootstrap.Modal(el);
            this.currentModal.show();
      }

      async openPrivateSignUpModal(): Promise<void> {
            await this.closeCurrentModal();
            const el = document.getElementById('privateSignUpModal');
            if (!el) return;
            this.currentModal = new bootstrap.Modal(el);
            this.currentModal.show();
      }

      async openForgotPasswordModal(): Promise<void> {
            await this.closeCurrentModal();
            const el = document.getElementById('ForgotPassword');
            if (!el) return;
            this.currentModal = new bootstrap.Modal(el);
            this.currentModal.show();
      }

      async openResetPasswordModal(): Promise<void> {
            await this.closeCurrentModal();
            const el = document.getElementById('ResetPassword');
            if (!el) return;
            this.currentModal = new bootstrap.Modal(el);
            this.currentModal.show();
      }

      async openOtpVerificationModal(): Promise<void> {
            await this.closeCurrentModal();
            const el = document.getElementById('VerificationCode');
            if (!el) return;
            this.currentModal = new bootstrap.Modal(el);
            this.currentModal.show();
      }

      async openAccountVerifiedModal(): Promise<void> {
            await this.closeCurrentModal();
            const el = document.getElementById('AccountVerifiedModal');
            if (!el) return;
            this.currentModal = new bootstrap.Modal(el);
            this.currentModal.show();
      }

      async openVerificationSubmittedModal(): Promise<void> {
            await this.closeCurrentModal();
            const el = document.getElementById('VerificationSubmittedModal');
            if (!el) return;
            this.currentModal = new bootstrap.Modal(el);
            this.currentModal.show();
      }

      async openCompanyApprovalPendingModal(): Promise<void> {
            await this.closeCurrentModal();
            const el = document.getElementById('CompanyApprovalPendingModal');
            if (!el) return;
            this.currentModal = new bootstrap.Modal(el);
            this.currentModal.show();
      }

      async closeActiveModal(): Promise<void> {
            await this.closeCurrentModal();
      }

      closeLoginModal() {
            this.closeCurrentModal();
      }
}
