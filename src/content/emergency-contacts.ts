/** Dados públicos. Contatos pessoais só podem ser incluídos com autorização de publicação. */
export type ConfirmedAddress = { status: 'confirmed'; text: string; source: string }
  | { status: 'pending' | 'not-applicable' };
interface ContactBase { id: string; name: string; description: string; phone: string }
export interface ExternalContact extends ContactBase {
  category: 'external';
  address: ConfirmedAddress;
  travelMinutes: number | null;
  phoneSource: string;
}
export interface InternalContact extends ContactBase {
  category: 'internal';
  responsibility?: string;
}
export type EmergencyContact = ExternalContact | InternalContact;

// Confirmar o endereço físico/acesso do Terminal antes de habilitar rotas.
export const terminalOrigin: ConfirmedAddress = { status: 'pending' };
const emergencySource = 'https://defesacivil.itajai.sc.gov.br/telefones-por-ocorrencia/';
export const externalContacts: ExternalContact[] = [
  { id: 'defesa-civil', category: 'external', name: 'Defesa Civil', description: 'Proteção e Defesa Civil de Itajaí', phone: '199', phoneSource: emergencySource, travelMinutes: null,
    address: { status: 'confirmed', text: 'Avenida Governador Adolfo Konder, 1811 — Cidade Nova, Itajaí/SC — CEP 88308-003', source: emergencySource } },
  { id: 'bombeiros', category: 'external', name: 'Corpo de Bombeiros', description: '7º Batalhão de Bombeiros Militar — Itajaí', phone: '193', phoneSource: emergencySource, travelMinutes: null,
    address: { status: 'confirmed', text: 'Avenida Sete de Setembro, 1878 — Fazenda, Itajaí/SC', source: 'https://www.cbm.sc.gov.br/index.php/component/icagenda/1093-cafe-com-veteranos-em-itajai?Itemid=101&date=2026-05-14-16-00' } },
  { id: 'samu', category: 'external', name: 'SAMU', description: 'Atendimento móvel de urgência — acione pelo 192. Unidade de referência a confirmar.', phone: '192', phoneSource: emergencySource, travelMinutes: null, address: { status: 'pending' } },
  { id: 'policia-militar', category: 'external', name: 'Polícia Militar', description: '1º Batalhão de Polícia Militar — Itajaí', phone: '190', phoneSource: emergencySource, travelMinutes: null,
    address: { status: 'confirmed', text: 'Rua Felipe Schimidt, 257 — Centro, Itajaí/SC — CEP 88301-040', source: 'https://pm.sc.gov.br/unidades/3crpm1bpm-1-batalhao-de-policia-militar' } },
  { id: 'celesc', category: 'external', name: 'CELESC', description: 'Emergências elétricas. Endereço de referência: loja de atendimento, não base de despacho de emergência.', phone: '0800 048 0196', phoneSource: 'https://www.celesc.com.br/fale-conosco/canais-atendimento', travelMinutes: null,
    address: { status: 'confirmed', text: 'Rua Blumenau, 1414 — São João, Itajaí/SC', source: 'https://www.celesc.com.br/fale-conosco/locais-de-atendimento' } },
];
export const internalContacts: InternalContact[] = [];
export const phoneDigits = (phone: string) => phone.replace(/[^+\d]/g, '');
export function contactRoute(contact: EmergencyContact, origin: ConfirmedAddress = terminalOrigin): string | null {
  if (contact.category !== 'external' || contact.address.status !== 'confirmed' || origin.status !== 'confirmed') return null;
  const query = new URLSearchParams({ api: '1', origin: origin.text, destination: contact.address.text, travelmode: 'driving' });
  return `https://www.google.com/maps/dir/?${query}`;
}
