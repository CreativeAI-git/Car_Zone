import { HttpClient } from '@angular/common/http';
import { Injectable, signal, } from '@angular/core';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { RoleService } from './role.service';
@Injectable({
  providedIn: 'root'
})

export class CommonService {
  baseUrl = environment.apiUrl
  userData = signal<any>(null);
  sellerData = signal<any>(null);
  currentUser = signal<any>(null);
  constructor(private http: HttpClient, private router: Router, private roleService: RoleService) { }

  get<T>(url: string, params?: any): Observable<T> {
    return this.http.get<T>(this.baseUrl + url, { params });
  };

  post<T, U>(url: string, data: U): Observable<T> {
    return this.http.post<T>(this.baseUrl + url, data)
  };

  update<T, U>(url: string, data: U): Observable<T> {
    return this.http.post<T>(this.baseUrl + url, data)
  };

  delete<T>(url: string, data?: any): Observable<T> {
    return this.http.delete<T>(this.baseUrl + url, { body: data });
  };

  getProfile() {
    this.get('user/web/getUserProfile').subscribe((res: any) => {
      this.userData.set(res.data)
    })
  }
}
