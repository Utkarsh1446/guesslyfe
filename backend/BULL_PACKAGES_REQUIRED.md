# Required Bull Board Packages

To use the Bull Board monitoring dashboard, you need to install the following packages:

```bash
npm install @bull-board/api @bull-board/express
```

Or with yarn:

```bash
yarn add @bull-board/api @bull-board/express
```

These packages provide the monitoring UI for Bull queues at `/admin/queues`.

## Package Versions

- `@bull-board/api`: Latest (^5.x)
- `@bull-board/express`: Latest (^5.x)

## After Installation

The application will automatically configure the Bull Board dashboard at startup.

Access the dashboard at: `http://localhost:3000/admin/queues`

Authentication is required using the credentials set in your `.env` file:
- Username: `ADMIN_USERNAME`
- Password: `ADMIN_PASSWORD`
