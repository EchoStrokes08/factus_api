/**
 * Catálogo oficial DANE DIVIPOLA (División Político-Administrativa de Colombia).
 * Provee la codificación estándar de 5 dígitos para los principales municipios
 * y capitales de departamento de Colombia, requerida obligatoriamente por la
 * DIAN y la API de Factus en el campo `customer.municipality_code`.
 */

export const DANE_MUNICIPALITIES = [
  { code: '11001', name: 'Bogotá D.C.', department: 'Bogotá D.C.', department_code: '11', aliases: ['bogota', 'bogota d.c.', 'distrito capital'] },
  { code: '05001', name: 'Medellín', department: 'Antioquia', department_code: '05', aliases: ['medellin'] },
  { code: '76001', name: 'Cali', department: 'Valle del Cauca', department_code: '76', aliases: ['cali', 'santiago de cali'] },
  { code: '08001', name: 'Barranquilla', department: 'Atlántico', department_code: '08', aliases: ['barranquilla'] },
  { code: '13001', name: 'Cartagena de Indias', department: 'Bolívar', department_code: '13', aliases: ['cartagena', 'cartagena de indias'] },
  { code: '68001', name: 'Bucaramanga', department: 'Santander', department_code: '68', aliases: ['bucaramanga'] },
  { code: '54001', name: 'Cúcuta', department: 'Norte de Santander', department_code: '54', aliases: ['cucuta', 'san jose de cucuta'] },
  { code: '17001', name: 'Manizales', department: 'Caldas', department_code: '17', aliases: ['manizales'] },
  { code: '66001', name: 'Pereira', department: 'Risaralda', department_code: '66', aliases: ['pereira'] },
  { code: '73001', name: 'Ibagué', department: 'Tolima', department_code: '73', aliases: ['ibague'] },
  { code: '41001', name: 'Neiva', department: 'Huila', department_code: '41', aliases: ['neiva'] },
  { code: '50001', name: 'Villavicencio', department: 'Meta', department_code: '50', aliases: ['villavicencio'] },
  { code: '52001', name: 'Pasto', department: 'Nariño', department_code: '52', aliases: ['pasto', 'san juan de pasto'] },
  { code: '63001', name: 'Armenia', department: 'Quindío', department_code: '63', aliases: ['armenia'] },
  { code: '19001', name: 'Popayán', department: 'Cauca', department_code: '19', aliases: ['popayan'] },
  { code: '20001', name: 'Valledupar', department: 'Cesar', department_code: '20', aliases: ['valledupar'] },
  { code: '23001', name: 'Montería', department: 'Córdoba', department_code: '23', aliases: ['monteria'] },
  { code: '47001', name: 'Santa Marta', department: 'Magdalena', department_code: '47', aliases: ['santa marta'] },
  { code: '70001', name: 'Sincelejo', department: 'Sucre', department_code: '70', aliases: ['sincelejo'] },
  { code: '27001', name: 'Quibdó', department: 'Chocó', department_code: '27', aliases: ['quibdo'] },
  { code: '25175', name: 'Chía', department: 'Cundinamarca', department_code: '25', aliases: ['chia'] },
  { code: '25754', name: 'Soacha', department: 'Cundinamarca', department_code: '25', aliases: ['soacha'] },
  { code: '05266', name: 'Envigado', department: 'Antioquia', department_code: '05', aliases: ['envigado'] },
  { code: '05360', name: 'Itagüí', department: 'Antioquia', department_code: '05', aliases: ['itagui'] }
];

/**
 * Resuelve el código numérico DANE DIVIPOLA a partir de un texto libre (ej: "Medellin" -> "05001").
 */
export function resolveMunicipalityCode(query) {
  if (!query) return '11001'; // Default Bogotá D.C.
  const clean = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Si ya viene como código de 5 dígitos
  if (/^\d{5}$/.test(clean)) return clean;

  const found = DANE_MUNICIPALITIES.find((m) =>
    m.aliases.some((alias) => alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === clean) ||
    m.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(clean)
  );

  return found ? found.code : '11001';
}
