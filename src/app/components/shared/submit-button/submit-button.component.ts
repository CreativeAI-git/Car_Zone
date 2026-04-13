import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-submit-button',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './submit-button.component.html',
  styleUrl: './submit-button.component.css'
})
export class SubmitButtonComponent {
  @Input() isLoading = false;
  @Input() text = 'Submit';
  @Input() disabled = false;
  @Input() class = '';
}
