# Visión y Alcance: Hometasking

**Hometasking** es una aplicación web diseñada para organizar y llevar cuenta de las tareas del hogar realizadas por los distintos residentes, combinando un panel de control diario con códigos QR físicos distribuidos en puestos estratégicos de la casa.

---

## 1. Problema y Solución

Los residentes tienen dificultades para coordinar las tareas cotidianas y el control de insumos básicos (como bidones de agua). **Hometasking** resuelve esto mediante:
1. **Visibilidad clara** de qué tareas están pendientes hoy, cuáles son urgentes y quiénes pueden realizarlas.
2. **Interacción física inmediata mediante códigos QR** pegados en puestos o sectores (ej. dispensador de agua, cocina, lavadero) que abren una pantalla de **Acción Rápida** desde el celular.
3. **Equidad y transparencia** mediante puntos de esfuerzo e historial semanal/mensual.

---

## 2. Usuarios, Perfiles y Permisos

Dado que el sistema corre inicialmente en un servidor dentro de la **red local (LAN)** del hogar:
- **Identificación ágil:** Al ingresar por primera vez desde el navegador del celular, el residente elige su perfil (*"¿Quién sos?"*) con un **PIN opcional**. La sesión queda guardada en el dispositivo para que al escanear un código QR no deba iniciar sesión cada vez.
- **Roles:**
  - **Administrador del Hogar:** Puede gestionar residentes, crear/editar/eliminar tareas y sectores, ajustar umbrales de stock e imprimir la planilla de códigos QR.
  - **Residente:** Puede ver sus tareas y las generales, completar tareas, actualizar contadores de stock, reportar tareas a demanda y consultar el ranking/historial.

---

## 3. Tipos de Tareas Soportadas

Cada tarea tiene un **puntaje de esfuerzo (1 a 5 puntos)** y puede configurarse bajo uno de los siguientes 4 comportamientos:

1. **Periódica Fija (Calendario):**
   - Se repite en días específicos (ej. *Todos los días*, *Lunes y Jueves*, *Días de semana*).
   - Ejemplo: *"Barrer la casa"* o *"Revisar si hay ropa colgada (todas las mañanas)"*.
2. **Periódica Flotante (Por intervalo desde última ejecución):**
   - Se vuelve a activar $N$ días después de la última vez que fue completada.
   - Ejemplo: *"Repasar los muebles"* (cada 2 días a partir de cuando se hizo por última vez).
3. **Basada en Contador / Stock con Umbral ("Modo Bidón"):**
   - Lleva la cuenta del stock actual (ej. cantidad de bidones llenos) y tiene un **umbral mínimo** (ej. `1`).
   - Los residentes pueden descontar stock (`-1 Bidón`) cuando se vacía uno. Al llegar al umbral mínimo, la tarea pasa automáticamente a estado **Pendiente / Urgente** (*"Ir a buscar agua"*). Al recargar, se restablece el stock y suma los puntos correspondientes.
4. **A Demanda / Aviso Manual:**
   - No tiene una repetición fija; cualquier residente puede activarla como *"Pendiente / Hace falta"* cuando lo detecta (escaneando el QR o desde la app), y otro residente la marca como *"Completada"*.
   - Ejemplo: *"Sacar la basura"* o *"Limpiar horno"*.

---

## 4. Asignación de Responsables

Al crear o editar una tarea, el Administrador define quiénes son los responsables:
- **Abierta a todos:** Cualquier residente del hogar puede completarla.
- **Asignada a un residente único:** Responsabilidad individual fija.
- **Asignada a un grupo selecto:** Solo un subconjunto de residentes está asignado, y **cualquiera del grupo** puede completarla en cualquier momento (sin turnos rígidos).

---

## 5. Sistema de Códigos QR y Puestos

- **Dos niveles de códigos QR:**
  1. **QR de Tarea Puntual (`/qr/task/:code`):** Vinculado directamente a una tarea (ej. pegado en el dispensador de agua).
  2. **QR de Puesto / Sector (`/qr/zone/:code`):** Vinculado a una zona de la casa (ej. *Cocina*, *Lavadero*, *Planta Baja*), mostrando todas las tareas asociadas a ese sector.
- **Pantalla de Acción Rápida:**
  - Al escanear un QR se abre una interfaz optimizada para el celular con botones grandes según el tipo y estado de la tarea:
    - `✅ Marcar como Completada`
    - `⚠️ Reportar como Pendiente / Falta hacer`
    - `➖ Consumir 1 unidad` / `🔄 Stock Recargado` (para tareas de stock)
    - `↩️ Deshacer última acción` (para evitar toques accidentales)
- **Planilla Imprimible:** Vista dentro de la aplicación preparada para imprimir (`@media print`) las tarjetas QR con nombre e ícono de cada puesto/tarea.

---

## 6. Gamificación Suave y Estadísticas

- **Puntos de Esfuerzo:** Cada tarea completada otorga entre **1 y 5 puntos** al residente que la realizó.
- **Balance e Historial:** Panel con el resumen semanal y mensual de puntos y tareas completadas por cada residente, promoviendo una distribución justa de las tareas del hogar, junto con el registro cronológico de actividades.

---

## 7. Mapa de Navegación

1. **`/select-profile`:** Selector rápido de residente (con validación de PIN si el usuario tiene uno configurado).
2. **`/` (Dashboard Principal - Mi Día):**
   - Alertas de stock bajo / tareas urgentes.
   - Tareas pendientes para hoy (filtrables por *"Mis asignadas"* vs *"Todas"*).
   - Accesos rápidos a contadores de stock (ej. Bidones de agua).
3. **`/qr/:type/:code` (Vista Rápida QR):** Pantalla directa al escanear un código QR de tarea o sector.
4. **`/tasks` (Gestión de Tareas y Sectores):** Creación y edición de tareas, tipos de frecuencia, puntajes, asignaciones y sectores (Rol Admin).
5. **`/qr-sheet` (Centro de Códigos QR):** Visualización e impresión de tarjetas QR para pegar en la casa.
6. **`/stats` (Ranking e Historial):** Estadísticas semanales/mensuales de puntos de esfuerzo y log de tareas completadas (con opción de deshacer).
7. **`/residents` (Residentes):** Administración de miembros del hogar, avatares, roles y PINs.

---

## 8. Hoja de Ruta (To-Do)
- [x] Definir alcance funcional, tipos de tareas y flujo de QR.
- [x] Definir stack tecnológico y arquitectura en `README.md`.
- [x] Inicializar estructura Monorepo (`/backend`, `/frontend`, `docker-compose.yml`).
- [x] Implementar modelo de datos en MikroORM (MySQL) y API REST en Express + TypeScript.
- [x] Implementar Frontend en React + Vite + TailwindCSS (Dashboard, Vista QR, Impresión QR, Estadísticas y Administración).
