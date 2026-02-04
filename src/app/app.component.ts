import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoaderService } from './services/loader.service';
import { NotificationService } from './services/notification.service';
import { LoaderComponent } from './components/shared/loader/loader.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'setup';
  showLoader = true;
  private subscription!: Subscription;

  constructor(private router: Router, private loaderService: LoaderService, private notificationService: NotificationService) {
  }
  ngOnInit() {

    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        // this.notificationService.requestPermission()
      }
    });

    this.subscription = this.loaderService.showLoader$.subscribe(value => {
      this.showLoader = value;
    });
    this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationEnd) {
        const existingScript = document.querySelector('script[src="js/main.js"]');
        if (existingScript) {
          existingScript.remove();
        }
        const scriptElement = document.createElement('script');
        scriptElement.src = 'js/main.js';
        scriptElement.async = true;
        document.body.appendChild(scriptElement);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
