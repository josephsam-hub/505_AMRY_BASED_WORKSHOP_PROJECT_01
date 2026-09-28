# 505 Base Workshop LAN Deployment

## 1. Target topology

All workstations use a browser and connect to one central workshop server:

```text
Admin PCs and user workstations
              |
          Workshop LAN
              |
      Reverse proxy (80/443)
        |       |       |
    Frontend   API   WebSocket
                    |
                PostgreSQL
```

The workshop server is the authoritative host for the frontend, backend API, realtime service, authentication, PDF generation, uploaded documents, and PostgreSQL. Normal workstations must not run Node.js, Vite, PostgreSQL, or an independent backend.

Recommended names:

- Hostname: `workshop-server` or `505-workshop`
- Fallback address: `192.168.1.10`
- Browser URL: `http://workshop-server/`

Use an internal DNS entry or hosts-file entry for the hostname. Do not make the application depend on a fixed IP.

## 2. Current frontend configuration

The React frontend reads these values at build time:

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Central API origin, for example `http://workshop-server` |
| `VITE_REALTIME_URL` | WebSocket origin, for example `ws://workshop-server/socket` |
| `VITE_APP_URL` | Public browser URL used by the application |

Copy `.env.example` to the environment-specific file before building. `.env.development` intentionally leaves the API URL empty, which keeps the current local mock mode usable. `.env.production` points at the central workshop hostname.

The frontend probes `GET /api/health` and displays Connected, Offline, or Reconnecting in the command header. Production data must not be treated as authoritative while the server is offline.

## 3. Server requirements

Recommended workshop server:

- Windows Server or Linux server kept inside the workshop LAN
- 4 CPU cores minimum
- 8 GB RAM minimum, 16 GB recommended
- SSD storage with space for database backups and documents
- Static LAN address or DHCP reservation
- Internal DNS or hosts-file support
- Firewall access only for the reverse proxy port

Only the reverse proxy should be reachable from client PCs. PostgreSQL and internal API/realtime ports must bind to the server or private container network, not the workstation LAN.

## 4. Runtime services

The production server must host these services centrally:

- Static frontend files from `dist/`
- Backend API
- PostgreSQL database
- WebSocket or Socket.IO realtime service
- Authentication and session service
- PDF report service
- Central report and document storage
- Scheduled PostgreSQL backup job
- Reverse proxy such as Nginx or Caddy

The current repository contains the frontend foundation, LAN configuration, PostgreSQL migration, seed runner, and REST API foundation. Realtime, PDF generation, and Docker deployment are intentionally deferred to later phases. Authentication provider integration and full page-by-page API migration still require completion.

## 5. Reverse proxy contract

The browser should use one origin:

```text
http://workshop-server/       -> frontend static files
http://workshop-server/api/  -> backend API
http://workshop-server/socket -> WebSocket or Socket.IO endpoint
```

The reverse proxy must support WebSocket upgrade headers for `/socket`. It should serve the single-page application fallback to `index.html` while leaving `/api` and `/socket` routed to their services.

Example Nginx shape:

```nginx
server {
    listen 80;
    server_name workshop-server 505-workshop;

    root /var/www/505-base/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 6. Database and authoritative writes

PostgreSQL runs only on the workshop server. The backend is the only component allowed to connect to it.

Every operational write must follow this sequence:

1. Authenticate and authorize the user on the server.
2. Validate the tank, process, inspection, or defect.
3. Execute the database transaction.
4. Write the activity/audit record using server timestamps.
5. Create notifications when required.
6. Commit the transaction.
7. Broadcast the committed event to authorized connected clients.

An inspection failure must update the inspection, create or update the defect, write the activity log, and create the notification atomically. A failed transaction must not broadcast a misleading event.

The database must include, at minimum, persistent records for:

- Users and roles
- Tanks and intake/planned/expected/actual exit dates
- Stages and processes
- Tank process assignments
- Bays and gangs
- Inspections
- Defects
- Road trials
- JRI and handover records
- Notifications
- Activity/audit logs
- Uploaded document metadata

Use PostgreSQL/server timestamps for `created_at`, `updated_at`, inspection timestamps, process-update timestamps, activity timestamps, and notification timestamps.

## 7. Authentication and roles

Authentication must be provided by the central server. Do not use browser localStorage as the source of identity and do not allow users to choose Admin/User from the client.

The server should issue an authenticated session or secure HTTP-only cookie. Authorization must be checked on every API and realtime subscription.

Start with only roles required by the workflow:

- `ADMIN`
- `SUPERVISOR`
- `OPERATOR`
- `QC`

Add another role only when a real workflow requires it. The UI role switcher is currently a prototype control and must be replaced by the authenticated server role before production deployment.

## 8. Realtime contract

Use WebSocket or Socket.IO through the central server. Do not synchronize state directly between browsers.

Example process update flow:

```text
User PC
  POST /api/process-updates
       |
       v
