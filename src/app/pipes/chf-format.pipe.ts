import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
      name: 'chfFormat'
})
export class ChfFormatPipe implements PipeTransform {
      transform(value: number | string): string {
            if (value == null || value === '') return '';
            const num = typeof value === 'string' ? parseFloat(value) : value;
            const formatted = num.toFixed(2);
            return `${formatted}.- CHF`;
      }
}
