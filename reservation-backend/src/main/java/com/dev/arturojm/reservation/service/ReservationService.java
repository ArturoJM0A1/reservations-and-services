package com.dev.arturojm.reservation.service;

import com.dev.arturojm.reservation.entity.Reservation;
import com.dev.arturojm.reservation.entity.ReservationStatus;
import com.dev.arturojm.reservation.exception.BusinessRuleException;
import com.dev.arturojm.reservation.exception.ReservationConflictException;
import com.dev.arturojm.reservation.repository.ReservationRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ReservationService {

	private static final long MINIMUM_HOURS_BETWEEN_RESERVATIONS = 4;
	private static final long MAXIMUM_DAILY_RESERVATIONS_PER_CUSTOMER = 4;

	private final ReservationRepository reservationRepository;

	public ReservationService(ReservationRepository reservationRepository) {
		this.reservationRepository = reservationRepository;
	}

	public List<Reservation> getAllReservations() {
		return reservationRepository.findAllByOrderByIdAsc();
	}

	public Reservation createReservation(Reservation reservation) {
		String normalizedCustomerName = reservation.getCustomerName() == null
				? null
				: reservation.getCustomerName().trim();

		if (normalizedCustomerName != null) {
			reservation.setCustomerName(normalizedCustomerName);
		}

		List<Reservation> activeCustomerReservations = getActiveCustomerReservations(normalizedCustomerName);

		if (hasReachedDailyReservationLimit(activeCustomerReservations, reservation)) {
			throw new ReservationConflictException(
					"No se permiten mas de 4 reservaciones activas del mismo cliente el mismo dia.");
		}

		if (hasReservationWithinRestrictedWindow(activeCustomerReservations, reservation)) {
			throw new ReservationConflictException(
					"Debe pasar al menos 4 horas entre reservaciones activas del mismo cliente.");
		}

		reservation.setId(null);
		reservation.setStatus(ReservationStatus.PENDING);
		return reservationRepository.save(reservation);
	}

	public void cancelReservation(Long id) {
		Reservation reservation = reservationRepository.findReservationById(id)
				.orElseThrow(() -> new BusinessRuleException("No existe una reserva con id " + id + "."));

		reservation.setStatus(ReservationStatus.CANCELLED);
		reservationRepository.save(reservation);
	}

	private List<Reservation> getActiveCustomerReservations(String normalizedCustomerName) {
		if (normalizedCustomerName == null) {
			return List.of();
		}

		return reservationRepository.findAllByCustomerNameIgnoreCaseAndStatusNotOrderByDateAscTimeAsc(
				normalizedCustomerName,
				ReservationStatus.CANCELLED);
	}

	private boolean hasReachedDailyReservationLimit(List<Reservation> activeCustomerReservations, Reservation reservation) {
		if (reservation.getDate() == null) {
			return false;
		}

		long reservationsOnRequestedDate = activeCustomerReservations.stream()
				.filter(existingReservation -> reservation.getDate().equals(existingReservation.getDate()))
				.count();

		return reservationsOnRequestedDate >= MAXIMUM_DAILY_RESERVATIONS_PER_CUSTOMER;
	}

	private boolean hasReservationWithinRestrictedWindow(List<Reservation> activeCustomerReservations, Reservation reservation) {
		if (reservation.getDate() == null || reservation.getTime() == null) {
			return false;
		}

		LocalDateTime requestedReservationDateTime = LocalDateTime.of(reservation.getDate(), reservation.getTime());

		return activeCustomerReservations.stream()
				.map(existingReservation -> LocalDateTime.of(existingReservation.getDate(), existingReservation.getTime()))
				.anyMatch(existingReservationDateTime ->
						Duration.between(existingReservationDateTime, requestedReservationDateTime).abs().toHours()
								< MINIMUM_HOURS_BETWEEN_RESERVATIONS);
	}
}
