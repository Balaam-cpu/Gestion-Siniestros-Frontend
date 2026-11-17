import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChangeClaimStatusRequest, Claim, ClaimFilters, ClaimStatus, ClaimStatusHistory, SaveClaimRequest } from '../models/claim';

@Injectable({ providedIn: 'root' })
export class ClaimService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/claims`;

  getClaims(filters: ClaimFilters = {}): Observable<Claim[]> {
    let params = new HttpParams();

    const policyNumber = filters.policyNumber?.trim();
    if (policyNumber) {
      params = params.set('policyNumber', policyNumber);
    }

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<Claim[]>(this.baseUrl, { params });
  }

  getClaim(id: number): Observable<Claim> {
    return this.http.get<Claim>(`${this.baseUrl}/${id}`);
  }

  createClaim(request: SaveClaimRequest): Observable<Claim> {
    return this.http.post<Claim>(this.baseUrl, request);
  }

  updateClaim(id: number, request: SaveClaimRequest): Observable<Claim> {
    return this.http.put<Claim>(`${this.baseUrl}/${id}`, request);
  }

  changeStatus(id: number, status: ClaimStatus): Observable<Claim> {
    const body: ChangeClaimStatusRequest = { status };
    return this.http.patch<Claim>(`${this.baseUrl}/${id}/status`, body);
  }

  deleteClaim(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getStatusHistory(id: number): Observable<ClaimStatusHistory[]> {
    return this.http.get<ClaimStatusHistory[]>(`${this.baseUrl}/${id}/status-history`);
  }
}
