package com.dev.arturojm.reservation.controller;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dev.arturojm.reservation.entity.Reservation;
import com.dev.arturojm.reservation.entity.ReservationStatus;
import com.dev.arturojm.reservation.repository.ReservationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import java.time.LocalDate;
import java.time.LocalTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ReservationControllerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ReservationRepository reservationRepository;

	private final ObjectMapper objectMapper = JsonMapper.builder()
			.findAndAddModules()
			.build();

	@BeforeEach
	void setUp() {
		reservationRepository.deleteAll();
	}

	@Test
	void getReservationsReturnsAllReservations() throws Exception {
		Reservation reservation = new Reservation(null, "Ana Perez", LocalDate.of(2026, 3, 25),
				LocalTime.of(14, 30), "Corte de cabello", ReservationStatus.CONFIRMED);
		reservationRepository.save(reservation);

		mockMvc.perform(get("/reservas"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].customerName").value("Ana Perez"))
				.andExpect(jsonPath("$[0].status").value("CONFIRMED"));
	}

	@Test
	void getReservationsReturnsEmptyListWhenDatabaseIsEmpty() throws Exception {
		mockMvc.perform(get("/reservas"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void postReservationsCreatesANewReservation() throws Exception {
		Reservation reservation = new Reservation(null, "Luis Gomez", LocalDate.of(2026, 4, 2),
				LocalTime.of(10, 0), "Manicure", ReservationStatus.CONFIRMED);

		mockMvc.perform(post("/reservas")
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(reservation)))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", containsString("/reservas/")))
				.andExpect(jsonPath("$.id").isNumber())
				.andExpect(jsonPath("$.customerName").value("Luis Gomez"))
				.andExpect(jsonPath("$.status").value("PENDING"));
	}

	@Test
	void postReservationsReturnsConflictWhenCustomerAlreadyHasReservationWithinFourHours() throws Exception {
		Reservation existingReservation = new Reservation(null, "Luis Gomez", LocalDate.of(2026, 4, 2),
				LocalTime.of(5, 0), "Diagnostico", ReservationStatus.PENDING);
		reservationRepository.save(existingReservation);

		Reservation newReservation = new Reservation(null, "Luis Gomez", LocalDate.of(2026, 4, 2),
				LocalTime.of(5, 40), "Manicure", ReservationStatus.CONFIRMED);

		mockMvc.perform(post("/reservas")
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(newReservation)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message")
						.value("Debe pasar al menos 4 horas entre reservaciones activas del mismo cliente."));
	}

	@Test
	void postReservationsCreatesReservationWhenCustomerWaitedAtLeastFourHours() throws Exception {
		Reservation existingReservation = new Reservation(null, "Luis Gomez", LocalDate.of(2026, 4, 2),
				LocalTime.of(5, 0), "Diagnostico", ReservationStatus.PENDING);
		reservationRepository.save(existingReservation);

		Reservation newReservation = new Reservation(null, "Luis Gomez", LocalDate.of(2026, 4, 2),
				LocalTime.of(9, 0), "Manicure", ReservationStatus.CONFIRMED);

		mockMvc.perform(post("/reservas")
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(newReservation)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.customerName").value("Luis Gomez"))
				.andExpect(jsonPath("$.status").value("PENDING"));
	}

	@Test
	void postReservationsCreatesReservationWhenCustomerHasThreeActiveReservationsThatDay() throws Exception {
		LocalDate reservationDate = LocalDate.of(2026, 4, 2);
		reservationRepository.save(new Reservation(null, "Luis Gomez", reservationDate,
				LocalTime.of(0, 0), "Servicio 1", ReservationStatus.PENDING));
		reservationRepository.save(new Reservation(null, "Luis Gomez", reservationDate,
				LocalTime.of(4, 0), "Servicio 2", ReservationStatus.PENDING));
		reservationRepository.save(new Reservation(null, "Luis Gomez", reservationDate,
				LocalTime.of(8, 0), "Servicio 3", ReservationStatus.PENDING));

		Reservation newReservation = new Reservation(null, "Luis Gomez", reservationDate,
				LocalTime.of(12, 0), "Servicio 4", ReservationStatus.CONFIRMED);

		mockMvc.perform(post("/reservas")
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(newReservation)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.customerName").value("Luis Gomez"))
				.andExpect(jsonPath("$.status").value("PENDING"));
	}

	@Test
	void postReservationsReturnsConflictWhenCustomerAlreadyHasFourActiveReservationsThatDay() throws Exception {
		LocalDate reservationDate = LocalDate.of(2026, 4, 2);
		reservationRepository.save(new Reservation(null, "Luis Gomez", reservationDate,
				LocalTime.of(0, 0), "Servicio 1", ReservationStatus.PENDING));
		reservationRepository.save(new Reservation(null, "Luis Gomez", reservationDate,
				LocalTime.of(4, 0), "Servicio 2", ReservationStatus.PENDING));
		reservationRepository.save(new Reservation(null, "Luis Gomez", reservationDate,
				LocalTime.of(8, 0), "Servicio 3", ReservationStatus.PENDING));
		reservationRepository.save(new Reservation(null, "Luis Gomez", reservationDate,
				LocalTime.of(12, 0), "Servicio 4", ReservationStatus.PENDING));

		Reservation newReservation = new Reservation(null, "Luis Gomez", reservationDate,
				LocalTime.of(16, 0), "Servicio 5", ReservationStatus.CONFIRMED);

		mockMvc.perform(post("/reservas")
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(newReservation)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message")
						.value("No se permiten mas de 4 reservaciones activas del mismo cliente el mismo dia."));
	}

	@Test
	void postReservationsCreatesReservationWhenPreviousOneAtSameDateAndTimeIsCancelled() throws Exception {
		Reservation cancelledReservation = new Reservation(null, "Luis Gomez", LocalDate.of(2026, 4, 2),
				LocalTime.of(10, 0), "Diagnostico", ReservationStatus.CANCELLED);
		reservationRepository.save(cancelledReservation);

		Reservation newReservation = new Reservation(null, "Luis Gomez", LocalDate.of(2026, 4, 2),
				LocalTime.of(10, 0), "Manicure", ReservationStatus.CONFIRMED);

		mockMvc.perform(post("/reservas")
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(newReservation)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.customerName").value("Luis Gomez"))
				.andExpect(jsonPath("$.status").value("PENDING"));
	}

	@Test
	void deleteReservationsCancelsAnExistingReservation() throws Exception {
		Reservation reservation = new Reservation(null, "Maria Lopez", LocalDate.of(2026, 5, 10),
				LocalTime.of(16, 15), "Masaje", ReservationStatus.CONFIRMED);
		Reservation savedReservation = reservationRepository.save(reservation);

		mockMvc.perform(delete("/reservas/{id}", savedReservation.getId()))
				.andExpect(status().isNoContent());

		Reservation cancelledReservation = reservationRepository.findById(savedReservation.getId()).orElseThrow();
		org.junit.jupiter.api.Assertions.assertEquals(ReservationStatus.CANCELLED, cancelledReservation.getStatus());
	}

	@Test
	void deleteReservationsReturnsNotFoundWhenReservationDoesNotExist() throws Exception {
		mockMvc.perform(delete("/reservas/{id}", 999L))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("No existe una reserva con id 999."));
	}
}
