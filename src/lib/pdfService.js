// Servicio de generación de reportes PDF para TransferLog
// Issue #21
// Autor: GitHub Copilot

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Genera un PDF mensual de cuadrícula de empleados y lo comparte o imprime.
 * @param {Object[]} empleados - Lista de empleados con sus turnos y vacaciones.
 * @param {Object} opciones - Opciones de generación (mes, año, etc).
 * @returns {Promise<void>}
 */

export async function generarReportePDF(empleados, opciones) {
  // Plantilla estática de cuadrícula mensual y resumen
  // TODO: Reemplazar datos estáticos por dinámicos
  const html = `
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; }
        h1 { text-align: center; margin-bottom: 8px; }
        .subtitle { text-align: center; font-size: 16px; margin-bottom: 24px; }
        table { border-collapse: collapse; width: 100%; font-size: 10px; }
        th, td { border: 1px solid #888; padding: 2px 4px; text-align: center; }
        th { background: #f0f0f0; }
        .resumen { background: #e0e7ff; font-weight: bold; }
        .vacaciones { background: #ffe4e1; }
        .manana { background: #e0ffe0; }
        .tarde { background: #fffbe0; }
        .noche { background: #e0e7ff; }
        .firma-block { margin-top: 32px; border-top: 2px solid #333; padding-top: 16px; display: flex; justify-content: space-between; }
        .firma, .sello { width: 45%; text-align: center; }
        .firma-label, .sello-label { font-size: 12px; color: #555; margin-top: 24px; }
      </style>
    </head>
    <body>
      <h1>Reporte Mensual de Turnos</h1>
      <div class="subtitle">Mes: Marzo 2026 &mdash; Empresa: TransferLog</div>
      <table>
        <tr>
          <th>Empleado</th>
          <th>Día 1</th><th>Día 2</th><th>Día 3</th><th>Día 4</th><th>Día 5</th><th>Día 6</th><th>Día 7</th><th>Día 8</th><th>Día 9</th><th>Día 10</th>
          <th>Día 11</th><th>Día 12</th><th>Día 13</th><th>Día 14</th><th>Día 15</th><th>Día 16</th><th>Día 17</th><th>Día 18</th><th>Día 19</th><th>Día 20</th>
          <th>Día 21</th><th>Día 22</th><th>Día 23</th><th>Día 24</th><th>Día 25</th><th>Día 26</th><th>Día 27</th><th>Día 28</th><th>Día 29</th><th>Día 30</th><th>Día 31</th>
          <th>M</th><th>T</th><th>N</th><th>V</th>
        </tr>
        <!-- Ejemplo de fila de empleado -->
        <tr>
          <td>Juan Pérez</td>
          <td class="manana">M</td><td class="tarde">T</td><td class="noche">N</td><td class="vacaciones">V</td><td></td><td></td><td></td><td></td><td></td><td></td>
          <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          <td class="resumen">10</td><td class="resumen">8</td><td class="resumen">7</td><td class="resumen">2</td>
        </tr>
        <!-- Más empleados... -->
      </table>
      <div class="firma-block">
        <div class="firma">
          <div class="firma-label">Firma de Administración</div>
          <div style="height: 48px; border-bottom: 1px solid #aaa; margin: 16px 24px 0 24px;"></div>
        </div>
        <div class="sello">
          <div class="sello-label">Sello de Empresa</div>
          <div style="height: 48px; border-bottom: 1px solid #aaa; margin: 16px 24px 0 24px;"></div>
        </div>
      </div>
    </body>
    </html>
  `;
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  } else {
    throw new Error('No se puede compartir el PDF en este dispositivo');
  }
}

// Futuras funciones: generarHTMLCuadricula, generarResumenEmpleado, etc.
