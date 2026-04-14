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
  // opciones: { mes, año, nombreEmpresa }
  const { mes, año, nombreEmpresa = 'TransferLog' } = opciones;
  const diasMes = new Date(año, mes, 0).getDate(); // mes: 1-12
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Genera cabecera de días
  const thDias = Array.from({length: diasMes}, (_, i) => `<th>Día ${i+1}</th>`).join('');

  // Genera filas de empleados
  const filas = empleados.map(emp => {
    let totales = { M: 0, T: 0, N: 0, V: 0 };
    // Para cada día del mes
    const tds = Array.from({length: diasMes}, (_, d) => {
      const turno = emp.turnos?.find(t => Number(t.dia) === d+1);
      if (turno) {
        if (turno.tipo === 'M') { totales.M++; return '<td class="manana">M</td>'; }
        if (turno.tipo === 'T') { totales.T++; return '<td class="tarde">T</td>'; }
        if (turno.tipo === 'N') { totales.N++; return '<td class="noche">N</td>'; }
      }
      // Vacaciones
      const vac = emp.vacaciones?.find(v => Number(v.dia) === d+1);
      if (vac) { totales.V++; return '<td class="vacaciones">V</td>'; }
      return '<td></td>';
    }).join('');
    return `<tr><td>${emp.nombre}</td>${tds}<td class="resumen">${totales.M}</td><td class="resumen">${totales.T}</td><td class="resumen">${totales.N}</td><td class="resumen">${totales.V}</td></tr>`;
  }).join('\n');

  const html = `
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
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
      <div class="subtitle">Mes: ${meses[mes-1]} ${año} &mdash; Empresa: ${nombreEmpresa}</div>
      <table>
        <tr>
          <th>Empleado</th>
          ${thDias}
          <th>M</th><th>T</th><th>N</th><th>V</th>
        </tr>
        ${filas}
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
