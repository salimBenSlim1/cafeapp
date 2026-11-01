# CafeApp — Real-time Café Operations Backend

A Node.js backend for managing café operations: orders, tables, staff, reporting, receipt printing, and real-time updates.

> **Portfolio note:** This repository documents an evolving application. Security hardening and automated tests are ongoing; it should not be treated as a production-ready reference implementation.

## What it does

- **Order workflows:** Retrieve orders, update their status, and generate station-specific receipts for the bar, kitchen, shisha station, and cashier.
- **Real-time events:** Socket.IO notifications for order-status changes and cancellations.
- **Multi-café data model:** Sequelize relationships connect cafés, tables, products, orders, and staff.
- **Reporting:** Sales, order totals, busy hours, product performance, and daily statistics.
- **Access control:** JWT-based café authentication, cookie-based refresh flow, and rate limiting.
- **Operations:** Scheduled cleanup, QR-code tooling, and integrations for media and printing.

## Engineering decisions

### Class-based service layer and dependency injection

HTTP controllers delegate domain logic to reusable **service classes**. For example, `services/order.js` defines an `Order` class whose constructor receives the order, item, and table models plus the Sequelize instance. `services/cafe.js` uses a similar `CafeService` class.

This separates transport concerns from business logic and makes the domain layer easier to extend, reuse, and test as the application grows. It also makes it possible to supply test doubles instead of a real database in unit tests.

### Database transactions

The café service uses a **Sequelize transaction** when deleting a café and its related records. The intent is to keep multi-table changes atomic: either the coordinated operation commits or it rolls back. This is particularly important when data spans orders, items, tables, staff, and analytics tables.

### Real-time ordering

Socket.IO broadcasts status changes to café-specific clients. Receipt generation routes ordered items to the appropriate preparation station, while the cashier receives a complete receipt.

### Analytics and data access

Sequelize models and SQL queries power paginated order retrieval and aggregated reporting. The data model also contains daily café, item, and waiter statistics.

## Technology

Node.js · Express · Sequelize · SQL (PostgreSQL production configuration; MySQL local configuration) · Socket.IO · JWT · Joi · Cloudinary · Helmet · express-rate-limit

## Project layout

```text
contoller/      HTTP request handlers
services/       Class-based business logic
models/         Sequelize entities and associations
routes/         API endpoints
middleware/     Authentication, validation, rate limiting
validators/     Request schemas
jobs/           Scheduled maintenance
db/             Database configuration
server.js       Express and Socket.IO entry point
```

## Local setup

1. Install a supported Node.js LTS release and a compatible SQL database.
2. Run `npm install`.
3. Configure your environment variables and local database connection. See `db/db-config.js` and the authentication/token services for required settings.
4. Start the API with `npm run dev` (or `npm start`).
5. The HTTP server defaults to port `5000`, configurable with `PORT`.

**Do not use real credentials or production data for local development.** The current database configuration still needs environment-driven development credentials and migrations.

## Current engineering priorities

- Replace any plaintext password storage/comparison with secure password hashing and a safe migration plan.
- Audit tenant ownership checks on all order and receipt endpoints.
- Replace destructive database initialization with versioned migrations.
- Add automated tests for authentication, transactions, and order lifecycles.
- Review credentials and commit history before changing repository visibility.
- Make CORS origins and database connection settings environment-driven.

## Related project

The user-facing React application lives in the companion repository: `cafeapp-frontend`.

---

Built as a practical exploration of scalable service-layer design, real-time café operations, and transactional data integrity.
