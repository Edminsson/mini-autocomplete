import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Typeahead } from './typeahead/typeahead';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Typeahead],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('mini-autocomplete');
}
