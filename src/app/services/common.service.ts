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

  getBlob(url: string, params?: any): Observable<Blob> {
    return this.http.get(this.baseUrl + url, {
      params,
      responseType: 'blob'
    });
  };

  post<T, U>(url: string, data: U): Observable<T> {
    return this.http.post<T>(this.baseUrl + url, data)
  };

  update<T, U>(url: string, data: U): Observable<T> {
    return this.http.post<T>(this.baseUrl + url, data)
  };

  listYourCar(data: FormData): Observable<any> {
    return this.http.post<any>(this.baseUrl + 'user/web/listYourCar', data);
  }

  getBrandsList(): Observable<any> {
    return this.http.get<any>(this.baseUrl + 'user/brands-list');
  }

  getModelsList(brandId: string | number): Observable<any> {
    return this.http.get<any>(this.baseUrl + 'user/models-list', {
      params: { brand_id: brandId }
    });
  }

  getVersionsList(modelId: string | number): Observable<any> {
    return this.http.get<any>(this.baseUrl + 'user/versions-list', {
      params: { model_id: modelId }
    });
  }

  delete<T>(url: string, data?: any): Observable<T> {
    return this.http.delete<T>(this.baseUrl + url, { body: data });
  };

  getProfile() {
    this.get('user/web/getUserProfile').subscribe((res: any) => {
      const userType = this.roleService.normalizeUserType(
        res?.data?.account_type ||
        res?.data?.userType ||
        res?.data?.role ||
        res?.data?.sellerType
      );

      this.roleService.setUserType(userType);
      this.userData.set(res.data)
    })
  }

  isApprovedCompany(userData: any): boolean {
    const accountType = this.roleService.normalizeUserType(
      userData?.account_type ||
      userData?.userType ||
      userData?.role ||
      userData?.sellerType
    );

    if (accountType !== 'company') {
      return true;
    }

    const companyApprovalStatus = String(
      userData?.companyApprovalStatus

    );

    return companyApprovalStatus === '1' || companyApprovalStatus === 'approved';
  }
}
