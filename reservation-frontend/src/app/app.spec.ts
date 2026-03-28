import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { ReservationService } from './reservation.service';

describe('App', () => {
  let reservationServiceSpy: jasmine.SpyObj<ReservationService>;

  beforeEach(async () => {
    reservationServiceSpy = jasmine.createSpyObj<ReservationService>('ReservationService', [
      'getReservations',
      'createReservation',
      'cancelReservation'
    ]);
    reservationServiceSpy.getReservations.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: ReservationService, useValue: reservationServiceSpy }]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the reservations table heading', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.toLowerCase()).toContain('reservas');
  });
});
