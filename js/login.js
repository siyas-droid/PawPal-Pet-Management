
const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const message = document.getElementById('message');
    const button = loginForm.querySelector('button');

    const loginData = {
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
    };

    button.disabled = true;
    button.textContent = 'Logging in...';
    message.textContent = '';

    const isStaticSite = window.location.protocol === 'file:' ||
        window.location.hostname.endsWith('github.io');

    if (isStaticSite) {
        message.textContent = 'Login needs the PawPal backend. Open the Render app URL, or run the app with npm start and visit http://localhost:3000/login.html.';
        message.style.color = 'red';
        button.disabled = false;
        button.textContent = 'Login';
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Login failed.');
        }

        // Save customer session for the dashboard
        sessionStorage.setItem(
            'pawpalUser',
            JSON.stringify(data.user)
        );

        message.textContent = data.message || 'Login successful!';
        message.style.color = 'green';

        window.location.assign('dashboard.html');

    } catch (error) {
        console.error('Customer login error:', error);

        message.textContent = error.message === 'Failed to fetch'
            ? 'Unable to connect to PawPal. Start the backend with npm start, or use the live Render app URL.'
            : error.message;

        message.style.color = 'red';

    } finally {
        button.disabled = false;
        button.textContent = 'Login';
    }
});
