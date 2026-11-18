import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, EMPTY, map, merge, of, switchMap } from 'rxjs';
import { getErrorMessages, isNotFoundError } from '../../../shared/http-error';
import { readNavigationNotice } from '../../../shared/navigation-notice';
import { parseRouteId } from '../../../shared/route-params';
import { CLAIM_STATUS_LABELS, CLAIM_STATUSES, Claim, ClaimStatus, ClaimStatusHistory } from '../../models/claim';
import { ClaimService } from '../../services/claim.service';

type DetailLoadResult =
  | { kind: 'claim'; claim: Claim }
  | { kind: 'claimError'; errors: string[]; retryable: boolean }
  | { kind: 'history'; history: ClaimStatusHistory[] }
  | { kind: 'historyError'; errors: string[]; retryable: boolean };

@Component({
  selector: 'app-claim-detail',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-detail.component.html',
})
export class ClaimDetailComponent implements OnInit {
  private readonly claimService = inject(ClaimService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();
  private readonly id$ = toObservable(this.id);

  readonly statusLabels = CLAIM_STATUS_LABELS;

  readonly claim = signal<Claim | null>(null);
  readonly history = signal<ClaimStatusHistory[]>([]);
  readonly loading = signal(true);
  readonly historyLoading = signal(true);
  readonly loadErrors = signal<string[]>([]);
  readonly canRetryClaim = signal(false);
  readonly historyErrors = signal<string[]>([]);
  readonly canRetryHistory = signal(false);
  readonly actionErrors = signal<string[]>([]);
  readonly notice = signal<string | null>(readNavigationNotice(this.router));
  readonly changingStatus = signal(false);
  readonly deleting = signal(false);

  readonly busy = computed(() => this.changingStatus() || this.deleting());

  /** Estados a los que se puede cambiar: todos excepto el actual. */
  readonly availableStatuses = computed(() => {
    const current = this.claim()?.status;
    return CLAIM_STATUSES.filter((status) => status !== current);
  });

  readonly statusControl = new FormControl<ClaimStatus | ''>('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  private claimId = 0;
  private historyRefreshPending = false;

  ngOnInit(): void {
    this.id$.pipe(
      map(parseRouteId),
      distinctUntilChanged(),
      switchMap((claimId, index) => {
        this.claimId = claimId ?? 0;
        this.canRetryClaim.set(false);
        this.historyRefreshPending = false;
        this.claim.set(null);
        this.history.set([]);
        this.loadErrors.set([]);
        this.historyErrors.set([]);
        this.canRetryHistory.set(false);
        this.actionErrors.set([]);
        if (index > 0) { this.notice.set(null); } // conservar el aviso de la navegación inicial
        this.changingStatus.set(false);
        this.deleting.set(false);
        this.statusControl.reset('');
        this.loading.set(claimId !== null);
        this.historyLoading.set(claimId !== null);
        if (claimId === null) {
          this.loadErrors.set(['El identificador del siniestro no es válido.']);
          this.loading.set(false);
          this.historyLoading.set(false);
          return EMPTY;
        }
        const claim$ = this.claimService.getClaim(claimId).pipe(
          map((claim): DetailLoadResult => ({ kind: 'claim', claim })),
          catchError((error: unknown) => of({
            kind: 'claimError' as const,
            errors: getErrorMessages(error),
            retryable: !isNotFoundError(error),
          })),
        );
        const history$ = this.claimService.getStatusHistory(claimId).pipe(
          map((history): DetailLoadResult => ({ kind: 'history', history })),
          catchError((error: unknown) => of({
            kind: 'historyError' as const,
            errors: getErrorMessages(error),
            retryable: !isNotFoundError(error),
          })),
        );
        return merge(claim$, history$);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((result) => {
      switch (result.kind) {
        case 'claim':
          this.claim.set(result.claim);
          this.canRetryClaim.set(false);
          this.loading.set(false);
          break;
        case 'claimError':
          this.loadErrors.set(result.errors);
          this.canRetryClaim.set(result.retryable);
          this.loading.set(false);
          break;
        case 'history':
          this.history.set(result.history);
          this.canRetryHistory.set(false);
          this.historyLoading.set(false);
          this.refreshHistoryIfPending();
          break;
        case 'historyError':
          this.historyErrors.set(result.errors);
          this.canRetryHistory.set(result.retryable);
          this.historyLoading.set(false);
          this.refreshHistoryIfPending();
          break;
      }
    });
  }

  retryClaim(): void {
    const claimId = this.claimId;
    if (!claimId || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.loadErrors.set([]);
    this.claimService.getClaim(claimId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (claim) => {
        if (this.claimId !== claimId) { return; }
        this.claim.set(claim);
        this.canRetryClaim.set(false);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (this.claimId !== claimId) { return; }
        this.loadErrors.set(getErrorMessages(error));
        this.canRetryClaim.set(!isNotFoundError(error));
        this.loading.set(false);
      },
    });
  }

  changeStatus(): void {
    const newStatus = this.statusControl.value;
    const claimId = this.claimId;
    if (this.busy() || !this.claim()) {
      return;
    }
    if (newStatus === '') {
      this.statusControl.markAsTouched();
      return;
    }

    this.changingStatus.set(true);
    this.actionErrors.set([]);
    this.notice.set(null);

    this.claimService
      .changeStatus(claimId, newStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (claim) => {
          if (this.claimId !== claimId) { return; }
          this.claim.set(claim);
          this.statusControl.reset();
          this.changingStatus.set(false);
          this.notice.set(`Estado actualizado a "${this.statusLabels[claim.status]}".`);
          this.loadHistory(claimId);
        },
        error: (error: unknown) => {
          if (this.claimId !== claimId) { return; }
          this.actionErrors.set(getErrorMessages(error));
          this.changingStatus.set(false);
        },
      });
  }

  deleteClaim(): void {
    const claim = this.claim();
    const claimId = this.claimId;
    if (this.busy() || !claim) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar el siniestro de la póliza ${claim.policyNumber}? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) {
      return;
    }

    this.deleting.set(true);
    this.actionErrors.set([]);
    this.notice.set(null);

    this.claimService
      .deleteClaim(claimId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (this.claimId !== claimId) { return; }
          void this.router.navigate(['/claims'], { state: { notice: 'Siniestro eliminado correctamente.' } });
        },
        error: (error: unknown) => {
          if (this.claimId !== claimId) { return; }
          this.actionErrors.set(getErrorMessages(error));
          this.deleting.set(false);
        },
      });
  }

  private refreshHistoryIfPending(): void {
    if (!this.historyRefreshPending) { return; }
    this.historyRefreshPending = false;
    this.loadHistory(this.claimId);
  }

  retryHistory(): void {
    this.loadHistory(this.claimId);
  }

  private loadHistory(claimId: number): void {
    if (!claimId) {
      return;
    }
    if (this.historyLoading()) {
      this.historyRefreshPending = true;
      return;
    }

    this.historyLoading.set(true);
    this.historyErrors.set([]);
    this.claimService.getStatusHistory(claimId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (history) => {
        if (this.claimId !== claimId) { return; }
        this.history.set(history);
        this.canRetryHistory.set(false);
        this.historyLoading.set(false);
        this.refreshHistoryIfPending();
      },
      error: (error: unknown) => {
        if (this.claimId !== claimId) { return; }
        this.historyErrors.set(getErrorMessages(error));
        this.canRetryHistory.set(!isNotFoundError(error));
        this.historyLoading.set(false);
        this.refreshHistoryIfPending();
      },
    });
  }
}
