
const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const message = document.getElementById('message');

    const userData = {
        full_name: document.getElementById('full_name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value
    };

    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        message.textContent = data.message;
        message.style.color = data.success ? 'green' : 'red';

        if (data.success) {
            registerForm.reset();
        }

    } catch (error) {
        message.textContent = 'Unable to connect to PawPal server.';
        message.style.color = 'red';
    }
});
