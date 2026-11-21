
const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const message = document.getElementById('message');

    const loginData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();

        if (data.success) {
            message.textContent = data.message;
            message.style.color = 'green';

            // Save basic user details for the dashboard
            sessionStorage.setItem(
                'pawpalUser',
                JSON.stringify(data.user)
            );

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);

        } else {
            message.textContent = data.message;
            message.style.color = 'red';
        }

    } catch (error) {
        message.textContent = 'Unable to connect to PawPal server.';
        message.style.color = 'red';
    }
});
