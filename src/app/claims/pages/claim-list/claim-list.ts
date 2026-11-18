import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { getErrorMessages } from '../../../shared/http-error';
import { readNavigationNotice } from '../../../shared/navigation-notice';
import { CLAIM_STATUS_LABELS, CLAIM_STATUSES, Claim, ClaimFilters, ClaimStatus } from '../../models/claim';
import { ClaimService } from '../../services/claim.service';

@Component({
  selector: 'app-claim-list',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-list.html',
})
export class ClaimList {
  private readonly claimService = inject(ClaimService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly statuses = CLAIM_STATUSES;
  readonly statusLabels = CLAIM_STATUS_LABELS;

  readonly notice = signal<string | null>(readNavigationNotice(inject(Router)));
  readonly claims = signal<Claim[]>([]);
  readonly loading = signal(false);
  readonly errors = signal<string[]>([]);
  readonly hasFilters = signal(false);

  readonly filterForm = this.fb.group({
    policyNumber: this.fb.control(''),
    status: this.fb.control<ClaimStatus | ''>(''),
  });

  constructor() {
    this.loadClaims();
  }

  search(): void {
    this.notice.set(null);
    this.loadClaims();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.search();
  }

  private loadClaims(): void {
    const { policyNumber, status } = this.filterForm.getRawValue();
    const filters: ClaimFilters = {
      policyNumber: policyNumber.trim() || undefined,
      status: status || undefined,
    };

    this.hasFilters.set(filters.policyNumber !== undefined || filters.status !== undefined);
    this.loading.set(true);
    this.errors.set([]);

    this.claimService
      .getClaims(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (claims) => {
          this.claims.set(claims);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.claims.set([]);
          this.errors.set(getErrorMessages(error));
          this.loading.set(false);
        },
      });
  }
}
