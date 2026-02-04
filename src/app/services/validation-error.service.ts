import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';

@Injectable({
      providedIn: 'root'
})
export class ValidationErrorService {

      getErrorMessage(label: string, control: AbstractControl | null): any {
            if (!control || !control.errors || !control.touched) {
                  return '';
            }

            const errors: ValidationErrors = control.errors;

            if (errors['required']) {
                  return `${label} is required.`;
            }

            if (errors['validatePhoneNumber']) {
                  return `Please enter valid number.`;
            }

            if (errors['invalidVIN']) {
                  return `${label} must be 17 characters long (A–Z, 0–9, no I/O/Q)`;
            }

            if (errors['minlength']) {
                  return `${label} must be at least ${errors['minlength'].requiredLength} characters long.`;
            }

            if (errors['maxlength']) {
                  return `${label} exceeds the maximum allowed length of ${errors['maxlength'].requiredLength} characters.`;
            }

            if (errors['email']) {
                  return `Please enter a valid email address.`;
            }

            if (errors['pattern']) {
                  return `Invalid ${label.toLowerCase()}.`;
            }

            if (errors['min']) {
                  return `${label} must be at least ${errors['min'].min}.`;
            }

            if (errors['max']) {
                  return `${label} must be no more than ${errors['max'].max}.`;
            }

            if (errors['strongPassword']) {
                  if (!errors['strongPassword'].isValidLength) {
                        return `${label} must be at least 8 characters long.`;
                  }
                  if (!errors['strongPassword'].hasUpperCase && errors['strongPassword'].isValidLength) {
                        return `${label} must contain at least one uppercase letter.`;
                  }
                  if (!errors['strongPassword'].hasLowerCase && errors['strongPassword'].hasUpperCase && errors['strongPassword'].isValidLength) {
                        return `${label} must contain at least one lowercase letter.`;
                  }
                  if (!errors['strongPassword'].hasNumeric && errors['strongPassword'].hasLowerCase && errors['strongPassword'].hasUpperCase && errors['strongPassword'].isValidLength) {
                        return `${label} must contain at least one number.`;
                  }
                  if (!errors['strongPassword'].hasSpecialCharacter && errors['strongPassword'].hasNumeric && errors['strongPassword'].hasLowerCase && errors['strongPassword'].hasUpperCase && errors['strongPassword'].isValidLength) {
                        return `${label} must contain at least one special character.`;
                  }
            }

            if (errors['dateRangeInvalid']) {
                  return `End date must be greater than start date.`;
            }

            if (errors['cannotContainSpace']) {
                  return `${label} cannot contain spaces.`;
            }

            if (errors['invalidGST']) {
                  return `${label} is not a valid GST number.`;
            }

            if (errors['timeRangeInvalid']) {
                  return `${label} is not a valid time range.`;
            }

            if (errors['notInteger']) {
                  return `Invalid ${label.toLowerCase()}.`;
            }
      }
}
