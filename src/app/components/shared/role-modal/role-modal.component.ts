import { Component, inject } from '@angular/core';
import { RoleService, UserType } from '../../../services/role.service';
import { LogInComponent } from "../../log-in/log-in.component";
import { ModalService } from '../../../services/modal.service';
import { SignUpComponent } from "../../sign-up/sign-up.component";
import { ForgotPasswordComponent } from "../../forgot-password/forgot-password.component";
import { OtpVerificationComponent } from "../../otp-verification/otp-verification.component";
import { ResetPasswordComponent } from "../../reset-password/reset-password.component";
import { TranslateModule } from '@ngx-translate/core';
import { VerificationStatusModalComponent } from "../verification-status-modal/verification-status-modal.component";

@Component({
  selector: 'app-role-modal',
  imports: [LogInComponent, SignUpComponent, ForgotPasswordComponent, OtpVerificationComponent, ResetPasswordComponent, TranslateModule, VerificationStatusModalComponent],
  templateUrl: './role-modal.component.html',
  styleUrl: './role-modal.component.css'
})
export class RoleModalComponent {

  private roleService = inject(RoleService);
  userType = this.roleService.currentUserType;

  constructor(public modal: ModalService) { }

  switchUserType(event: Event) {
    const value = (event.target as HTMLInputElement).value as UserType;
    this.roleService.setUserType(value);
  }
}
