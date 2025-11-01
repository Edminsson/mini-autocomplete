import { Component, ViewChild, ElementRef, TemplateRef, ViewContainerRef, inject, ContentChildren, QueryList, ChangeDetectorRef, ViewChildren } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ActiveDescendantKeyManager } from '@angular/cdk/a11y';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable, startWith, switchMap, tap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { SearchService } from '../search-service';
import { TypeaheadOption } from '../typeahead-option/typeahead-option';

@Component({
  selector: 'app-typeahead',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TypeaheadOption],
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
  overlayRef!: OverlayRef;
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

  openPanel() {
    if (!this.overlayRef) {
      const positionStrategy = this.overlay.position()
        .flexibleConnectedTo(this.input)
        .withPositions([{
          originX: 'start',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top'
        }]);

      this.overlayRef = this.overlay.create({
        positionStrategy,
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
        width: this.input.nativeElement.offsetWidth
      });
    }

    if (!this.overlayRef.hasAttached()) {
      const portal = new TemplatePortal(this.resultsTemplate, this.viewContainerRef);
      this.overlayRef.attach(portal);
      this.isPanelOpen = true;
    }
  }

  closePanel() {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.detach();
      this.isPanelOpen = false;
    }
  }

  onKeydown(event: KeyboardEvent) {
    console.log('onKeydown', this.keyManager, this.options.length);
    if (this.keyManager) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    console.log('onKeydown - del 2', this.keyManager, this.keyManager.onKeydown, event);
        this.keyManager.onKeydown(event);
        event.preventDefault();
      } else if (event.key === 'Enter' && this.keyManager.activeItem) {
        this.selectState(this.keyManager.activeItem.value);
        event.preventDefault();
      } else if (event.key === 'Escape') {
        this.closePanel();
        event.preventDefault();
      }
    }
  }

  selectState(option: string) {
    this.searchControl.setValue(option, { emitEvent: false });
    this.closePanel();
  }

  updateKeyManager() {
    // Initialize key manager with the list of items
    // This needs access to the list items as QueryList
  }

}
