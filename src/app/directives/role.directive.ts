import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { RoleService, UserRole } from '../services/role.service';

@Directive({
      selector: '[appRole]',
      standalone: true,
})
export class RoleDirective {
      private roleService = inject(RoleService);
      private viewContainer = inject(ViewContainerRef);
      private templateRef = inject(TemplateRef);

      @Input('appRole') requiredRole!: UserRole;

      private showHide = effect(() => {
            this.viewContainer.clear();
            if (this.requiredRole && this.roleService.getLoggedInRole() === this.requiredRole) {
                  this.viewContainer.createEmbeddedView(this.templateRef);
            }
      });
}

