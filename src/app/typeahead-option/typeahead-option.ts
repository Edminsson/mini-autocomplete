import { FocusableOption, FocusOrigin, Highlightable, ListKeyManagerOption } from '@angular/cdk/a11y';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';

 export class OptionSelectionChange<T = any> {
   constructor(
     /** Reference to the option that emitted the event. */
     public source: TypeaheadOption<T>,
     /** Whether the change in the option's value was a result of a user action. */
     public isUserInput = false,
   ) {}
 }

@Component({
  selector: 'app-typeahead-option',
  imports: [],
  templateUrl: './typeahead-option.html',
  styleUrl: './typeahead-option.scss',  
  host: {
    'role': 'option',
    '[class.mat-mdc-option-active]': 'active',
    'class': 'typeahead-option',
  },
})
export class TypeaheadOption<T = any> implements ListKeyManagerOption, Highlightable, FocusableOption {
  private _element = inject<ElementRef<HTMLElement>>(ElementRef);
  private _active = false;
  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _selected = false;

   /** Event emitted when the option is selected or deselected. */
   // tslint:disable-next-line:no-output-on-prefix
   @Output() readonly onSelectionChange = new EventEmitter<OptionSelectionChange<T>>();
 

   /** Element containing the option's text. */
   @ViewChild('text', {static: true}) _text: ElementRef<HTMLElement> | undefined;
 
   /**
    * Whether or not the option is currently active and ready to be selected.
    * An active option displays styles as if it is focused, but the
    * focus is actually retained somewhere else. This comes in handy
    * for components like autocomplete where focus must remain on the input.
    */
    get active(): boolean {
      return this._active;
    }

   /** The form value of the option. */
   @Input() value?: T;

   /**
    * The displayed value of the option. It is necessary to show the selected option in the
    * select's trigger.
    */
   get viewValue(): string {
     // TODO(kara): Add input property alternative for node envs.
     return (this._text?.nativeElement.textContent || '').trim();
   }

   /** Whether or not the option is currently selected. */
   get selected(): boolean {
     return this._selected;
   }

  /** Sets focus onto this option. */
   focus(_origin?: FocusOrigin, options?: FocusOptions): void {
    // Note that we aren't using `_origin`, but we need to keep it because some internal consumers
    // use `MatOption` in a `FocusKeyManager` and we need it to match `FocusableOption`.
    const element = this._getHostElement();

    if (typeof element.focus === 'function') {
      element.focus(options);
    }
  }

   /** Gets the host DOM element. */
   _getHostElement(): HTMLElement {
    return this._element.nativeElement;
  }

   /**
    * This method sets display styles on the option to make it appear
    * active. This is used by the ActiveDescendantKeyManager so key
    * events will display the proper options as active on arrow key events.
    */
    setActiveStyles(): void {
      if (!this._active) {
        this._active = true;
        this._changeDetectorRef.markForCheck();
      }
    }
  
    /**
     * This method removes display styles on the option that made it appear
     * active. This is used by the ActiveDescendantKeyManager so key
     * events will display the proper options as active on arrow key events.
     */
    setInactiveStyles(): void {
      if (this._active) {
        this._active = false;
        this._changeDetectorRef.markForCheck();
      }
    }

   /** Gets the label to be used when determining whether the option should be focused. */
   getLabel(): string {
     return this.viewValue;
   }

   /**
    * `Selects the option while indicating the selection came from the user. Used to
    * determine if the select's view -> model callback should be invoked.`
    */
   _selectViaInteraction(): void {
    this._selected = true;
    this._changeDetectorRef.markForCheck();
    this._emitSelectionChangeEvent(true);
   }


   /** Emits the selection change event. */
   private _emitSelectionChangeEvent(isUserInput = false): void {
     this.onSelectionChange.emit(new OptionSelectionChange<T>(this, isUserInput));
   }
 
   /** Selects the option. */
   select(emitEvent = true): void {
     if (!this._selected) {
       this._selected = true;
       this._changeDetectorRef.markForCheck();
 
       if (emitEvent) {
         this._emitSelectionChangeEvent();
       }
     }
   }
 
   /** Deselects the option. */
   deselect(emitEvent = true): void {
     if (this._selected) {
       this._selected = false;
       this._changeDetectorRef.markForCheck();
 
       if (emitEvent) {
         this._emitSelectionChangeEvent();
       }
     }
   }


}
