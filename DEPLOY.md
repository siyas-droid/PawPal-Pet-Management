# Deploy PawPal with its backend

The Render service serves both the frontend and the API from one URL. MySQL is hosted separately. The exported `database/schema.sql` contains table definitions only, with no user records.

## 1. Create the hosted MySQL database

1. Create a MySQL service in Railway.
2. In the MySQL service settings, enable a TCP Proxy. Railway provides a public host and port for clients outside Railway.
3. Connect to that database using MySQL Workbench (or another MySQL client) and run `database/schema.sql`.
4. Copy the database host, proxy port, username, password, and database name. Keep the password private.

## 2. Deploy the Render web service

1. In Render, create a Blueprint from this GitHub repository and select the `main` branch. Render reads the root `render.yaml` and creates the PawPal web service.
2. When prompted, provide `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` from the Railway MySQL service. Use Railway's public TCP Proxy port for `DB_PORT`.
3. Wait for the deploy to finish, then open the service's `onrender.com` URL. That URL serves the frontend and its `/api/...` requests together.

The previous GitHub Pages URL only serves static files. Use the Render URL for the fully connected application.
