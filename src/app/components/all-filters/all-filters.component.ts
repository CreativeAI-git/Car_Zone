import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonService } from '../../services/common.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-all-filters',
  imports: [TranslateModule],
  templateUrl: './all-filters.component.html',
  styleUrl: './all-filters.component.css'
})
export class AllFiltersComponent {
  private destroy$ = new Subject<void>();

  fuelTypes: any[] = [];
  transmissions: any[] = [];
  conditions: any[] = [];
  driveTypes: any[] = [];
  bodyTypes: any[] = [];
  carColors: any[] = [];
  carState: any[] = [];
  warrantyList: any[] = [];
  energyEfficiencyOptions: any[] = [];
  kilometersRangeAnalytics: any[] = [];
  constructor(private service: CommonService, private message: NzMessageService) {
  }

  ngOnInit(): void {
    this.getKilometersRange();
    this.getFuelTypes();
    this.getTransmissions();
    this.getDriveTypes();
    this.getBodyTypes();
    this.getVhicleConditions();
    this.getCarState();
    this.getWarrantyList()
    this.getCarColors();
    this.getEnergyEfficiency();
  }

  getKilometersRange() {
    this.service.get(`user/kilometers-range-analytics`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.kilometersRangeAnalytics = res?.data || [];
      },
      error: (error) => {
        console.error('Error fetching kilometers range:', error);
      }
    });
  }

  getFuelTypes() {
    this.service.get(`user/fuel?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const data = res?.data || {};

        this.fuelTypes = [
          {
            label: 'Standard',
            options: (data.standard || []).map((x: any) => ({
              label: x.label,
              value: x.id
            }))
          },
          {
            label: 'Hybrid',
            options: (data.hybrid || []).map((x: any) => ({
              label: x.label,
              value: x.id
            }))
          },
          {
            label: 'Gas',
            options: (data.gas || []).map((x: any) => ({
              label: x.label,
              value: x.id
            }))
          },
          {
            label: 'Other',
            options: (data.other || []).map((x: any) => ({
              label: x.label,
              value: x.id
            }))
          }
        ];
      },
      error: (error) => {
        console.error('Error fetching fuel types:', error);
      }
    });
  }


  getTransmissions() {
    this.service.get(`user/transmission?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.transmissions = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching transmissions:', error);
      }
    });
  }

  getDriveTypes() {
    this.service.get(`user/drive?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.driveTypes = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching drive types:', error);
      }
    });
  }

  getBodyTypes() {
    this.service.get(`user/body-type?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.bodyTypes = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching body types:', error);
      }
    });
  }

  getVhicleConditions() {
    this.service.get(`user/vehicle-conditions?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.conditions = res?.data || [];
      },
      error: (error) => {
        console.error('Error fetching vehicle conditions:', error);
      }
    });
  }

  getCarState() {
    this.service.get(`user/vichel-state?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.carState = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching car state:', error);
      }
    });
  }

  getWarrantyList() {
    this.service.get(`user/warranty?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.warrantyList = (res?.data || []).sort((a: { id: number; }, b: { id: number; }) => a.id - b.id);
      },
      error: (error) => {
        console.error('Error fetching warranty list:', error);
      }
    });
  }


  getCarColors() {
    this.service.get(`user/colors?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.carColors = res?.data || [];
      },
      error: (error) => {
        console.error('Error fetching car colors:', error);
      }
    });
  }

  getEnergyEfficiency() {
    this.service.get(`user/energy-efficiency?lang=${'en'}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.energyEfficiencyOptions = res?.data.types || [];
      },
      error: (error) => {
        console.error('Error fetching energy efficiency options:', error);
      }
    });
  }
}
