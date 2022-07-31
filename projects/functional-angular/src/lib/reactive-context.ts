import { ChangeDetectorRef, inject, ViewRef } from '@angular/core';
import { noop, Observable, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface ReactiveContext<T> {

  connect<T>(stream$: Observable<T>): ReactiveContext<T>;

  subscribe(next?: (value: T) => void, error?: (e: any) => void, complete?: () => void): Subscription;

  subscribeAndRender(next?: (value: T) => void, error?: (e: any) => void, complete?: () => void): Subscription;

  unsubscribe(): void;

}

export function useReactiveContext<T>(stream$?: Observable<T>, cd?: ChangeDetectorRef): ReactiveContext<T> {

  const changeDetector = cd ? cd : inject(ChangeDetectorRef),
    unsub$ = new Subject<void>();

  let innerStream$: Observable<T> | undefined;

  if (stream$) {
    innerStream$ = stream$.pipe(takeUntil(unsub$));
  }

  (changeDetector as ViewRef).onDestroy(() => {
    unsub$.next();
    unsub$.complete();
  });

  const context = {
    connect: (stream$: Observable<T>) => {
      innerStream$ = stream$.pipe(takeUntil(unsub$));
      return context;
    },
    subscribe(next?: (value: T) => void, error?: (e: any) => void, complete?: () => void): Subscription {
      return innerStream$!.subscribe(next, error, complete);
    },
    subscribeAndRender(next?: (value: T) => void, error?: (e: any) => void, complete?: () => void): Subscription {
      return innerStream$!.subscribe((v) => {
          next ? next(v) : noop();
          changeDetector.detectChanges();
        },
        error,
        complete
      );
    },
    unsubscribe(): void {
      unsub$.next();
      unsub$.complete();
    }
  } as ReactiveContext<T>;
  return context;
}
