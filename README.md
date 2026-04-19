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

### 📍 Fichaje con Geolocalización Flexible
- **Política por empleado:** El administrador puede configurar fichaje libre (`anywhere`), validado por centro (`assigned_center`) o solo manual (`manual_only`).
- **Centros de trabajo:** Se pueden definir centros con nombre, dirección, coordenadas y radio permitido en metros.
- **Trazabilidad:** Cada fichaje puede guardar coordenadas, precisión GPS, centro validado y estado de validación para auditoría desde el panel admin.
- **Corrección auditada:** El administrador puede anular el último fichaje activo del día de un empleado indicando un motivo, sin borrar físicamente el registro.
- **Nota operativa:** Durante la implantación de la anulación auditada se detectó que el monitor admin podía quedarse vacío si el entorno no tenía aplicada la migración nueva o si la vista dependía de filtros diarios/joins frágiles. La solución final estabiliza la carga con compatibilidad temporal sin `record_status`, lectura directa de `attendances` y resolución del nombre del empleado desde los datos ya cargados en administración.

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

## ✅ Validación Manual Recomendada

Para cerrar la operativa de fichaje con geolocalización, conviene ejecutar esta batería mínima en dispositivo real:

1. **Empleado con `anywhere`:** registrar entrada/salida con ubicación disponible y confirmar que el fichaje se guarda y aparece en admin con estado `optional_captured`.
2. **Empleado con `anywhere` sin GPS:** denegar permiso o provocar fallo de ubicación y confirmar que el fichaje sigue permitiéndose con estado `optional_missing`.
3. **Empleado con `assigned_center` dentro de radio:** situarse dentro del radio configurado y confirmar que el fichaje se registra con estado `validated_center`, distancia y centro asociado.
4. **Empleado con `assigned_center` fuera de radio:** intentar fichar lejos del centro y verificar que la app bloquea la acción con mensaje claro.
5. **Empleado con `assigned_center` y GPS impreciso:** repetir la prueba con mala cobertura para confirmar que se bloquea cuando la precisión supera el umbral permitido.
6. **Empleado con `manual_only`:** comprobar que el botón en inicio se muestra como fichaje manual y que el registro desde app queda rechazado.
7. **Cambio de política desde admin:** modificar la política o el centro asignado y comprobar que el siguiente fichaje usa la configuración vigente sin depender de datos obsoletos en memoria.

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

### 📅 Issue #13: Selector de Vacaciones Interactivo para Empleados

**Problema Identificado:**  
El sistema original de solicitud de vacaciones para empleados utilizaba selectores de fecha basados en botones de incremento/decremento (+/-). Aunque funcional, esta aproximación resultaba deficiente por varias razones:
1. **Fricción de uso:** Obligaba al usuario a realizar múltiples clics para navegar hasta fechas lejanas.
2. **Falta de contexto:** El empleado no tenía una visión clara de qué días de la semana estaba seleccionando sin consultar un calendario externo.
3. **Dificultad en rangos:** Visualizar un rango de 15 días era complejo mediante selectores puramente textuales.

**Solución Implementada:**  
Siguiendo la línea de diseño premium establecida para el administrador, hemos migrado la pantalla de `RequestVacationScreen` a un **Modelo de Selección Táctil de Rangos**.

**Beneficios de la solución:**
- **Selección de Rangos (Start-End):** El usuario simplemente toca el día de inicio y el día de fin. El calendario ilumina automáticamente todo el periodo intermedio.
- **Validación Visual de Cupos:** El sistema calcula y muestra instantáneamente cuántos días se están solicitando y cuántos quedarían en el saldo del empleado antes incluso de enviar la solicitud.
- **Precisión:** Elimina errores comunes de selección al permitir ver los fines de semana y festivos en la cuadrícula mensual.

---

## 🗄️ Migraciones de Base de Datos (Supabase)

Para el trabajo en equipo y mantener sincronizados los entornos locales/remotos de la base de datos, aquí se documentan los comandos SQL (DDL) necesarios cada vez que se actualiza el esquema en Supabase. Si configuras una nueva base de datos o te unes al proyecto, ejecuta estos scripts en el **SQL Editor** de tu panel de Supabase:

### 1. Reseteo de Contraseña Obligatorio (Issue #15)
Se añade una columna a los empleados para forzarles a cambiar la clave tras un restablecimiento por parte del administrador:
```sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE;
```
