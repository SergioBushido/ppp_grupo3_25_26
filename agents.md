# Agentes del Proyecto

Este archivo documenta los agentes de IA y colaboradores involucrados en el desarrollo de **TransferLog**.

## Antigravity (IA Lead Developer)
- **Rol:** Arquitecto de software y desarrollador principal.
- **Responsabilidades:** 
  - Diseño de la arquitectura de la aplicación (React Native + Expo).
  - Implementación de la lógica de negocio y persistencia con SQLite.
  - Creación de la interfaz de usuario siguiendo principios de diseño premium.
  - Gestión de tareas y documentación técnica.

## Desarrollador (USER)
- **Rol:** Product Owner y QA.
- **Responsabilidades:**
  - Definición de requisitos funcionales (Anteproyecto 3º DAM).
  - Validación de funcionalidades y diseño.
  - Pruebas en dispositivos físicos (Expo Go) y emuladores.

## Criterio para Nuevas Issues Técnicas
- Las incidencias críticas o de arquitectura deben documentarse con una estructura mínima común para facilitar análisis, implementación y seguimiento.
- Cada issue técnica debería incluir:
  - **Título claro** orientado a acción.
  - **Problema actual** y riesgo asociado.
  - **Impacto** funcional, técnico o de seguridad.
  - **Objetivo** esperado tras la solución.
  - **Alcance**: módulos, servicios o tablas afectadas.
  - **Propuesta técnica** a alto nivel.
  - **Criterios de aceptación** verificables.
  - **Casos a validar** o pruebas manuales esperadas.
  - **Prioridad, severidad y tipo**.
- Orden recomendado de trabajo:
  - primero seguridad e integridad de datos,
  - después consistencia funcional,
  - después experiencia de usuario y mejoras visuales.
- Cuando una issue afecte lógica crítica de negocio, se priorizará mover la lógica sensible a backend, SQL o servicios transaccionales antes que resolverla solo en cliente.

---
*Generado automáticamente durante el proceso de desarrollo.*
