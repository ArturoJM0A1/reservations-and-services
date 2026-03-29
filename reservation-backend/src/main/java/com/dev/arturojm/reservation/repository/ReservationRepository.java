package com.dev.arturojm.reservation.repository;

import com.dev.arturojm.reservation.entity.Reservation;
import com.dev.arturojm.reservation.entity.ReservationStatus;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

	List<Reservation> findAllByOrderByIdAsc();

	Optional<Reservation> findReservationById(Long id);

	boolean existsByCustomerNameIgnoreCaseAndDateAndTimeAndStatusNot(String customerName, LocalDate date,
			LocalTime time, ReservationStatus status);
}
