import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { getErrorMessages } from '../../../shared/http-error';
import { readNavigationNotice } from '../../../shared/navigation-notice';
import { parseRouteId } from '../../../shared/route-params';
import { CLAIM_STATUS_LABELS, CLAIM_STATUSES, Claim, ClaimStatus, ClaimStatusHistory } from '../../models/claim';
import { ClaimService } from '../../services/claim.service';

@Component({
  selector: 'app-claim-detail',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-detail.html',
})
export class ClaimDetail implements OnInit {
  private readonly claimService = inject(ClaimService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();

  readonly statusLabels = CLAIM_STATUS_LABELS;

  readonly claim = signal<Claim | null>(null);
  readonly history = signal<ClaimStatusHistory[]>([]);
  readonly loading = signal(true);
  readonly loadErrors = signal<string[]>([]);
  readonly historyErrors = signal<string[]>([]);
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

  ngOnInit(): void {
    const claimId = parseRouteId(this.id());
    if (claimId === null) {
      this.loadErrors.set(['El identificador del siniestro no es válido.']);
      this.loading.set(false);
      return;
    }

    this.claimId = claimId;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadErrors.set([]);

    forkJoin({
      claim: this.claimService.getClaim(this.claimId),
      history: this.claimService.getStatusHistory(this.claimId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ claim, history }) => {
          this.claim.set(claim);
          this.history.set(history);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loadErrors.set(getErrorMessages(error));
          this.loading.set(false);
        },
      });
  }

  changeStatus(): void {
    const newStatus = this.statusControl.value;
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
      .changeStatus(this.claimId, newStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (claim) => {
          this.claim.set(claim);
          this.statusControl.reset();
          this.changingStatus.set(false);
          this.notice.set(`Estado actualizado a "${this.statusLabels[claim.status]}".`);
          this.reloadHistory();
        },
        error: (error: unknown) => {
          this.actionErrors.set(getErrorMessages(error));
          this.changingStatus.set(false);
        },
      });
  }

  deleteClaim(): void {
    const claim = this.claim();
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
      .deleteClaim(this.claimId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          void this.router.navigate(['/claims'], { state: { notice: 'Siniestro eliminado correctamente.' } });
        },
        error: (error: unknown) => {
          this.actionErrors.set(getErrorMessages(error));
          this.deleting.set(false);
        },
      });
  }

  private reloadHistory(): void {
    this.historyErrors.set([]);

    this.claimService
      .getStatusHistory(this.claimId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => this.history.set(history),
        error: (error: unknown) => this.historyErrors.set(getErrorMessages(error)),
      });
  }
}
