import { Component, ViewChild, ElementRef, TemplateRef, ViewContainerRef, inject, ContentChildren, QueryList, ChangeDetectorRef, ViewChildren } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ActiveDescendantKeyManager } from '@angular/cdk/a11y';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable, startWith, Subscription, switchMap, tap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { SearchService } from '../search-service';
import { TypeaheadOption } from '../typeahead-option/typeahead-option';
import { TypeaheadTrigger } from '../typeahead-trigger';

@Component({
  selector: 'app-typeahead',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TypeaheadOption, TypeaheadTrigger],
  templateUrl: './typeahead.html',
  styleUrl: './typeahead.scss'
})
export class Typeahead {
  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  @ViewChild('resultsPanel') resultsTemplate!: TemplateRef<any>;
  /** Reference to all options within the autocomplete. */
  //@ContentChildren(TypeaheadOption, {descendants: true}) options!: QueryList<TypeaheadOption>;
  @ViewChildren(TypeaheadOption) options!: QueryList<TypeaheadOption>;

  private _changeDetectorRef = inject(ChangeDetectorRef);

  searchControl = new FormControl('');
  keyManager: ActiveDescendantKeyManager<any> | undefined;
  isPanelOpen = false;
  /** Whether the autocomplete panel should be visible, depending on option length. */
  showPanel: boolean = false;

  open = false;
  searchService = inject(SearchService);
  filteredOptions?: Observable<string[]>;

  constructor(
    private overlay: Overlay,
    private viewContainerRef: ViewContainerRef,
  ) { }

  ngOnInit() {
    this.filteredOptions = this.searchControl.valueChanges.pipe(
      startWith(''),
      switchMap(value => this.searchService._filter$(value || '')),
    );
  }

  ngAfterViewInit() {
    this.keyManager = new ActiveDescendantKeyManager<TypeaheadOption>(this.options)
      .withWrap()
      .skipPredicate(this._skipPredicate);
    // this._activeOptionChanges = this._keyManager.change.subscribe(index => {
    //   if (this.isOpen) {
    //     this.optionActivated.emit({source: this, option: this.options.toArray()[index] || null});
    //   }
    // });

    // Set the initial visibility state.
    this._setVisibility();
  }

  ngOnDestroy() {
    this.keyManager?.destroy();
    //this._activeOptionChanges.unsubscribe();
  }

  protected _skipPredicate() {
    return false;
  }

  /** Panel should hide itself when the option list is empty. */
  _setVisibility() {
    this.showPanel = !!this.options?.length;
    this._changeDetectorRef.markForCheck();
  }

  updateKeyManager() {
    // Initialize key manager with the list of items
    // This needs access to the list items as QueryList
  }

}
