# 🏠 Hometasking

Aplicación web para la organización colaborativa de tareas del hogar, control de insumos por stock (ej. bidones de agua) y ejecución rápida mediante **códigos QR físicos** distribuidos en los distintos sectores de la casa.

Pensada para correr en un servidor dentro de la **red local (LAN)** del hogar y ser utilizada desde cualquier dispositivo móvil (**iOS y Android**) sin fricción.

---

## 🛠️ Stack Tecnológico

El proyecto está organizado como un **Monorepo** con separación clara entre Frontend, Backend e Infraestructura:

### Frontend (`/frontend`)
- **Framework:** [React 18+](https://react.dev/) con **TypeScript**.
- **Build Tool:** [Vite](https://vitejs.dev/) para un entorno de desarrollo ultrarrápido y empaquetado optimizado.
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/) con diseño *Mobile-First* e interfaz optimizada para impresión (`@media print`) de planillas de códigos QR.
- **Enrutamiento:** [React Router v6](https://reactrouter.com/) (incluyendo rutas dedicadas de acción rápida para escaneo de QRs).
- **Iconografía y QR:** `lucide-react` para íconos y `qrcode.react` para la generación dinámica de códigos QR en el cliente.

### Backend (`/backend`)
- **Runtime y Lenguaje:** [Node.js](https://nodejs.org/) con **TypeScript**.
- **Framework HTTP:** [Express.js](https://expressjs.com/) estructurado mediante controladores y servicios RESTful.
- **ORM:** [MikroORM v6](https://mikro-orm.io/) (`@mikro-orm/mysql`) utilizando reflect-metadata y entidades tipadas en TypeScript.
- **Base de Datos:** **MySQL 8.0**.

### Infraestructura (`/`)
- **Contenedores:** `docker-compose.yml` en la raíz del proyecto para levantar la instancia de **MySQL 8.0** lista para desarrollo o despliegue en servidor local.

---

## 🗄️ Modelo de Datos (MikroORM + MySQL)

1. **`Resident` (Residente):**
   - `id`, `name`, `avatar` (emoji/color), `role` (`ADMIN` | `RESIDENT`), `pin` (opcional, 4 dígitos), `active` (booleano).
2. **`Zone` (Sector / Puesto de la casa):**
   - `id`, `name` (ej. *Cocina*, *Dispenser*, *Planta Baja*), `icon`, `qrCode` (identificador único para QR de sector).
3. **`Task` (Tarea):**
   - `id`, `title`, `description`, `points` (1 a 5 pts de esfuerzo), `qrCode` (identificador único para QR directo).
   - `type`:
     - `FIXED_SCHEDULE`: Se repite según días de la semana (`daysOfWeek`, ej. `[1,2,3,4,5]` o todos los días).
     - `INTERVAL`: Se repite cada `intervalDays` días a partir de la última vez que se completó.
     - `STOCK`: Controla un inventario (`currentStock`, `minThreshold`, `maxStock`, `unitName`). Cuando `currentStock <= minThreshold`, la tarea se marca como pendiente/urgente.
     - `ON_DEMAND`: Se activa manualmente cuando un residente reporta que hace falta realizarla.
   - `assignmentType`: `ALL` (abierta a todos), `SINGLE` (un residente fijo) o `GROUP` (grupo selecto de residentes donde cualquiera del grupo puede realizarla).
   - `assignedResidents`: Relación *Many-to-Many* con `Resident`.
   - `zone`: Relación *Many-to-One* opcional con `Zone`.
   - `isPendingManual`, `lastCompletedAt`, `lastCompletedBy`.
4. **`TaskLog` (Historial de Ejecución y Puntos):**
   - `id`, `task`, `resident`, `action` (`COMPLETED`, `FLAGGED_PENDING`, `STOCK_CONSUMED`, `STOCK_REFILLED`), `pointsEarned`, `previousStock`, `newStock`, `createdAt`, `undone` (booleano para soportar el botón *Deshacer*).

---

## 📂 Estructura del Proyecto

```text
Hometasking/
├── docker-compose.yml       # Servicio MySQL 8.0 para desarrollo y red local
├── R01-Vis-Hometasking.md   # Documento de visión, alcance funcional y casos de uso
├── README.md                # Especificación técnica y guía de instalación
├── backend/                 # API REST con Node.js, Express, TypeScript y MikroORM
│   ├── src/
│   │   ├── entities/        # Entidades de MikroORM (Resident, Zone, Task, TaskLog)
│   │   ├── routes/          # Endpoints de API REST (/residents, /tasks, /zones, /qr, /stats)
│   │   ├── services/        # Lógica de cálculo de vencimientos, stock y puntos
│   │   ├── seed.ts          # Datos iniciales de ejemplo (Buscar agua, Barrer, Muebles, Ropa)
│   │   ├── mikro-orm.config.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
└── frontend/                # SPA Mobile-First con React, Vite, TypeScript y TailwindCSS
    ├── src/
    │   ├── components/      # Navbar, tarjetas de tareas, modales, controles de stock
    │   ├── context/         # Auth/Profile Context (persistencia de residente + PIN)
    │   ├── pages/           # Dashboard, QR Quick Action, Gestión, Planilla QR, Ranking
    │   ├── api/             # Cliente HTTP hacia el backend
    │   └── App.tsx
    ├── package.json
    └── vite.config.ts
```

---

## 🚀 Puesta en Marcha

### Opción A: Todo en Docker Compose (Recomendada para tu Servidor Local)
Levanta **MySQL 8.0**, **Backend API** y **Frontend (Nginx)** con un solo comando:

```bash
docker compose up -d --build
```
- La aplicación completa quedará disponible en tu red local en **`http://<IP-DE-TU-SERVIDOR>:8080`**.
- Todos los contenedores tienen `restart: unless-stopped` para volver a levantar solos ante reinicios o cortes de luz.

---

### Opción B: Modo Desarrollo Local (Hot-Reload)

#### 1. Levantar solo la Base de Datos (MySQL)
```bash
docker compose up -d mysql
```

#### 2. Iniciar el Backend
```bash
cd backend
npm install
npm run dev
```
> El servidor backend se iniciará en `http://0.0.0.0:3001`, creará/actualizará el esquema automáticamente con MikroORM y cargará los residentes (**Francisco, Pilar, Silvina y Cristian**) y las tareas iniciales si la base de datos está vacía.

#### 3. Iniciar el Frontend
```bash
cd frontend
npm install
npm run dev -- --host
```
> El flag `--host` expone la aplicación en la red local (ej. `http://192.168.x.x:5173`) para que todos los residentes puedan escanear los códigos QR desde sus teléfonos iOS y Android.
