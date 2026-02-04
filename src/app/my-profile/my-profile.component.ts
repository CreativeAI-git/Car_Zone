import { Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-my-profile',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.css'
})
export class MyProfileComponent {
  @ViewChild('profileSidebar') profileSidebar!: ElementRef;
  @ViewChild('profileOverlay') profileOverlay!: ElementRef;
  @ViewChild('close') close: ElementRef | undefined;

  constructor(private renderer: Renderer2, private authService: AuthService, private router: Router) { }

  openSidebar() {
    this.renderer.addClass(this.profileSidebar.nativeElement, 'active');
    this.renderer.addClass(this.profileOverlay.nativeElement, 'active');
    this.renderer.addClass(document.body, 'profile-no-scroll');
  }

  closeSidebar() {
    this.renderer.removeClass(this.profileSidebar.nativeElement, 'active');
    this.renderer.removeClass(this.profileOverlay.nativeElement, 'active');
    this.renderer.removeClass(document.body, 'profile-no-scroll');
  }

  logout() {
    this.close?.nativeElement.click();
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
