# TransferLog - Gestión de Turnos y Vacaciones

**TransferLog** es una aplicación móvil desarrollada con **React Native** y **Expo**, diseñada específicamente para empresas de transporte de pasajeros (transfer) que necesitan una gestión eficiente de los turnos laborales y las solicitudes de vacaciones de sus empleados.

La aplicación utiliza **Supabase** como backend en la nube, lo que permite la sincronización en tiempo real entre múltiples dispositivos y una gestión centralizada de la información.

## 🚀 Características Principales

### 👤 Gestión de Empleados y Roles
- **Sistema de Roles:** Diferencia entre Administradores y Empleados.
- **Acceso Centralizado:** Inicio de sesión seguro mediante base de datos remota.

### 📅 Control de Turnos
- **Vista de Calendario:** Visualización de turnos en formatos semanal y mensual.
- **Identificación Visual:** Uso de códigos de colores para los diferentes tipos de turno (Mañana, Tarde, Noche).
- **Asignación en Tiempo Real:** (Admin) Capacidad para asignar o modificar turnos de cualquier empleado con actualización inmediata para el trabajador.

### 🏖️ Gestión de Vacaciones
- **Solicitud de Vacaciones:** Interfaz intuitiva con validación automática de días disponibles.
- **Estado de Solicitudes:** Seguimiento del estado (Pendiente, Aprobada, Rechazada).
- **Panel de Aprobación (Admin):** Interfaz para que los administradores gestionen las peticiones.

## 🛠️ Stack Tecnológico

- **Framework:** React Native con Expo SDK.
- **Navegación:** React Navigation.
- **Backend:** Supabase (PostgreSQL).
- **Lógica de Fechas:** `date-fns`.
- **Iconografía:** Material Community Icons.

## 📁 Estructura del Proyecto

```text
src/
├── components/     # Componentes de UI reutilizables
├── context/        # Estado global (Autenticación)
├── database/       # Servicios CRUD conectados a Supabase
├── lib/            # Configuración de clientes (Supabase)
├── navigation/     # Configuración de rutas
├── screens/        # Pantallas principales
└── theme/          # Sistema de diseño
```

## 🏗️ Instalación y Configuración

1.  **Clonar e instalar:**
    ```bash
    git clone [url-del-repositorio]
    cd ppp_grupo3
    npm install
    ```

2.  **Configurar Supabase:**
    Introduce los siguientes valores en `src/lib/supabase.js`:
    

    
3.  **Preparar la Base de Datos:**
    Ejecuta el siguiente script en el **SQL Editor** de Supabase para crear las tablas:
    ```sql
    -- Crear tablas
    CREATE TABLE employees ( ... );
    CREATE TABLE shifts ( ... );
    CREATE TABLE vacations ( ... );
    ```

4.  **Iniciar con Expo:**
    ```bash
    npx expo start
    ```

## 🔑 Credenciales de Prueba (Semilla)

| Rol | Email | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `admin@transferlog.com` | `admin123` |
| **Empleado** | `juan@transferlog.com` | `pass123` |

---
Desarrollado para el **Anteproyecto de 3º DAM**.
