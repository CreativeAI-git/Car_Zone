import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../../services/common.service';
import { CommonModule } from '@angular/common';
import { ChfFormatPipe } from '../../../pipes/chf-format.pipe';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LoaderService } from '../../../services/loader.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-my-listings',
  imports: [RouterLink, CommonModule, ChfFormatPipe, TranslateModule, FormsModule],
  templateUrl: './my-listings.component.html',
  styleUrl: './my-listings.component.css'
})
export class MyListingsComponent {
  private destroy$ = new Subject<void>();
  carList: any[] = []
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'expired' = 'all';

  constructor(private service: CommonService, private loder: LoaderService, private translate: TranslateService) {
    this.translate.use(localStorage.getItem('lang') || 'en');
  }

  ngOnInit(): void {
    this.loder.show()
    this.getMyCars()
  }

  getMyCars() {
    this.service.get('user/getMyCar').pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.carList = res.data
      this.loder.hide()
    }, (error) => {
      this.loder.hide()
    })
  }

  get filteredCars(): any[] {
    return this.carList.filter((item) => {
      const matchesSearch = !this.searchTerm.trim() || this.getSearchableText(item)
        .includes(this.searchTerm.trim().toLowerCase());

      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && !!item.is_active) ||
        (this.statusFilter === 'expired' && !item.is_active);

      return matchesSearch && matchesStatus;
    });
  }

  get listingCountLabel(): string {
    return `${this.filteredCars.length} listing${this.filteredCars.length === 1 ? '' : 's'}`;
  }

  getListingTitle(item: any): string {
    return [item?.brandName, item?.carModel].filter(Boolean).join(' ');
  }

  getListingPrice(item: any): number {
    return Number(item?.selling_price || item?.totalPrice || 0);
  }

  getPrimaryImage(item: any): string {
    return item?.carImages?.[0] || 'img/icons/user-circle-img.png';
  }

  getSpecs(item: any): string[] {
    const specs = [
      item?.registration_year || item?.year,
      item?.mileage ? `${item.mileage} km` : null,
      item?.fuel_type_value || item?.fuelType,
      item?.horse_power ? `${item.horse_power} ps` : item?.power ? `${item.power} ps` : null,
      item?.transmission_value || item?.transmission,
      item?.consumption ? `${item.consumption} L / 100 Km` : null
    ];

    return specs.filter(Boolean);
  }

  private getSearchableText(item: any): string {
    return [
      this.getListingTitle(item),
      item?.brandName,
      item?.carModel,
      item?.fuel_type_value,
      item?.transmission_value,
      item?.body_type_value,
      item?.drive_type_value
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
