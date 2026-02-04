import { Component, inject } from '@angular/core';
import { RoleService, UserRole } from '../../../services/role.service';
import { LogInComponent } from "../../log-in/log-in.component";
import { ModalService } from '../../../services/modal.service';
import { SignUpComponent } from "../../sign-up/sign-up.component";
import { SellerSignUpComponent } from "../../seller-sign-up/seller-sign-up.component";
import { ForgotPasswordComponent } from "../../forgot-password/forgot-password.component";
import { OtpVerificationComponent } from "../../otp-verification/otp-verification.component";
import { ResetPasswordComponent } from "../../reset-password/reset-password.component";

@Component({
  selector: 'app-role-modal',
  imports: [LogInComponent, SignUpComponent, SellerSignUpComponent, ForgotPasswordComponent, OtpVerificationComponent, ResetPasswordComponent],
  templateUrl: './role-modal.component.html',
  styleUrl: './role-modal.component.css'
})
export class RoleModalComponent {

  private roleService = inject(RoleService);
  role = this.roleService.currentRole;

  constructor(public modal: ModalService) { }

  switchRole(event: Event) {
    const role = (event.target as HTMLInputElement).value;
    const newRole: UserRole = role as UserRole;
    this.roleService.setRole(newRole);
  }
}
