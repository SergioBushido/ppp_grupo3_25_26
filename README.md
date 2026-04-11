# TransferLog - Gestión de Turnos y Vacaciones

**TransferLog** es una aplicación móvil desarrollada con **React Native** y **Expo**, diseñada específicamente para empresas de transporte de pasajeros (transfer) que necesitan una gestión eficiente de los turnos laborales y las solicitudes de vacaciones de sus empleados.

La aplicación utiliza **Supabase** como backend en la nube, lo que permite la sincronización en tiempo real entre múltiples dispositivos y una gestión centralizada de la información bajo una arquitectura de alto rendimiento.

## 🚀 Características Principales

### 👤 Gestión de Empleados y Roles
- **Sistema de Roles:** Diferencia entre Administradores y Empleados con permisos granulares.
- **Registro de Empleados (Admin):** Panel dedicado para altas, bajas y edición de personal.
- **Seguridad Avanzada:** Cambio de contraseña con validación de identidad (contraseña actual).

### 📅 Control de Turnos y Horarios
- **Vista de Calendario Interactivo:** Visualización en formato mensual con navegación avanzada, visualización integrada de vacaciones y previsualización de eventos (tooltips).
- **Asignación Inteligente (Admin):** Sistema de asignación de turnos con **validación de conflictos** (evita asignar turnos durante vacaciones o solapamientos).
- **Copia Rápida de Turnos (Admin):** Herramienta para la optimización de planificación que permite clonar los turnos de la semana anterior de forma transaccional.
- **Gestión Operativa:** Capacidad para eliminar y reasignar turnos directamente desde la vista diaria.

### 🏖️ Gestión de Vacaciones y Ausencias
- **Flujo de Solicitudes:** Interfaz intuitiva con cálculo automático de días disponibles.
- **Autogestión:** Los empleados pueden cancelar sus solicitudes pendientes directamente.
- **Panel de Aprobación (Admin):** Gestión centralizada de peticiones con estados sincronizados.
- **Sincronización:** Reflejo automático e interactivo de los períodos vacacionales aprobados en el calendario de turnos.

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
Desarrollado para el **Anteproyecto de 3º DAM** 

---

## 📖 Anexo: Evolución de la Asignación Masiva de Turnos

Durante el desarrollo de la aplicación, nos encontramos con un desafío importante respecto a la **asignación de turnos a largo plazo** por parte del administrador.

### 1. Limitaciones Iniciales
En la primera iteración, la asignación de turnos requería que el administrador seleccionara una fecha de inicio y una de fin. Esto generaba un listado lineal de días sobre el cual el usuario debía hacer *scroll* y asignar manualmente el tipo de turno a cada día. Esta aproximación era ineficiente, propensa a errores (al no visualizar visualmente los fines de semana de forma clara) y lenta para planificar meses enteros. 

### 2. Descubrimientos en la Implementación
Al intentar automatizar el proceso con botones de "Relleno masivo", nos dimos cuenta de que un rango estricto estático (Inicio a Fin) perdía gran flexibilidad. En la operativa real de una empresa de transportes, es común necesitar asignar turnos a **días salteados** (ej. "todos los lunes y miércoles del mes") y un selector lineal tradicional no lo permitía sin forzar al usuario a repetir la operación varias veces.

### 3. La Solución Óptima
Tras analizar los estándares de UX en herramientas profesionales de productividad modernas, pivotamos hacia un enfoque de **Calendario Visual de Selección Múltiple**. Integramos la librería nativa `react-native-calendars` para presentar una cuadrícula mensual completa directamente dentro del flujo de asignación. 

**¿Por qué fue la mejor solución?**
- **Flexibilidad:** Permite la selección arbitraria de días salteados o semanas completas tocando en la cuadrícula del calendario.
- **Contexto Visual:** Otorga un *feedback* inmediato al administrador sobre qué porción del mes está a punto de modificar.
- **Seguridad (Validación Cruzada):** Sumado a esta nueva interfaz, el sistema evalúa los días seleccionados y **omite automáticamente** la creación de turnos si detecta que la fecha elegida colisiona con unas vacaciones previamente aprobadas en Supabase, asegurando la integridad de los horarios de la empresa.
