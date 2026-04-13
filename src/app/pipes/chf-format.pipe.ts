import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
      name: 'chfFormat'
})
export class ChfFormatPipe implements PipeTransform {
      transform(value: number | string): string {
            if (value == null || value === '') return '';

            const num = typeof value === 'string' ? parseFloat(value) : value;

            // Format with Swiss thousands separator (apostrophe)
            const formatted = num
                  .toFixed(0) // remove decimals
                  .replace(/\B(?=(\d{3})+(?!\d))/g, "'");

            return `${formatted}.- CHF`;
      }
}
