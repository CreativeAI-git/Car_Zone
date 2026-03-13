import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-list-your-car',
  imports: [FormsModule, NzSelectModule, ReactiveFormsModule, CommonModule, TranslateModule],
  templateUrl: './list-your-car.component.html',
  styleUrl: './list-your-car.component.css'
})
export class ListYourCarComponent {

  constructor() { }

  ngOnInit(): void {
    this.loadScript();
  }

  loadScript() {
    const existingScript = document.querySelector('script[src="js/multistep-form.js"]');
    if (existingScript) {
      existingScript.remove();
    }
    const scriptElement = document.createElement('script');
    scriptElement.src = 'js/multistep-form.js';
    scriptElement.async = true;
    document.body.appendChild(scriptElement);
  }
}
