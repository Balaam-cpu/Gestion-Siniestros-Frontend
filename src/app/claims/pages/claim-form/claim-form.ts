import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { getErrorMessages } from '../../../shared/http-error';
import { parseRouteId } from '../../../shared/route-params';
import { SaveClaimRequest } from '../../models/claim';
import { ClaimService } from '../../services/claim.service';

type ClaimField = 'policyNumber' | 'insuredName' | 'claimType' | 'estimatedAmount';

// Mismas reglas que valida la API (SaveClaimRequest del backend).
const MAX_LENGTHS = { policyNumber: 50, insuredName: 200, claimType: 100 } as const;

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
  templateUrl: './claim-form.html',
})
export class ClaimForm implements OnInit {
  private readonly claimService = inject(ClaimService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly id = input<string>();
  readonly isEdit = computed(() => this.id() !== undefined);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadErrors = signal<string[]>([]);
  readonly saveErrors = signal<string[]>([]);

  private claimId: number | null = null;

  readonly form = this.fb.group({
    policyNumber: this.fb.control('', [requiredText, Validators.maxLength(MAX_LENGTHS.policyNumber)]),
    insuredName: this.fb.control('', [requiredText, Validators.maxLength(MAX_LENGTHS.insuredName)]),
    claimType: this.fb.control('', [requiredText, Validators.maxLength(MAX_LENGTHS.claimType)]),
    estimatedAmount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01), maxTwoDecimals]),
  });

  ngOnInit(): void {
    if (!this.isEdit()) {
      return;
    }

    const claimId = parseRouteId(this.id());
    if (claimId === null) {
      this.loadErrors.set(['El identificador del siniestro no es válido.']);
      return;
    }

    this.claimId = claimId;
    this.loading.set(true);

    this.claimService
      .getClaim(claimId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (claim) => {
          this.form.setValue({
            policyNumber: claim.policyNumber,
            insuredName: claim.insuredName,
            claimType: claim.claimType,
            estimatedAmount: claim.estimatedAmount,
          });
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loadErrors.set(getErrorMessages(error));
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

    const isNew = this.claimId === null;
    const save$ = isNew
      ? this.claimService.createClaim(request)
      : this.claimService.updateClaim(this.claimId as number, request);

    this.saving.set(true);
    this.saveErrors.set([]);

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (claim) => {
        const notice = isNew ? 'Siniestro creado correctamente.' : 'Cambios guardados correctamente.';
        void this.router.navigate(['/claims', claim.id], { state: { notice } });
      },
      error: (error: unknown) => {
        this.saveErrors.set(getErrorMessages(error));
        this.saving.set(false);
      },
    });
  }
}
