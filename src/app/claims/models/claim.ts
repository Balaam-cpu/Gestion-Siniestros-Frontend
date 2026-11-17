export type ClaimStatus = 'Open' | 'InReview' | 'Closed';

export const CLAIM_STATUSES: readonly ClaimStatus[] = ['Open', 'InReview', 'Closed'];

export const CLAIM_STATUS_LABELS: Readonly<Record<ClaimStatus, string>> = {
  Open: 'Abierto',
  InReview: 'En revisión',
  Closed: 'Cerrado',
};

export interface Claim {
  id: number;
  policyNumber: string;
  insuredName: string;
  claimType: string;
  estimatedAmount: number;
  status: ClaimStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SaveClaimRequest {
  policyNumber: string;
  insuredName: string;
  claimType: string;
  estimatedAmount: number;
}

export interface ChangeClaimStatusRequest {
  status: ClaimStatus;
}

export interface ClaimStatusHistory {
  id: number;
  /** null en el evento inicial, cuando se crea el siniestro. */
  previousStatus: ClaimStatus | null;
  newStatus: ClaimStatus;
  changedAt: string;
}

export interface ClaimFilters {
  policyNumber?: string;
  status?: ClaimStatus;
}