Workshop API
  validate -> transaction -> activity -> notification
       |
       v
PostgreSQL commit
       |
       v
Realtime broadcast
       |---------------- Admin clients
       |---------------- Assigned user clients
       |---------------- Other authorized clients
```

A committed update should include the current server representation, not only a client-side delta. Clients should replace or reconcile the affected record after receiving the event.

The required data consistency test is:

1. User PC 1 updates T-643 from 62% to 78%.
2. Admin PC receives 78% without refresh.
3. Authorized User PC 2 receives 78% without refresh.
4. Admin creates a critical defect.
5. Relevant user workstations receive the notification without refresh.

## 9. Offline and reconnect behavior

The frontend must show a visible offline state when `/api/health` or the realtime connection fails. It must not silently present stale production information as current.

On reconnect:

1. Show Reconnecting.
2. Re-establish the authenticated session.
3. Reconnect the realtime channel.
4. Fetch current server state.
5. Reconcile local screens.
6. Show Connected only after synchronization succeeds.

## 10. PDF reports and documents

PDF generation must run on the workshop server. A client requests a report from the API; the server queries PostgreSQL and generates the PDF from current committed data.

Reports and future inspection photos, defect photographs, JRI files, and handover documents must be stored centrally. Store only metadata and secure download references in PostgreSQL. Do not use browser localStorage for operational documents.

## 11. Backups

Schedule a daily PostgreSQL backup to storage separate from the database volume.

The backup procedure must define:

- Backup time
- Backup location
- Retention period
- Encryption/access controls
- Log location
- Restore owner
- Restore verification frequency

A backup test must restore into a separate test database and verify tanks, processes, defects, inspections, notifications, and activity logs.

## 12. Build and update procedure

From the project directory:

```text
npm ci
copy .env.example .env.production
npm run build
```

Backend database setup, on the central server:

```text
npm ci
copy .env.example .env
npm run db:migrate
npm run db:seed
npm run server:build
npm run server:start
```

`DATABASE_URL` must point to the central PostgreSQL instance. Run `db:migrate` before `db:seed`. The seed command validates the existing mock-data relationships and imports the six stages, 31 processes, 43 tanks, bays, gangs, inspections, defects, road trials, JRI records, notifications, and activity records.

Set the production variables before building. Copy the generated `dist/` directory to the reverse-proxy document root. Restart or reload the frontend service only after the new files are present.

Client PCs only need a supported browser. They do not need Node.js, npm, Vite, or PostgreSQL.

## 13. Firewall and LAN security

Expose only the reverse proxy port to the workshop LAN:

- HTTP `80`, or HTTPS `443` if internal certificates are configured

Do not expose PostgreSQL `5432` to normal workstations. Do not expose internal backend or realtime ports directly when the reverse proxy can route them.

Restrict access to the workshop network unless an explicit remote-access policy is approved. Keep secrets out of `.env.example` and source control.

## 14. Acceptance checklist

The following must be tested on the deployed server before Phase 3B is complete:

- [ ] PostgreSQL persists data
- [ ] Browser refresh preserves updates
- [ ] Admin authentication works
- [ ] User authentication works
- [ ] Server-side role permissions work
- [ ] Tank intake, planned exit, expected exit, and actual exit exist
- [ ] Admin notifications work
- [ ] User notifications work
- [ ] Audit trail works
- [ ] PDF reports generate from database data
- [ ] Two or more clients connect simultaneously
- [ ] User-to-admin realtime update works
- [ ] Admin-to-user realtime update works
- [ ] LAN hostname works from client PCs
- [ ] Core operations work without public internet
- [ ] Server restart does not lose data
- [ ] Database backup and restore work
- [ ] Production build works
- [ ] Deployment documentation is available to workshop support staff

Do not mark an item complete because a UI element exists. Record test evidence from the deployed server and at least one admin PC plus two authorized user PCs.
