import { Component, effect, ElementRef, HostListener, inject, Renderer2, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';
import { CommonService } from '../../../services/common.service';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../services/modal.service';
import { RoleModalComponent } from '../role-modal/role-modal.component';
import { ChatService } from '../../../services/chat.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, TranslateModule, CommonModule, RoleModalComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  private roleService = inject(RoleService);
  userType = this.roleService.currentLoggedInUserType;
  @ViewChild('close') close: ElementRef | undefined;
  @ViewChild('navbar', { static: true }) navbar!: ElementRef;
  userData: any
  destroy$ = new Subject<void>();
  selectedLang: string = 'en'
  token: any
  unreadMessageCount: number = 0;
  private chatService = inject(ChatService);
  constructor(private router: Router, public authService: AuthService, private commonService: CommonService, private translate: TranslateService, public modalService: ModalService, private renderer: Renderer2) {
    this.translate.setDefaultLang('en');
    this.token = this.authService.getToken();
    this.translate.use(localStorage.getItem('lang') || 'en');
    this.selectedLang = localStorage.getItem('lang') || 'en';

    if (this.authService.isLogedIn()) {
      this.commonService.getProfile()
    }
    effect((onCleanup) => {
      this.userData = this.commonService.userData();
      this.roleService.currentLoggedInUserType(); // trigger immediately on login

      let userId = this.userData?.id;
      
      if (!userId && this.authService.isLogedIn()) {
         const userInfo = this.authService.getUserInfo();
         userId = userInfo?.id || userInfo;
      }

      if (userId) {
        const sub = this.chatService.getChatList(userId).subscribe(chats => {
          this.unreadMessageCount = chats.reduce((acc, chat) => {
            const count = chat.unreadCount?.[userId] || 0;
            return acc + count;
          }, 0);
        });
        onCleanup(() => {
          sub.unsubscribe();
        });
      } else {
        this.unreadMessageCount = 0;
      }
    });
  }

  listCar() {
    if (!this.authService.isLogedIn()) {
      this.modalService.openLoginModal();
      return;
    }

    if (!this.commonService.isApprovedCompany(this.userData)) {
      this.modalService.openCompanyApprovalPendingModal();
      return;
    }

    if (this.userData.slotAvailable) {
      this.router.navigate(['/list-your-car'])
    } else {
      this.router.navigate(['/choose-listing-plan'])
    }
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
        return this.translate.instant('common.languages.german');
      case 'en':
        return this.translate.instant('common.languages.english');
      case 'it':
        return this.translate.instant('common.languages.italian');
      case 'fr':
        return this.translate.instant('common.languages.french');
      default:
        return this.translate.instant('common.languages.english');
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
