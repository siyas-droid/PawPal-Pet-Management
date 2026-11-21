
const appointmentForm = document.getElementById('appointmentForm');
const petSelect = document.getElementById('pet_id');
const appointmentMessage = document.getElementById('appointmentMessage');
const appointmentList = document.getElementById('appointmentList');
const dateInput = document.getElementById('appointment_date');

// Logged-in user
const user = JSON.parse(sessionStorage.getItem('pawpalUser'));

if (!user) {
    window.location.href = 'login.html';
}

// Prevent selecting past dates
const today = new Date();

const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
).toISOString().split('T')[0];

dateInput.min = localDate;


// Show booking messages
function showMessage(message, type) {
    appointmentMessage.textContent = message;
    appointmentMessage.className = `booking-notification ${type}`;

    appointmentMessage.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}


// Load customer's pets
async function loadPets() {
    try {
        const response = await fetch(
            `/api/pets/${user.user_id}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Unable to load pets');
        }

        const pets = Array.isArray(data) ? data : data.pets;

        if (!Array.isArray(pets)) {
            throw new Error('Invalid pets response');
        }

        petSelect.innerHTML =
            '<option value="">Select your pet</option>';

        pets.forEach(pet => {
            const option = document.createElement('option');

            option.value = pet.pet_id;
            option.textContent = pet.pet_name;

            petSelect.appendChild(option);
        });

        if (pets.length === 0) {
            petSelect.innerHTML =
                '<option value="">Please add a pet first</option>';
        }

    } catch (error) {
        console.error('Error loading pets:', error);

        petSelect.innerHTML =
            '<option value="">Unable to load pets</option>';
    }
}


// Book appointment
appointmentForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    const appointmentData = {
        user_id: user.user_id,
        pet_id: petSelect.value,
        service_name: document.getElementById('service_name').value,
        appointment_date: dateInput.value,
        appointment_time: document.getElementById('appointment_time').value
    };

    try {
        const response = await fetch(
            '/api/appointments',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appointmentData)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || 'Appointment booking failed.'
            );
        }

        // Show success notification
        showMessage(
            '✓ Appointment booked successfully! Your grooming request has been submitted. You can track its status below.',
            'success'
        );

        // Reset booking form
        appointmentForm.reset();

        // Reload appointment list
        await loadAppointments();

    } catch (error) {
        console.error('Booking error:', error);

        showMessage(
            'Unable to book your appointment. ' + error.message,
            'error'
        );
    }
});


// Get appointment status details
function getAppointmentStatus(status) {

    if (status === 'Confirmed') {
        return {
            label: '✓ APPOINTMENT CONFIRMED',
            className: 'status-confirmed'
        };
    }

    if (status === 'Cancelled') {
        return {
            label: '✕ APPOINTMENT CANCELLED',
            className: 'status-cancelled'
        };
    }

    return {
        label: '✓ APPOINTMENT BOOKED — WAITING FOR CONFIRMATION',
        className: 'status-pending'
    };
}


// Load customer's appointments
async function loadAppointments() {

    try {
        const response = await fetch(
            `/api/appointments/${user.user_id}`
        );

        const appointments = await response.json();

        if (!response.ok) {
            throw new Error(
                appointments.message || 'Unable to load appointments.'
            );
        }

        appointmentList.innerHTML = '';

        if (!Array.isArray(appointments) || appointments.length === 0) {
            appointmentList.innerHTML = `
                <p class="no-appointments">
                    🐾 No grooming appointments booked yet.
                    Book your pet's first grooming session!
                </p>
            `;
            return;
        }

        appointments.forEach(appointment => {

            const card = document.createElement('div');

            card.className = 'appointment-card';

            const statusInfo = getAppointmentStatus(
                appointment.status
            );

            // Appointment details
            card.innerHTML = `
                <h3>${appointment.service_name}</h3>

                <div class="appointment-status ${statusInfo.className}">
                    ${statusInfo.label}
                </div>

                <p>
                    <strong>🐾 Pet:</strong>
                    ${appointment.pet_name}
                </p>

                <p>
                    <strong>📅 Date:</strong>
${new Date(appointment.appointment_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
})}
                </p>

                <p>
                    <strong>⏰ Time:</strong>
                    ${appointment.appointment_time}
                </p>

                ${
                    appointment.status !== 'Cancelled'
                    ? `
                        <button
                            class="cancel-appointment"
                            data-id="${appointment.appointment_id}">
                            Cancel Appointment
                        </button>
                    `
                    : `
                        <p class="cancelled-note">
                            This appointment has been cancelled.
                        </p>
                    `
                }
            `;

            appointmentList.appendChild(card);
        });


        // Cancel appointment functionality
        appointmentList
            .querySelectorAll('.cancel-appointment')
            .forEach(button => {

                button.addEventListener('click', async () => {

                    const appointmentId = button.dataset.id;

                    const confirmed = confirm(
                        'Are you sure you want to cancel this appointment?'
                    );

                    if (!confirmed) {
                        return;
                    }

                    button.disabled = true;
                    button.textContent = 'Cancelling...';

                    try {
                        const response = await fetch(
                            `/api/appointments/${appointmentId}/cancel`,
                            {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    user_id: user.user_id
                                })
                            }
                        );

                        const result = await response.json();

                        if (!response.ok) {
                            throw new Error(
                                result.message || 'Cancellation failed.'
                            );
                        }

                        showMessage(
                            'Your appointment has been cancelled successfully.',
                            'success'
                        );

                        await loadAppointments();

                    } catch (error) {
                        console.error('Cancellation error:', error);

                        showMessage(
                            error.message || 'Unable to cancel appointment.',
                            'error'
                        );

                        button.disabled = false;
                        button.textContent = 'Cancel Appointment';
                    }
                });
            });

    } catch (error) {
        console.error('Error loading appointments:', error);

        appointmentList.innerHTML =
            '<p>Unable to load appointments. Please refresh the page.</p>';
    }
}


// Initial loading
loadPets();
loadAppointments();
