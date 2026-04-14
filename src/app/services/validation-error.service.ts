import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
      providedIn: 'root'
})
export class ValidationErrorService {
      constructor(private translate: TranslateService) { }

      getErrorMessage(label: string, control: AbstractControl | null): any {
            if (!control || !control.errors || !control.touched) {
                  return '';
            }

            const errors: ValidationErrors = control.errors;

            if (errors['required']) {
                  return this.translate.instant('validation.required', { label });
            }

            if (errors['validatePhoneNumber']) {
                  return this.translate.instant('validation.invalidPhoneNumber');
            }

            if (errors['invalidVIN']) {
                  return this.translate.instant('validation.invalidVin', { label });
            }

            if (errors['minlength']) {
                  return this.translate.instant('validation.minlength', {
                        label,
                        requiredLength: errors['minlength'].requiredLength
                  });
            }

            if (errors['maxlength']) {
                  return this.translate.instant('validation.maxlength', {
                        label,
                        requiredLength: errors['maxlength'].requiredLength
                  });
            }

            if (errors['email']) {
                  return this.translate.instant('validation.invalidEmail');
            }

            if (errors['pattern']) {
                  return this.translate.instant('validation.invalidField', { label });
            }

            if (errors['min']) {
                  return this.translate.instant('validation.min', { label, min: errors['min'].min });
            }

            if (errors['max']) {
                  return this.translate.instant('validation.max', { label, max: errors['max'].max });
            }

            if (errors['strongPassword']) {
                  if (!errors['strongPassword'].isValidLength) {
                        return this.translate.instant('validation.strongPassword.length', { label });
                  }
                  if (!errors['strongPassword'].hasUpperCase && errors['strongPassword'].isValidLength) {
                        return this.translate.instant('validation.strongPassword.uppercase', { label });
                  }
                  if (
                        !errors['strongPassword'].hasLowerCase &&
                        errors['strongPassword'].hasUpperCase &&
                        errors['strongPassword'].isValidLength
                  ) {
                        return this.translate.instant('validation.strongPassword.lowercase', { label });
                  }
                  if (
                        !errors['strongPassword'].hasNumeric &&
                        errors['strongPassword'].hasLowerCase &&
                        errors['strongPassword'].hasUpperCase &&
                        errors['strongPassword'].isValidLength
                  ) {
                        return this.translate.instant('validation.strongPassword.number', { label });
                  }
                  if (
                        !errors['strongPassword'].hasSpecialCharacter &&
                        errors['strongPassword'].hasNumeric &&
                        errors['strongPassword'].hasLowerCase &&
                        errors['strongPassword'].hasUpperCase &&
                        errors['strongPassword'].isValidLength
                  ) {
                        return this.translate.instant('validation.strongPassword.specialCharacter', { label });
                  }
            }

            if (errors['dateRangeInvalid']) {
                  return this.translate.instant('validation.endDateAfterStartDate');
            }

            if (errors['cannotContainSpace']) {
                  return this.translate.instant('validation.noSpaces', { label });
            }

            if (errors['invalidGST']) {
                  return this.translate.instant('validation.invalidGst', { label });
            }

            if (errors['timeRangeInvalid']) {
                  return this.translate.instant('validation.invalidTimeRange', { label });
            }

            if (errors['notInteger']) {
                  return this.translate.instant('validation.invalidField', { label });
            }

            return '';
      }
}
