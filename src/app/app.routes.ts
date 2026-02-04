import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';

export const routes: Routes = [
      {
            path: '',
            loadComponent: () => import('./components/main/main.component').then(m => m.MainComponent),
            // canActivateChild: [authGuard],
            children: [
                  // {
                  //       path: 'home',
                  //       loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
                  // },
                  // {
                  //       path: '',
                  //       loadComponent: () => import('./components/browse-cars/browse-cars.component').then(m => m.BrowseCarsComponent)
                  // },
                  {
                        path: '',
                        loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
                  },
                  {
                        path: 'browse-cars',
                        loadComponent: () => import('./components/browse-cars/browse-cars.component').then(m => m.BrowseCarsComponent)
                  },
                  {
                        path: 'reels',
                        loadComponent: () => import('./components/reels/reels.component').then(m => m.ReelsComponent)
                  },
                  {
                        path: 'chats',
                        loadComponent: () => import('./components/chats/chats.component').then(m => m.ChatsComponent)
                  },
                  {
                        path: 'car-detail',
                        loadComponent: () => import('./components/car-detail/car-detail.component').then(m => m.CarDetailComponent)
                  },
                  {
                        path: 'my-profile',
                        loadComponent: () => import('./my-profile/my-profile.component').then(m => m.MyProfileComponent),
                        children: [
                              {
                                    path: 'edit-profile',
                                    loadComponent: () => import('./my-profile/edit-profile/edit-profile.component').then(m => m.EditProfileComponent),
                              },
                              {
                                    path: 'saved-reels',
                                    loadComponent: () => import('./my-profile/saved-reels/saved-reels.component').then(m => m.SavedReelsComponent),
                              },
                              {
                                    path: 'change-password',
                                    loadComponent: () => import('./my-profile/change-password/change-password.component').then(m => m.ChangePasswordComponent),
                              },
                              {
                                    path: 'wishlist',
                                    loadComponent: () => import('./my-profile/wishlist/wishlist.component').then(m => m.WishlistComponent)
                              },
                              {
                                    path: 'notifications',
                                    loadComponent: () => import('./my-profile/notifications/notifications.component').then(m => m.NotificationsComponent)
                              }
                        ]
                  },
                  {
                        path: 'contact-us',
                        loadComponent: () => import('./components/contact-us/contact-us.component').then(m => m.ContactUsComponent)
                  },
                  {
                        path: 'terms-conditions',
                        loadComponent: () => import('./components/terms-conditions/terms-conditions.component').then(m => m.TermsConditionsComponent)
                  },
                  {
                        path: 'privacy-policy',
                        loadComponent: () => import('./components/privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent)
                  },
                  {
                        path: 'application-approved',
                        loadComponent: () => import('./components/seller components/application-approved/application-approved.component').then(m => m.ApplicationApprovedComponent)
                  },
                  {
                        path: 'application-rejected',
                        loadComponent: () => import('./components/seller components/application-rejected/application-rejected.component').then(m => m.ApplicationRejectedComponent)
                  },
                  {
                        path: 'application-under-review',
                        loadComponent: () => import('./components/seller components/application-under-review/application-under-review.component').then(m => m.ApplicationUnderReviewComponent)
                  },
                  {
                        path: 'choose-listing-plan',
                        loadComponent: () => import('./components/seller components/choose-listing-plan/choose-listing-plan.component').then(m => m.ChooseListingPlanComponent)
                  },
                  {
                        path: 'edit-listing',
                        loadComponent: () => import('./components/seller components/edit-listings/edit-listings.component').then(m => m.EditListingsComponent)
                  },
                  {
                        path: 'list-your-car',
                        loadComponent: () => import('./components/seller components/list-your-car/list-your-car.component').then(m => m.ListYourCarComponent)
                  },
                  {
                        path: 'listing-slot-plan',
                        loadComponent: () => import('./components/seller components/listing-slot-plan/listing-slot-plan.component').then(m => m.ListingSlotPlanComponent)
                  },
                  {
                        path: 'my-listings',
                        loadComponent: () => import('./components/seller components/my-listings/my-listings.component').then(m => m.MyListingsComponent)
                  },
                  {
                        path: 'payment-success',
                        loadComponent: () => import('./components/seller components/payment-successful/payment-successful.component').then(m => m.PaymentSuccessfulComponent)
                  },
                  {
                        path: 'payment-failed',
                        loadComponent: () => import('./components/seller components/payment-failed/payment-failed.component').then(m => m.PaymentFailedComponent)
                  },
                  {
                        path: 'request-additional-slots',
                        loadComponent: () => import('./components/seller components/request-additional-slots/request-additional-slots.component').then(m => m.RequestAdditionalSlotsComponent)
                  },
                  {
                        path: 'our-visitors',
                        loadComponent: () => import('./components/our-visitors/our-visitors.component').then(m => m.OurVisitorsComponent)
                  },
                  {
                        path: 'reel-player',
                        loadComponent: () => import('./components/shared/reel-player/reel-player.component').then(m => m.ReelPlayerComponent)
                  },
            ]
      },
      {
            path: 'login',
            loadComponent: () => import('./components/log-in/log-in.component').then(m => m.LogInComponent),
            canActivate: [loginGuard]
      },
      {
            path: 'signup',
            loadComponent: () => import('./components/sign-up/sign-up.component').then(m => m.SignUpComponent)
      },
      {
            path: 'seller-signup',
            loadComponent: () => import('./components/seller-sign-up/seller-sign-up.component').then(m => m.SellerSignUpComponent)
      },
      {
            path: 'forgot-password',
            loadComponent: () => import('./components/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
      },
      {
            path: 'otp-verification',
            loadComponent: () => import('./components/otp-verification/otp-verification.component').then(m => m.OtpVerificationComponent),
      },
      {
            path: 'reset-password',
            loadComponent: () => import('./components/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
      }
];
