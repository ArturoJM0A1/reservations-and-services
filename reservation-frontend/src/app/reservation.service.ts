import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { CreateReservationRequest, Reservation } from './reservation.model';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly reservationsUrl = `${this.apiUrl}/reservas`;

  getReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(this.reservationsUrl);
  }

  createReservation(payload: CreateReservationRequest): Observable<Reservation> {
    return this.http.post<Reservation>(this.reservationsUrl, payload);
  }

  cancelReservation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.reservationsUrl}/${id}`);
  }
}
