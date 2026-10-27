/** Valores fornecidos pelo responsável, conforme Plano de Contingência JBS. Dados públicos autorizados. */
interface ContactBase { id: string; name: string; phone: string }
export interface ExternalContact extends ContactBase { category: 'external'; travelMinutes: number }
export interface InternalContact extends ContactBase { category: 'internal' }
export type EmergencyContact = ExternalContact | InternalContact;
export const externalContacts: ExternalContact[] = [
  { id: 'policia-militar', category: 'external', name: 'Polícia Militar', phone: '190', travelMinutes: 10 },
  { id: 'samu', category: 'external', name: 'SAMU', phone: '192', travelMinutes: 10 },
  { id: 'bombeiros', category: 'external', name: 'Corpo de Bombeiros', phone: '193', travelMinutes: 10 },
  { id: 'defesa-civil', category: 'external', name: 'Defesa Civil', phone: '199', travelMinutes: 16 },
  { id: 'codetran', category: 'external', name: 'CODETRAN', phone: '153', travelMinutes: 8 },
  { id: 'marieta', category: 'external', name: 'Hospital Mat. Marieta', phone: '3349-9400', travelMinutes: 5 },
  { id: 'ambulancia', category: 'external', name: 'Base da Ambulância', phone: 'Canal de rádio 9', travelMinutes: 20 },
];
export const internalContacts: InternalContact[] = [
  { id: 'cccom', category: 'internal', name: 'CCOS', phone: '(47)9970-91600' },
  { id: 'airton-araujo', category: 'internal', name: 'Airton de Araujo', phone: '(47) 99116-0195' },
  { id: 'daiani-woloszyn', category: 'internal', name: 'Daiani Woloszyn', phone: '(47) 99288-5022' },
  { id: 'jefferson-pampuch', category: 'internal', name: 'Jefferson Pampuch', phone: '(47) 99258-2898' },
  { id: 'thiago-alexi', category: 'internal', name: 'Thiago Alexi', phone: '(47) 98456-4734' },
  { id: 'carlos-ferreira', category: 'internal', name: 'Carlos Ferreira', phone: '(47) 99123-0734' },
  { id: 'fabio-reitz', category: 'internal', name: 'Fabio Reitz', phone: '(41) 9933-8540' },
];
