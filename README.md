# TransferLog - Gestión de Turnos y Vacaciones

**TransferLog** es una aplicación móvil desarrollada con **React Native** y **Expo**, diseñada específicamente para empresas de transporte de pasajeros (transfer) que necesitan una gestión eficiente de los turnos laborales y las solicitudes de vacaciones de sus empleados.

La aplicación utiliza **SQLite** para el almacenamiento local de datos, lo que garantiza su funcionamiento sin conexión (offline) y la persistencia de la información.

## 🚀 Características Principales

### 👤 Gestión de Empleados y Roles
- **Sistema de Roles:** Diferencia entre Administradores y Empleados.
- **Acceso Seguro:** Inicio de sesión mediante credenciales locales almacenadas en SQLite.

### 📅 Control de Turnos
- **Vista de Calendario:** Visualización de turnos en formatos semanal y mensual.
- **Identificación Visual:** Uso de códigos de colores predefinidos para los diferentes tipos de turno (Mañana, Tarde, Noche).
- **Asignación de Turnos:** (Admin) Capacidad para asignar, modificar o eliminar turnos de cualquier empleado.

### 🏖️ Gestión de Vacaciones
- **Solicitud de Vacaciones:** Interfaz intuitiva para seleccionar períodos de descanso, con validación automática de días disponibles.
- **Estado de Solicitudes:** Seguimiento en tiempo real del estado de cada solicitud (Pendiente, Aprobada, Rechazada).
- **Panel de Aprobación (Admin):** Interfaz centralizada para que los administradores revisen y gestionen las peticiones de vacaciones.

## 🛠️ Stack Tecnológico

- **Framework:** React Native con Expo SDK.
- **Navegación:** React Navigation (Stack y Bottom Tabs).
- **Base de Datos:** SQLite (`expo-sqlite`).
- **Lógica de Fechas:** `date-fns`.
- **Iconografía:** Material Community Icons (`@expo/vector-icons`).

## 📁 Estructura del Proyecto

```text
src/
├── components/     # Componentes de UI reutilizables (Badge de turnos, tarjetas de vacaciones)
├── context/        # Estado global (Autenticación)
├── database/       # Inicialización de DB y servicios CRUD (Servicios de turnos, vacaciones, empleados)
├── navigation/     # Configuración de rutas y navegación por pestañas
├── screens/        # Pantallas principales (Login, Home, Calendario, Vacaciones, Administración)
└── theme/          # Sistema de diseño (Paleta de colores y tipografía personalizada)
```

> [!IMPORTANT]
> **Prueba la aplicación inmediatamente:**
> Usa las siguientes credenciales para probar los diferentes roles: 
> 
> | Rol | Email | Contraseña |
> | :--- | :--- | :--- |
> | **Administrador** | `admin@transferlog.com` | `admin123` |
> | **Empleado** | `juan@transferlog.com` | `pass123` |
> | **Empleado** | `maria@transferlog.com` | `pass123` |

## 🏗️ Instalación y Ejecución

1.  **Clonar el repositorio:**
    ```bash
    git clone [url-del-repositorio]
    cd ppp_grupo3
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Iniciar el proyecto con Expo:**
    ```bash
    npx expo start
    ```

4.  **Ejecutar en un dispositivo:**
    - **Móvil:** Descarga la app **Expo Go**, abre la cámara y escanea el código QR mostrado en la terminal.
    - **Emulador:** Presiona `a` en la terminal para abrir el emulador de Android (requiere Android Studio configurado).

## 🔑 Credenciales de Prueba

La base de datos se inicializa automáticamente con los siguientes usuarios de demostración:

| Rol | Email | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `admin@transferlog.com` | `admin123` |
| **Empleado** | `juan@transferlog.com` | `pass123` |
| **Empleado** | `maria@transferlog.com` | `pass123` |

---
Desarrollado para el **Anteproyecto de 3º DAM**.
