import { Component, effect, ElementRef, HostListener, inject, Renderer2, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';
import { CommonService } from '../../../services/common.service';
import { Subject, takeUntil } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../services/modal.service';
import { RoleModalComponent } from '../role-modal/role-modal.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, TranslateModule, CommonModule, RoleModalComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  private roleService = inject(RoleService);
  role = this.roleService.currentRole;
  @ViewChild('close') close: ElementRef | undefined;
  @ViewChild('navbar', { static: true }) navbar!: ElementRef;
  userData: any
  destroy$ = new Subject<void>();
  selectedLang: string = 'en'
  userRole: any;
  token: any
  constructor(private router: Router, public authService: AuthService, private commonService: CommonService, private toster: NzMessageService, private translate: TranslateService, public modalService: ModalService, private renderer: Renderer2) {
    this.translate.setDefaultLang('en');
    this.token = this.authService.getToken();
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.selectedLang = localStorage.getItem('lang') || 'en';
    this.userRole = localStorage.getItem('app_role');

    if (this.authService.isLogedIn()) {
      this.commonService.getProfile()
    }
    effect(() => {
      this.userData = this.commonService.userData()
    })
  }

  logout() {
    this.close?.nativeElement.click();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onCustomLangChange(lang: string) {
    this.selectedLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);

    this.commonService.post('user/changeLanguage', { language: lang }).pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
    })
  }

  getLanguage(langCode: string) {
    switch (langCode) {
      case 'de':
        return 'German';
      case 'en':
        return 'English';
      case 'it':
        return 'Italian';
      case 'fr':
        return 'French';
      default:
        return 'English';
    }
  }

  getImage(langCode: string) {
    switch (langCode) {
      case 'de':
        return 'img/german.png';
      case 'en':
        return 'img/USA.png';
      case 'it':
        return 'img/itli.png';
      case 'fr':
        return 'img/french.png';
      default:
        return 'img/USA.png';
    }
  }

  @HostListener('window:scroll', [])
  onScroll() {
    if (window.scrollY > 50) {
      this.renderer.addClass(this.navbar.nativeElement, 'scrolled');
    } else {
      this.renderer.removeClass(this.navbar.nativeElement, 'scrolled');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
