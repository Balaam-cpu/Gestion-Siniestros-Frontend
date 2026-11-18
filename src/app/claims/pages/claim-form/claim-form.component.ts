import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, EMPTY, map, of, switchMap } from 'rxjs';
import { getErrorMessages, isNotFoundError } from '../../../shared/http-error';
import { parseRouteId } from '../../../shared/route-params';
import { Claim, SaveClaimRequest } from '../../models/claim';
import { ClaimService } from '../../services/claim.service';

type ClaimField = 'policyNumber' | 'insuredName' | 'claimType' | 'estimatedAmount';

type ClaimLoadResult =
  | { claimId: number; claim: Claim }
  | { claimId: number; errors: string[]; retryable: boolean };

// Mismas reglas que valida la API (SaveClaimRequest del backend).
const MAX_LENGTHS = { policyNumber: 50, insuredName: 200, claimType: 100 } as const;
const MAX_ESTIMATED_AMOUNT = 9_999_999_999_999.99;

const FIELD_LABELS: Record<ClaimField, string> = {
  policyNumber: 'El número de póliza',
  insuredName: 'El nombre del asegurado',
  claimType: 'El tipo de siniestro',
  estimatedAmount: 'El monto estimado',
};

function requiredText(control: AbstractControl<string>): ValidationErrors | null {
  return control.value?.trim() ? null : { required: true };
}

function maxTwoDecimals(control: AbstractControl<number | null>): ValidationErrors | null {
  const value = control.value;
  if (value == null) {
    return null;
  }
  return /^-?\d+(\.\d{1,2})?$/.test(String(value)) ? null : { decimals: true };
}

@Component({
  selector: 'app-claim-form',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-form.component.html',
})
export class ClaimFormComponent implements OnInit {
  private readonly claimService = inject(ClaimService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly id = input<string>();
  private readonly id$ = toObservable(this.id);
  readonly isEdit = computed(() => this.id() !== undefined);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadErrors = signal<string[]>([]);
  readonly saveErrors = signal<string[]>([]);
  readonly canRetryLoad = signal(false);
  readonly maxEstimatedAmount = MAX_ESTIMATED_AMOUNT;

  private claimId: number | null = null;

  readonly form = this.fb.group({
    policyNumber: this.fb.control('', [requiredText, Validators.maxLength(MAX_LENGTHS.policyNumber)]),
    insuredName: this.fb.control('', [requiredText, Validators.maxLength(MAX_LENGTHS.insuredName)]),
    claimType: this.fb.control('', [requiredText, Validators.maxLength(MAX_LENGTHS.claimType)]),
    estimatedAmount: this.fb.control<number | null>(null, [Validators.required, maxTwoDecimals]),
  });

  ngOnInit(): void {
    this.id$.pipe(
      distinctUntilChanged(),
      switchMap((routeId) => {
        this.claimId = null;
        this.canRetryLoad.set(false);
        this.form.reset({ policyNumber: '', insuredName: '', claimType: '', estimatedAmount: null });
        this.loadErrors.set([]);
        this.saveErrors.set([]);
        this.saving.set(false);
        if (routeId === undefined) {
          this.loading.set(false);
          return EMPTY;
        }
        const claimId = parseRouteId(routeId);
        if (claimId === null) {
          this.loadErrors.set(['El identificador del siniestro no es válido.']);
          this.loading.set(false);
          return EMPTY;
        }
        this.claimId = claimId;
        this.loading.set(true);
        return this.claimService.getClaim(claimId).pipe(
          map((claim): ClaimLoadResult => ({ claimId, claim })),
          catchError((error: unknown) => of({
            claimId,
            errors: getErrorMessages(error),
            retryable: !isNotFoundError(error),
          })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((result) => {
      if (result.claimId !== this.claimId) { return; }
      if ('claim' in result) {
        this.canRetryLoad.set(false);
        this.form.setValue({
          policyNumber: result.claim.policyNumber,
          insuredName: result.claim.insuredName,
          claimType: result.claim.claimType,
          estimatedAmount: result.claim.estimatedAmount,
        });
      } else {
        this.loadErrors.set(result.errors);
        this.canRetryLoad.set(result.retryable);
      }
      this.loading.set(false);
    });
  }

  retryLoad(): void {
    const claimId = this.claimId;
    if (claimId === null || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.loadErrors.set([]);
    this.claimService.getClaim(claimId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (claim) => {
        if (this.claimId !== claimId) { return; }
        this.canRetryLoad.set(false);
        this.form.setValue({
          policyNumber: claim.policyNumber,
          insuredName: claim.insuredName,
          claimType: claim.claimType,
          estimatedAmount: claim.estimatedAmount,
        });
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (this.claimId !== claimId) { return; }
        this.loadErrors.set(getErrorMessages(error));
        this.canRetryLoad.set(!isNotFoundError(error));
        this.loading.set(false);
      },
    });
  }

  fieldError(field: ClaimField): string | null {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) {
      return null;
    }

    const label = FIELD_LABELS[field];
    const errors = control.errors;

    if (errors['required']) {
      return `${label} es obligatorio.`;
    }
    if (errors['maxlength']) {
      return `${label} no puede exceder ${errors['maxlength'].requiredLength} caracteres.`;
    }
    if (errors['min']) {
      return `${label} debe ser mayor que cero.`;
    }
    if (errors['max']) {
      return `${label} no puede exceder ${MAX_ESTIMATED_AMOUNT.toLocaleString('es-MX')}.`;
    }
    if (errors['decimals']) {
      return `${label} admite como máximo dos decimales.`;
    }
    return `${label} no es válido.`;
  }

  submit(): void {
    if (this.saving() || this.loading()) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    const request: SaveClaimRequest = {
      policyNumber: value.policyNumber.trim(),
      insuredName: value.insuredName.trim(),
      claimType: value.claimType.trim(),
      estimatedAmount: value.estimatedAmount as number,
    };

    const claimId = this.claimId;
    const isNew = claimId === null;
    const save$ = isNew ? this.claimService.createClaim(request) : this.claimService.updateClaim(claimId as number, request);

    this.saving.set(true);
    this.saveErrors.set([]);

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (claim) => {
        if (this.claimId !== claimId) {
          return;
        }
        const notice = isNew ? 'Siniestro creado correctamente.' : 'Cambios guardados correctamente.';
        void this.router.navigate(['/claims', claim.id], { state: { notice } });
      },
      error: (error: unknown) => {
        if (this.claimId !== claimId) { return; }
        this.saveErrors.set(getErrorMessages(error));
        this.saving.set(false);
      },
    });
  }
}
