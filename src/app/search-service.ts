import { Injectable } from '@angular/core';
import { delay, map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  options: string[] = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

  _filter$(value: string): Observable<string[]> {
    const filterValue = value.toLowerCase();
    const options$ = of(this.options).pipe(delay(300));
    const result$ = options$.pipe(map(o => o.filter(option => option.toLowerCase().includes(filterValue)&&filterValue.length>0)));

    return result$;
  }  

  constructor() { }
}
