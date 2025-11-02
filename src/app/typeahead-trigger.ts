import { ConnectedPosition, createFlexibleConnectedPositionStrategy, createOverlayRef, createRepositionScrollStrategy, FlexibleConnectedPositionStrategy, OverlayConfig, OverlayRef, PositionStrategy } from '@angular/cdk/overlay';
import { afterNextRender, Directive, ElementRef, EnvironmentInjector, inject, Injector, Input, NgZone, Renderer2, ViewContainerRef } from '@angular/core';
import { Typeahead } from './typeahead/typeahead';
import { defer, delay, filter, map, merge, Observable, startWith, Subject, Subscription, switchMap, tap, of as observableOf, take } from 'rxjs';
import { TemplatePortal } from '@angular/cdk/portal';
import { ENTER } from '@angular/cdk/keycodes';
import { OptionSelectionChange, TypeaheadOption } from './typeahead-option/typeahead-option';

@Directive({
  selector: 'input[appTypeahead]',
   host: {
     '(focusin)': 'onFocus()',
     '(keydown)': 'onKeydown($event)',
   },
})
export class TypeaheadTrigger {
  private _environmentInjector = inject(EnvironmentInjector);
  private _zone = inject(NgZone);
  private _renderer = inject(Renderer2);
  private _element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private _overlayRef?: OverlayRef | null;
  private _overlayAttached: boolean = false;
  overlayRef!: OverlayRef;
  private _initialized = new Subject();
  private _injector = inject(Injector);
  /** Class to apply to the panel when it's above the input. */
  private _aboveClass = 'mat-mdc-autocomplete-panel-above';
  private _positionStrategy?: FlexibleConnectedPositionStrategy;
  private _outsideClickSubscription?: Subscription | null;
  /** The subscription for closing actions (some are bound to document). */
  private _closingActionsSubscription?: Subscription;

  viewContainerRef = inject(ViewContainerRef);
  isPanelOpen = false;

  typeahead = inject<Typeahead>(Typeahead);

 
  //@Input('appTypeahead') typeahead!: Typeahead;
   /**
    * Position of the autocomplete panel relative to the trigger element. A position of `auto`
    * will render the panel underneath the trigger if there is enough space for it to fit in
    * the viewport, otherwise the panel will be shown above it. If the position is set to
    * `above` or `below`, the panel will always be shown above or below the trigger. no matter
    * whether it fits completely in the viewport.
    */
   @Input('typeaheadPosition') position: 'auto' | 'above' | 'below' = 'auto';
 
  constructor() { }

   /** The currently active option, coerced to MatOption type. */
   get activeOption(): TypeaheadOption | null {
     if (this.typeahead && this.typeahead.keyManager) {
       return this.typeahead.keyManager.activeItem;
     }
 
     return null;
   }


  ngAfterViewInit() {
    this._initialized.next(null);
    this._initialized.complete();
  }

