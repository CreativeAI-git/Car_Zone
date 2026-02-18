import { ApplicationConfig } from '@angular/core';
import { InMemoryScrollingOptions, provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpInterceptorService } from './interceptors/http.interceptor';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from "@ngx-translate/http-loader"
import { getAuth, provideAuth } from '@angular/fire/auth';
const scrollConfig: InMemoryScrollingOptions = {
  scrollPositionRestoration: 'top',
  anchorScrolling: 'enabled',
};

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withInMemoryScrolling(scrollConfig)),
  provideFirebaseApp(() =>
    initializeApp(environment.firebaseConfig)
  ),
  provideAuth(() => getAuth()),
  provideMessaging(() => getMessaging()),
  provideFirestore(() => getFirestore()),
  provideAnimations(),
  provideNzI18n(en_US),
  provideHttpClient(
    withInterceptorsFromDi()
  ),
  {
    provide: HTTP_INTERCEPTORS,
    useClass: HttpInterceptorService,
    multi: true,
  },
  provideAnimationsAsync(),
  provideHttpClient(),
  provideTranslateService({
    lang: 'en',
    fallbackLang: 'en',
    loader: provideTranslateHttpLoader({
      prefix: '/i18n/',
      suffix: '.json'
    })
  }),
  ]
};