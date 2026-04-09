# TransferLog - Gestión de Turnos y Vacaciones

**TransferLog** es una aplicación móvil desarrollada con **React Native** y **Expo**, diseñada específicamente para empresas de transporte de pasajeros (transfer) que necesitan una gestión eficiente de los turnos laborales y las solicitudes de vacaciones de sus empleados.

La aplicación utiliza **Supabase** como backend en la nube, lo que permite la sincronización en tiempo real entre múltiples dispositivos y una gestión centralizada de la información bajo una arquitectura de alto rendimiento.

## 🚀 Características Principales

### 👤 Gestión de Empleados y Roles
- **Sistema de Roles:** Diferencia entre Administradores y Empleados con permisos granulares.
- **Registro de Empleados (Admin):** Panel dedicado para altas, bajas y edición de personal.
- **Seguridad Avanzada:** Cambio de contraseña con validación de identidad (contraseña actual).

### 📅 Control de Turnos y Horarios
- **Vista de Calendario Dual:** Visualización en formatos semanal y mensual con diseño premium.
- **Asignación Inteligente (Admin):** Sistema de asignación de turnos con **validación de conflictos** (evita asignar turnos durante vacaciones o solapamientos).
- **Gestión Operativa:** Capacidad para eliminar y reasignar turnos directamente desde la vista diaria.

### 🏖️ Gestión de Vacaciones y Ausencias
- **Flujo de Solicitudes:** Interfaz intuitiva con cálculo automático de días disponibles.
- **Autogestión:** Los empleados pueden cancelar sus solicitudes pendientes directamente.
- **Panel de Aprobación (Admin):** Gestión centralizada de peticiones con estados sincronizados.

### 📊 Reportes y Estadísticas (Admin)
- **Cómputo Mensual:** Nueva pestaña de reportes que calcula automáticamente:
    - Total de turnos realizados por empleado al mes.
    - Desglose por tipo (Mañana, Tarde, Noche).
    - Conteo exacto de días de vacaciones disfrutados.

## 🛠️ Stack Tecnológico

- **Framework:** React Native con Expo SDK 50+.
- **Navegación:** React Navigation (Stack & Tabs).
- **Backend:** Supabase (PostgreSQL) con persistencia remota.
- **Lógica de Fechas:** `date-fns` para gestión de husos horarios y cálculos.
- **Iconografía:** Material Community Icons para una interfaz moderna y clara.

## 📁 Estructura del Proyecto

```text
src/
├── components/     # Componentes de UI (ShiftBadge, VacationCard, etc.)
├── context/        # Estado global (AuthContext y sesión)
├── database/       # Servicios CRUD (employeeService, shiftService, vacationService)
├── lib/            # Configuración de clientes (Supabase Client)
├── navigation/     # Configuración de rutas y pestañas
├── screens/        # Pantallas (Admin, Home, Calendar, Vacations, etc.)
└── theme/          # Sistema de diseño (Colores, Tipografía)
```

## 🏗️ Instalación y Configuración

1.  **Clonar e instalar:**
    ```bash
    git clone [url-del-repositorio]
    cd ppp_grupo3
    npm install
    ```

2.  **Configurar Supabase:**
    Introduce tus credenciales de API en `src/lib/supabase.js`.

3.  **Iniciar con Expo:**
    ```bash
    npx expo start
    ```

---
Desarrollado para el **Anteproyecto de 3º DAM** (IES Puerto de la Cruz - Telesforo Bravo).