  onKeydown(event: KeyboardEvent) {
    console.log('onKeydown', this.typeahead.keyManager, this.typeahead.options.length);

    const keyCode = event.keyCode;
 
    if (this.typeahead.keyManager) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        this.typeahead.keyManager.onKeydown(event);
        event.preventDefault();
      } else if (event.key === 'Enter' && this.typeahead.keyManager.activeItem) {

        this.activeOption?._selectViaInteraction();
        //this._resetActiveItem();
        event.preventDefault();
      } else if (event.key === 'Escape') {
        this.closePanel();
        event.preventDefault();
      }
    }
  }

  onFocus() {
    this.openPanel();
  }

  selectState(option: string) {
    this.typeahead.searchControl.setValue(option, { emitEvent: false });
    this.closePanel();
  }

  closePanel() {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.detach();
      this.isPanelOpen = false;
      this._closingActionsSubscription?.unsubscribe();
    }

    //Jag placerade denna här. Lite annorlunda placerad i den stora hanteringen.
    this._outsideClickSubscription?.unsubscribe();
  }

  openPanel() {
    if (!this.overlayRef) {
       this.overlayRef = createOverlayRef(this._injector, this._getOverlayConfig());

      //Jag placerade denna här. Lite annorlunda placerad i den stora hanteringen.
      if (!this._outsideClickSubscription) {
        // Subscribe to the pointer events stream so that it doesn't get picked up by other overlays.
        // TODO(crisbeto): we should switch `_getOutsideClickStream` eventually to use this stream,
        // but the behvior isn't exactly the same and it ends up breaking some internal tests.
        //Om vi stänger panelen här så stänger vi den (och avbryter subscription) så fort vi
        // klickar på input.
        this._outsideClickSubscription = this.overlayRef.outsidePointerEvents()
        .subscribe((x) => console.log('outside', x));
      }
    }

    if (!this.overlayRef.hasAttached()) {
      const portal = new TemplatePortal(this.typeahead.resultsTemplate, this.viewContainerRef);
      this.overlayRef.attach(portal);
      this.isPanelOpen = true; //Egen kod. Inte från mat-autocomplete.
      this._closingActionsSubscription = this._subscribeToClosingActions();

    }
  }

   private _getOverlayConfig(): OverlayConfig {
     return new OverlayConfig({
       positionStrategy: this._getOverlayPosition(),
       scrollStrategy: createRepositionScrollStrategy(this._injector),
       width: this._getPanelWidth(),
      //  direction: this._dir ?? undefined,
      //  hasBackdrop: this._defaults?.hasBackdrop,
      //  backdropClass: this._defaults?.backdropClass || 'cdk-overlay-transparent-backdrop',
      //  panelClass: this._overlayPanelClass,
      //  disableAnimations: this._animationsDisabled,
     });
   }

  private _getOverlayPosition(): PositionStrategy {
    // Set default Overlay Position
    const strategy = createFlexibleConnectedPositionStrategy(
      this._injector,
      this._element,
    )
      .withFlexibleDimensions(false)
      .withPush(false);

    this._setStrategyPositions(strategy);
    this._positionStrategy = strategy;
    return strategy;
  }

  /** Sets the positions on a position strategy based on the directive's input state. */
  private _setStrategyPositions(positionStrategy: FlexibleConnectedPositionStrategy) {
    // Note that we provide horizontal fallback positions, even though by default the dropdown
    // width matches the input, because consumers can override the width. See #18854.
    const belowPositions: ConnectedPosition[] = [
      {originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top'},
      {originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top'},
    ];

    // The overlay edge connected to the trigger should have squared corners, while
    // the opposite end has rounded corners. We apply a CSS class to swap the
    // border-radius based on the overlay position.
    const panelClass = this._aboveClass;
    const abovePositions: ConnectedPosition[] = [
      {originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', panelClass},
      {originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', panelClass},
    ];

    let positions: ConnectedPosition[];

    if (this.position === 'above') {
      positions = abovePositions;
    } else if (this.position === 'below') {
      positions = belowPositions;
    } else {
      positions = [...belowPositions, ...abovePositions];
    }

    positionStrategy.withPositions(positions);
  }

  private _getPanelWidth(): number | string {
    return this._getHostWidth();
  }

/** Returns the width of the input element, so the panel width can match it. */
private _getHostWidth(): number {
  return this._element.nativeElement.getBoundingClientRect().width;
}

  /**
  * This method listens to a stream of panel closing actions and resets the
  * stream every time the option list changes.
  */
  private _subscribeToClosingActions(): Subscription {
    const initialRender = new Observable(subscriber => {
      afterNextRender(
        () => {
          subscriber.next(null);
        },
        {injector: this._environmentInjector},
      );
    });
    const optionChanges =
      this.typeahead.options?.changes.pipe(
        tap(() => this._positionStrategy!.reapplyLastPosition()),
        // Defer emitting to the stream until the next tick, because changing
        // bindings in here will cause "changed after checked" errors.
        delay(0),
      ) ?? observableOf();

    // When the options are initially rendered, and when the option list changes...
    return (
      merge(initialRender, optionChanges)
        .pipe(
          // create a new stream of panelClosingActions, replacing any previous streams
          // that were created, and flatten it so our stream only emits closing events...
          switchMap(() =>
            this._zone.run(() => {
              return this.panelClosingActions;
            }),
          ),
          // when the first closing event occurs...
          take(1),
        )
        // set the value, close the panel, and complete.
        .subscribe(event => this._setValueAndClose(event))
    );
  }

  /**
  * This method closes the panel, and if a value is specified, also sets the associated
  * control to that value. It will also mark the control as dirty if this interaction
  * stemmed from the user.
  */
  private _setValueAndClose(event: OptionSelectionChange | null): void {
    //const panel = this.autocomplete;
    //const toSelect = event ? event.source : this._pendingAutoselectedOption;
    const toSelect = event?.source;

    if (toSelect) {
      // this._clearPreviousSelectedOption(toSelect);
      // this._assignOptionValue(toSelect.value);
      // // TODO(crisbeto): this should wait until the animation is done, otherwise the value
      // // gets reset while the panel is still animating which looks glitchy. It'll likely break
      // // some tests to change it at this point.
      // this._onChange(toSelect.value);
      // panel._emitSelectEvent(toSelect);

      this.selectState(toSelect.value);
      this._element.nativeElement.focus();
    }

    this.closePanel();
  }


  /**
  * A stream of actions that should close the autocomplete panel, including
  * when an option is selected, on blur, and when TAB is pressed.
  */
  get panelClosingActions(): Observable<OptionSelectionChange | null> {
    return merge(
      this.optionSelections,
      // this.typeahead.keyManager.tabOut.pipe(filter(() => this._overlayAttached)),
      // this._closeKeyEventStream,
      // this._getOutsideClickStream(),
      // this._overlayRef
      //   ? this._overlayRef.detachments().pipe(filter(() => this._overlayAttached))
      //   : observableOf(),
    ).pipe(
      // Normalize the output so we return a consistent type.
      map(event => (event instanceof OptionSelectionChange ? event : null)),
    );
  }


  /** Stream of changes to the selection state of the autocomplete options. */
  readonly optionSelections: Observable<OptionSelectionChange> = defer(() => {
    const options = this.typeahead ? this.typeahead.options : null;

    if (options) {
      return options.changes.pipe(
        startWith(options),
        switchMap(() => merge(...options.map(option => option.onSelectionChange))),
      );
    }

    // If there are any subscribers before `ngAfterViewInit`, the `autocomplete` will be undefined.
    // Return a stream that we'll replace with the real one once everything is in place.
    return this._initialized.pipe(switchMap(() => this.optionSelections));
  }) as Observable<OptionSelectionChange>;
 


}
