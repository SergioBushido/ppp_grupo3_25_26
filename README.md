# TransferLog

**TransferLog** es una aplicación móvil desarrollada con **React Native**, **Expo** y **Supabase** para gestionar empleados, turnos, vacaciones y fichajes en empresas de transporte.

La aplicación centraliza la operativa diaria de administración y autogestión del empleado desde una única app, incorporando planificación de turnos, control horario, geolocalización configurable y trazabilidad de fichajes.

## 🚀 Funcionalidades principales

### 👤 Empleados y autenticación
- Gestión de empleados con roles `admin` y `employee`.
- Alta, edición y baja de personal desde administración.
- Cambio de contraseña con validación de identidad.
- Sesión persistente.
- Foto de perfil por usuario.

### 📅 Turnos y planificación
- Calendario interactivo mensual.
- Asignación manual y masiva de turnos.
- Copia rápida de planificación semanal.
- Validación de conflictos con vacaciones.
- Gestión operativa diaria de turnos.

### 🏖️ Vacaciones
- Solicitud de vacaciones por empleado.
- Aprobación y rechazo desde administración.
- Cancelación de solicitudes pendientes.
- Reflejo automático de vacaciones aprobadas en calendario.

### 📍 Fichajes
- Fichaje con política configurable por empleado:
  - `anywhere`
  - `assigned_center`
  - `manual_only`
- Evidencia de ubicación, precisión GPS y centro validado.
- Monitor de fichajes para administración.
- Anulación auditada de fichajes.
- Registro manual de fichajes por administración.

### 📊 Reportes
- Resumen mensual de turnos por empleado.
- Desglose por mañana, tarde y noche.
- Conteo de vacaciones disfrutadas.
- Exportación PDF.

## ✅ Estado del proyecto

Versión funcional con soporte para:
- gestión de empleados,
- turnos,
- vacaciones,
- fichajes con geolocalización,
- anulación auditada,
- fichaje manual por administración.

**Nota técnica:**  
La validación crítica de geolocalización se resuelve actualmente en cliente en esta iteración. Funciona correctamente, aunque en una evolución futura sería recomendable consolidarla en backend o RPC para reforzar la lógica sensible.

## 🛠️ Stack tecnológico

- **Frontend:** React Native
- **Runtime / tooling:** Expo
- **Backend:** Supabase
- **Base de datos:** PostgreSQL
- **Navegación:** React Navigation
- **Fechas:** date-fns
- **Iconografía:** Material Community Icons

## 📁 Estructura del proyecto

```text
src/
├── components/     # Componentes de UI
├── context/        # Estado global y sesión
├── database/       # Servicios de acceso a datos
├── lib/            # Clientes y utilidades
├── navigation/     # Navegación principal
├── screens/        # Pantallas de la aplicación
└── theme/          # Colores y tipografía
🏗️ Instalación y configuración
1. Clonar el proyecto
bash

git clone [url-del-repositorio]
cd ppp_grupo3
npm install
2. Configurar variables de entorno
Crea o completa tu archivo .env con las credenciales públicas de Supabase:

env

EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_KEY=...
3. Aplicar migraciones en Supabase
Antes de probar la app con todas las funcionalidades recientes, asegúrate de ejecutar en el SQL Editor de Supabase las migraciones incluidas en:

text

supabase/migrations/
Especialmente las relacionadas con:

geolocalización de fichajes,
anulación auditada,
fichaje manual por administración.
4. Iniciar la app
bash

npx expo start
📍 Validación manual recomendada
Para validar la operativa de fichajes, conviene comprobar esta batería mínima en dispositivo real:

Empleado con anywhere: registrar entrada y salida con ubicación disponible y confirmar que el fichaje se guarda correctamente.
Empleado con anywhere sin GPS: denegar permiso o provocar fallo de ubicación y confirmar que el fichaje sigue permitiéndose con estado optional_missing.
Empleado con assigned_center dentro de radio: confirmar que el fichaje se acepta y muestra centro y distancia.
Empleado con assigned_center fuera de radio: confirmar que el fichaje se bloquea.
Empleado con manual_only: comprobar que no puede fichar desde la app.
Monitor admin: comprobar que Mostrar ubicación enseña coordenadas y precisión cuando existe evidencia.
Anulación auditada: comprobar que el admin puede anular el último fichaje activo del día dejando trazabilidad.
Fichaje manual admin: comprobar que el admin puede crear entradas y salidas válidas para empleados con política manual_only.
🗄️ Notas sobre base de datos
El proyecto depende de migraciones SQL versionadas para mantener alineados:

esquema de empleados,
turnos,
vacaciones,
fichajes,
geolocalización,
trazabilidad administrativa.
Si se despliega en un entorno nuevo, es importante aplicar las migraciones antes de validar la app.

📖 Decisiones funcionales destacadas
Asignación masiva de turnos
La planificación evolucionó desde un modelo lineal por rango de fechas hacia un calendario visual de selección múltiple, mejorando:

flexibilidad,
velocidad de uso,
contexto visual,
y validación frente a vacaciones aprobadas.
Selector táctil de vacaciones
La solicitud de vacaciones pasó de un sistema basado en incremento/decremento a selección directa sobre calendario, mejorando:

usabilidad,
comprensión del rango,
y precisión visual.
Fichaje con geolocalización
La solución final permite diferentes políticas por empleado y conserva evidencia operativa en administración. Durante su implantación se priorizó una solución estable en cliente por encima de una validación backend más rígida, debido a incidencias técnicas en la capa SQL/RLS durante la iteración.

🎓 Contexto académico
Proyecto desarrollado para el Anteproyecto de 3º DAM.
