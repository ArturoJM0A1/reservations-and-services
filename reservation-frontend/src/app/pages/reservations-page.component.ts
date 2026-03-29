import { CommonModule, DatePipe, SlicePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { ToastMessageComponent } from '../components/toast-message.component';
import { CreateReservationRequest, Reservation, ReservationStatus } from '../reservation.model';
import { ReservationService } from '../reservation.service';

type ReservationFormControlName = 'nombreCliente' | 'fecha' | 'hora' | 'servicio';

interface ServiceOption {
  value: string;
  description: string;
  recommended?: boolean;
}

const MAX_DAILY_RESERVATIONS_PER_CUSTOMER = 4;
const DAILY_RESERVATION_LIMIT_MESSAGE =
  'No se permiten mas de 4 reservaciones activas del mismo cliente el mismo dia.';

@Component({
  selector: 'app-reservations-page',
  imports: [CommonModule, DatePipe, ReactiveFormsModule, SlicePipe, ToastMessageComponent],
  templateUrl: './reservations-page.component.html',
  styleUrl: './reservations-page.component.css'
})
export class ReservationsPageComponent implements OnInit, OnDestroy {
  private readonly reservationService = inject(ReservationService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected readonly serviceOptions: ServiceOption[] = [
    {
      value: 'Diagnostico y mantenimiento preventivo',
      description:
        'Ideal para revisar rendimiento, limpieza interna y puntos de falla antes de que escalen.',
      recommended: true
    },
    {
      value: 'Formateo e instalacion de sistema operativo',
      description: 'Perfecto para equipos lentos, reinstalaciones y puestas a punto completas.'
    },
    {
      value: 'Eliminacion de virus y optimizacion',
      description:
        'Recomendado cuando el cliente reporta ventanas emergentes, lentitud o software sospechoso.'
    },
    {
      value: 'Reparacion de hardware y cambio de componentes',
      description: 'Pensado para discos, memorias, fuentes de poder, pantallas o sobrecalentamiento.'
    },
    {
      value: 'Respaldo y recuperacion de informacion',
      description: 'Muy util cuando hay riesgo de perdida de archivos o migraciones entre equipos.'
    }
  ];
  protected readonly minimumDate = this.getMinimumDate();
  protected readonly reservationForm = this.formBuilder.group({
    nombreCliente: this.formBuilder.control('', [Validators.required, Validators.maxLength(100)]),
    fecha: this.formBuilder.control('', Validators.required),
    hora: this.formBuilder.control('', Validators.required),
    servicio: this.formBuilder.control('', Validators.required)
  });
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly cancellingId = signal<number | null>(null);
  protected readonly feedback = signal<string | null>(null);
  protected readonly feedbackTone = signal<'success' | 'error' | null>(null);
  protected readonly saveErrorToastMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadReservations();
  }

  ngOnDestroy(): void {
    this.clearToastTimeout();
  }

  protected refreshReservations(): void {
    this.loadReservations();
  }

  protected submitReservation(): void {
    if (this.reservationForm.invalid) {
      this.reservationForm.markAllAsTouched();
      return;
    }

    this.clearFeedback();
    this.dismissSaveErrorToast();

    const formValue = this.reservationForm.getRawValue();
    const payload: CreateReservationRequest = {
      customerName: formValue.nombreCliente.trim(),
      date: formValue.fecha,
      time: this.normalizeTime(formValue.hora),
      service: formValue.servicio
    };

    if (this.hasReachedDailyReservationLimit(payload)) {
      this.setFeedback(DAILY_RESERVATION_LIMIT_MESSAGE, 'error');
      return;
    }

    this.submitting.set(true);

    this.reservationService
      .createReservation(payload)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (reservation) => {
          this.reservations.set(this.sortReservations([...this.reservations(), reservation]));
          this.reservationForm.reset({
            nombreCliente: '',
            fecha: '',
            hora: '',
            servicio: ''
          });
          this.reservationForm.markAsPristine();
          this.reservationForm.markAsUntouched();
          this.setFeedback('Reserva creada correctamente.', 'success');
        },
        error: (error) => {
          this.openSaveErrorToast(this.getErrorMessage(error, 'No fue posible guardar la reserva.'));
        }
      });
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

  protected trackByServiceValue(_: number, serviceOption: ServiceOption): string {
    return serviceOption.value;
  }

  protected hasFieldError(controlName: ReservationFormControlName): boolean {
    const control = this.reservationForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  protected getFieldErrorMessage(controlName: ReservationFormControlName): string {
    if (!this.hasFieldError(controlName)) {
      return '';
    }

    if (this.reservationForm.controls[controlName].hasError('required')) {
      switch (controlName) {
        case 'nombreCliente':
          return 'El nombre del cliente es obligatorio.';
        case 'fecha':
          return 'La fecha de la reserva es obligatoria.';
        case 'hora':
          return 'La hora de la reserva es obligatoria.';
        case 'servicio':
          return 'Selecciona un servicio para la reserva.';
      }
    }

    if (
      controlName === 'nombreCliente' &&
      this.reservationForm.controls.nombreCliente.hasError('maxlength')
    ) {
      return 'El nombre del cliente no puede superar los 100 caracteres.';
    }

    return 'Revisa este campo.';
  }

  protected dismissSaveErrorToast(): void {
    this.clearToastTimeout();
    this.saveErrorToastMessage.set(null);
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

  private openSaveErrorToast(message: string): void {
    this.saveErrorToastMessage.set(message);
    this.clearToastTimeout();
    this.toastTimeoutId = setTimeout(() => {
      this.saveErrorToastMessage.set(null);
      this.toastTimeoutId = null;
    }, 5500);
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      if (this.isDatabaseConnectionPayload(error.error)) {
        return 'No se pudo conectar con la base de datos. :(';
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

  private normalizeTime(time: string): string {
    return time.length === 5 ? `${time}:00` : time;
  }

  private hasReachedDailyReservationLimit(payload: CreateReservationRequest): boolean {
    const normalizedCustomerName = payload.customerName.trim().toLowerCase();
    const activeReservationsForSameDay = this.reservations().filter(
      (reservation) =>
        reservation.status !== 'CANCELLED' &&
        reservation.date === payload.date &&
        reservation.customerName.trim().toLowerCase() === normalizedCustomerName
    );

    return activeReservationsForSameDay.length >= MAX_DAILY_RESERVATIONS_PER_CUSTOMER;
  }

  private getMinimumDate(): string {
    const currentDate = new Date();
    const localDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }

  private clearToastTimeout(): void {
    if (this.toastTimeoutId === null) {
      return;
    }

    clearTimeout(this.toastTimeoutId);
    this.toastTimeoutId = null;
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
