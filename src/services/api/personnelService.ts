import { apiRequest } from './client';

export interface Personnel { id: string; name: string; specialty: string; active: boolean }

type PersonnelRow = { id: string; name: string; specialty: string | null; active: boolean };

export const personnelService = {
  getPersonnel: async (): Promise<Personnel[]> => (await apiRequest<PersonnelRow[]>('/api/personnel')).map((person) => ({ id: person.id, name: person.name, specialty: person.specialty ?? '', active: person.active })),
};
