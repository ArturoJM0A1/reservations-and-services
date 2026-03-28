import { CommonModule, DatePipe, SlicePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { Reservation, ReservationStatus } from '../reservation.model';
import { ReservationService } from '../reservation.service';

@Component({
  selector: 'app-reservations-page',
  imports: [CommonModule, DatePipe, SlicePipe],
  templateUrl: './reservations-page.component.html',
  styleUrl: './reservations-page.component.css'
})
export class ReservationsPageComponent implements OnInit {
  private readonly reservationService = inject(ReservationService);

  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly loading = signal(true);
  protected readonly cancellingId = signal<number | null>(null);
  protected readonly feedback = signal<string | null>(null);
  protected readonly feedbackTone = signal<'success' | 'error' | null>(null);

  ngOnInit(): void {
    this.loadReservations();
  }

  protected refreshReservations(): void {
    this.loadReservations();
  }

  protected cancelReservation(reservation: Reservation): void {
    if (!reservation.id || reservation.status === 'CANCELLED') {
      return;
    }

    this.cancellingId.set(reservation.id);
    this.clearFeedback();

    this.reservationService
      .cancelReservation(reservation.id)
      .pipe(finalize(() => this.cancellingId.set(null)))
      .subscribe({
        next: () => {
          this.reservations.update((currentReservations) =>
            currentReservations.map((currentReservation) =>
              currentReservation.id === reservation.id
                ? { ...currentReservation, status: 'CANCELLED' }
                : currentReservation
            )
          );
          this.setFeedback('Reserva cancelada correctamente.', 'success');
        },
        error: (error) => {
          this.setFeedback(
            this.getErrorMessage(error, 'No fue posible cancelar la reserva.'),
            'error'
          );
        }
      });
  }

  protected isCancelled(status: ReservationStatus): boolean {
    return status === 'CANCELLED';
  }

  protected trackByReservationId(index: number, reservation: Reservation): string | number {
    return reservation.id ?? `${reservation.customerName}-${reservation.date}-${reservation.time}-${index}`;
  }

  private loadReservations(): void {
    this.loading.set(true);
    this.clearFeedback();

    this.reservationService
      .getReservations()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (reservations) => {
          this.reservations.set(this.sortReservations(reservations));
          this.setFeedback('conexion exitosa a la base de datos', 'success');
        },
        error: (error) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.reservations.set([]);
            return;
          }

          this.reservations.set([]);
          this.setFeedback(
            this.getErrorMessage(error, 'No fue posible cargar las reservas.'),
            'error'
          );
        }
      });
  }

  private sortReservations(reservations: Reservation[]): Reservation[] {
    return [...reservations].sort((firstReservation, secondReservation) => {
      const firstId = firstReservation.id ?? Number.MAX_SAFE_INTEGER;
      const secondId = secondReservation.id ?? Number.MAX_SAFE_INTEGER;
      return firstId - secondId;
    });
  }

  private setFeedback(message: string, tone: 'success' | 'error'): void {
    this.feedback.set(message);
    this.feedbackTone.set(tone);
  }

  private clearFeedback(): void {
    this.feedback.set(null);
    this.feedbackTone.set(null);
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      if (this.isDatabaseConnectionPayload(error.error)) {
        return 'No se pudo conectar con la base de datos.';
      }

      const apiMessage = this.extractApiMessage(error);

      if (apiMessage) {
        return apiMessage;
      }

      if (error.status === 0) {
        return `No fue posible conectarse con el backend. Verifica que Spring Boot este corriendo en ${environment.apiUrl}.`;
      }
    }

    return fallbackMessage;
  }

  private extractApiMessage(error: HttpErrorResponse): string | null {
    if (
      typeof error.error === 'object' &&
      error.error !== null &&
      'message' in error.error &&
      typeof error.error.message === 'string'
    ) {
      return error.error.message;
    }

    return null;
  }

  private isDatabaseConnectionPayload(payload: unknown): boolean {
    if (typeof payload === 'string') {
      return this.isDatabaseConnectionMessage(payload);
    }

    if (
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string'
    ) {
      return this.isDatabaseConnectionMessage(payload.message);
    }

    return false;
  }

  private isDatabaseConnectionMessage(message: string): boolean {
    const normalizedMessage = message.toLowerCase();

    return (
      normalizedMessage.includes('base de datos') ||
      normalizedMessage.includes('database') ||
      normalizedMessage.includes('jdbc') ||
      normalizedMessage.includes('datasource') ||
      normalizedMessage.includes('unable to acquire jdbc connection') ||
      normalizedMessage.includes('could not open jpa entitymanager') ||
      normalizedMessage.includes('connection refused')
    );
  }
}
