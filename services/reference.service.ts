import { API_ENDPOINTS } from '@/config/api';
import authService from './auth.service';
import databaseService from './database.service';

/**
 * Faz uma requisição autenticada com retry automático em caso de 401
 */
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = await authService.getAccessToken();
  
  if (!token) {
    throw new Error('Token de autenticação não encontrado');
  }

  // Primeira tentativa
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'X-Session-Token': token,
    },
  });

  // Se recebeu 401, tenta renovar o token
  if (response.status === 401) {
    if (__DEV__) {
      console.log('🔄 Token expirado, tentando renovar...');
    }

    try {
      token = await authService.refreshToken();
      
      if (__DEV__) {
        console.log('✅ Token renovado com sucesso');
      }

      // Segunda tentativa com token renovado
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'X-Session-Token': token,
        },
      });
    } catch (refreshError) {
      console.error('Erro ao renovar token:', refreshError);
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

  return response;
}

// Tipos de dados de referência
export interface Farm {
  farmId: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  latitude?: string;
  longitude?: string;
  areaSize?: string;
  unitOfMeasure?: UnitOfMeasure;
  status: string;
  pastures?: Pasture[];
}

export interface Pasture {
  pastureId: number;
  description: string;
  farmId: number;
  farmName?: string;
  capacity: number;
  capacityDescription: string;
  areaSize: number;
  unitOfMeasure?: UnitOfMeasure;
  status: string;
}

export interface Event {
  eventId: number;
  description: string;
  operation: string;
  eventDetails?: EventDetail[];
  status: string;
}

export interface EventDetail {
  eventDetailId: number;
  eventId: number;
  description: string;
  status: string;
}

export interface Breed {
  breedId: number;
  name: string;
  animalTypeId: number;
  status: string;
}

export interface AnimalType {
  animalTypeId: number;
  name: string;
  status: string;
  breeds?: Breed[];
  ageGroups?: AgeGroup[];
}

export interface AgeGroup {
  ageGroupId: number;
  name: string;
  animalTypeId: number;
  status: string;
}

export interface UnitOfMeasure {
  unitOfMeasureId: number;
  name: string;
  abbreviation: string;
  status?: string;
}

class ReferenceService {
  /**
   * Carrega todos os dados de referência da API e salva no cache local
   */
  async loadAllReferenceData(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('📥 Carregando dados de referência da API...');
      }

      // Carrega todos os dados em paralelo
      const [farms, events, breeds, animalTypes, ageGroups, unitOfMeasures] = await Promise.all([
        this.fetchFarms(),
        this.fetchEvents(),
        this.fetchBreeds(),
        this.fetchAnimalTypes(),
        this.fetchAgeGroups(),
        this.fetchUnitOfMeasures(),
      ]);

      // Salva todos os dados no cache local
      await Promise.all([
        databaseService.saveReferenceData('farms', farms),
        databaseService.saveReferenceData('events', events),
        databaseService.saveReferenceData('breeds', breeds),
        databaseService.saveReferenceData('animalTypes', animalTypes),
        databaseService.saveReferenceData('ageGroups', ageGroups),
        databaseService.saveReferenceData('unitOfMeasures', unitOfMeasures),
      ]);

      // Carrega pastures e eventDetails (dependem de outros dados)
      await this.loadPasturesForAllFarms(farms);
      await this.loadEventDetailsForAllEvents(events);

      if (__DEV__) {
        console.log('✅ Dados de referência carregados e salvos no cache');
      }
    } catch (error) {
      console.error('Erro ao carregar dados de referência:', error);
      throw error;
    }
  }

  /**
   * Busca fazendas da API
   */
  private async fetchFarms(token?: string): Promise<Farm[]> {
    try {
      const relateds = '|pastures|unitOfMeasure|'

      // Codifica o parâmetro para que | seja convertido para %7C
      const encodedRelateds = encodeURIComponent(relateds)

      const response = await authenticatedFetch(`${API_ENDPOINTS.reference.farms}/search?loadRelated=${encodedRelateds}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar fazendas');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar fazendas:', error);
      return [];
    }
  }

  /**
   * Busca pastos para todas as fazendas
   */
  private async loadPasturesForAllFarms(farms: Farm[]): Promise<void> {
    try {
      const pastures = farms.flatMap(farm => farm.pastures || []);
      if (__DEV__) {
        console.log(`💾 Salvando ${pastures.length} pastos no cache...`);
      }
      await databaseService.saveReferenceData('pastures', pastures);
      if (__DEV__) {
        console.log('✅ Pastos salvos com sucesso');
      }
    } catch (error) {
      console.error('Erro ao carregar pastos:', error);
    }
  }

  /**
   * Busca pastos da API
   */

  /**
   * Busca eventos da API
   */
  private async fetchEvents(token?: string): Promise<Event[]> {
    try {
      const relateds = '|eventDetails|'

      // Codifica o parâmetro para que | seja convertido para %7C
      const encodedRelateds = encodeURIComponent(relateds)

      const response = await authenticatedFetch(`${API_ENDPOINTS.reference.events}/search?loadRelated=${encodedRelateds}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar eventos');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      return [];
    }
  }

  /**
   * Busca detalhes de eventos para todos os eventos
   */
  private async loadEventDetailsForAllEvents(events: Event[]): Promise<void> {
    try {
      const eventDetails = events.flatMap(event => event.eventDetails || []);
      if (__DEV__) {
        console.log(`💾 Salvando ${eventDetails.length} detalhes de eventos no cache...`);
      }
      await databaseService.saveReferenceData('eventDetails', eventDetails);
      if (__DEV__) {
        console.log('✅ Detalhes de eventos salvos com sucesso');
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes de eventos:', error);
    }
  }

  /**
   * Busca raças da API
   */
  private async fetchBreeds(token?: string): Promise<Breed[]> {
    try {
      const relateds = '|animalType|'

      // Codifica o parâmetro para que | seja convertido para %7C
      const encodedRelateds = encodeURIComponent(relateds)

      const response = await authenticatedFetch(`${API_ENDPOINTS.reference.breeds}/search?loadRelated=${encodedRelateds}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar raças');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar raças:', error);
      return [];
    }
  }

  /**
   * Busca tipos de animais da API
   */
  private async fetchAnimalTypes(token?: string): Promise<AnimalType[]> {
    try {
      const relateds = '|breeds|ageGroups|'

      // Codifica o parâmetro para que | seja convertido para %7C
      const encodedRelateds = encodeURIComponent(relateds)

      const response = await authenticatedFetch(`${API_ENDPOINTS.reference.animalTypes}/search?loadRelated=${encodedRelateds}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar tipos de animais');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar tipos de animais:', error);
      return [];
    }
  }

  /**
   * Busca grupos de idade da API
   */
  private async fetchAgeGroups(token?: string): Promise<AgeGroup[]> {
    try {
      const relateds = '|animalType|'

      // Codifica o parâmetro para que | seja convertido para %7C
      const encodedRelateds = encodeURIComponent(relateds)

      const response = await authenticatedFetch(`${API_ENDPOINTS.reference.ageGroups}/search?loadRelated=${encodedRelateds}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar grupos de idade');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar grupos de idade:', error);
      return [];
    }
  }

  /**
   * Busca unidades de medida da API
   */
  private async fetchUnitOfMeasures(token?: string): Promise<UnitOfMeasure[]> {
    try {
      const response = await authenticatedFetch(`${API_ENDPOINTS.reference.unitOfMeasures}/search`);

      if (!response.ok) {
        throw new Error('Erro ao buscar unidades de medida');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar unidades de medida:', error);
      return [];
    }
  }

  // ==================== MÉTODOS PARA OBTER DADOS DO CACHE ====================

  async getFarms(): Promise<Farm[]> {
    try {
      const cachedData = await databaseService.getReferenceData('farms');
      if (cachedData && cachedData.length > 0) {
        return cachedData;
      }
      
      // Se não houver dados em cache, busca da API
      if (__DEV__) {
        console.log('📡 Cache vazio, buscando fazendas da API...');
      }
      const farms = await this.fetchFarms();
      await databaseService.saveReferenceData('farms', farms);
      
      // Salva também os pastos que vieram junto com as fazendas
      await this.loadPasturesForAllFarms(farms);
      
      return farms;
    } catch (error) {
      console.error('Erro ao obter fazendas:', error);
      // Se houver erro no banco, tenta buscar da API
      try {
        return await this.fetchFarms();
      } catch (apiError) {
        console.error('Erro ao buscar fazendas da API:', apiError);
      }
      return [];
    }
  }

  async getPastures(farmId?: number): Promise<Pasture[]> {
    try {
      const pastures = (await databaseService.getReferenceData('pastures')) || [];
      if (farmId) {
        return pastures.filter((p: Pasture) => p.farmId === farmId);
      }
      return pastures;
    } catch (error) {
      console.error('Erro ao obter pastos:', error);
      return [];
    }
  }

  async getEvents(): Promise<Event[]> {
    try {
      const cachedData = await databaseService.getReferenceData('events');
      if (cachedData && cachedData.length > 0) {
        return cachedData;
      }
      
      // Se não houver dados em cache, busca da API
      if (__DEV__) {
        console.log('📡 Cache vazio, buscando eventos da API...');
      }
      const events = await this.fetchEvents();
      await databaseService.saveReferenceData('events', events);
      
      // Salva também os detalhes dos eventos que vieram junto
      await this.loadEventDetailsForAllEvents(events);
      
      return events;
    } catch (error) {
      console.error('Erro ao obter eventos:', error);
      // Se houver erro no banco, tenta buscar da API
      try {
        return await this.fetchEvents();
      } catch (apiError) {
        console.error('Erro ao buscar eventos da API:', apiError);
      }
      return [];
    }
  }

  async getEventDetails(eventId?: number): Promise<EventDetail[]> {
    try {
      const eventDetails = (await databaseService.getReferenceData('eventDetails')) || [];
      if (eventId) {
        return eventDetails.filter((ed: EventDetail) => ed.eventId === eventId);
      }
      return eventDetails;
    } catch (error) {
      console.error('Erro ao obter detalhes de eventos:', error);
      return [];
    }
  }

  async getBreeds(animalTypeId?: number): Promise<Breed[]> {
    try {
      const cachedData = await databaseService.getReferenceData('breeds');
      if (cachedData && cachedData.length > 0) {
        const breeds = cachedData;
        if (animalTypeId) {
          return breeds.filter((b: Breed) => b.animalTypeId === animalTypeId);
        }
        return breeds;
      }
      
      // Se não houver dados em cache, busca da API
      if (__DEV__) {
        console.log('📡 Cache vazio, buscando raças da API...');
      }
      const breeds = await this.fetchBreeds();
      await databaseService.saveReferenceData('breeds', breeds);
      if (animalTypeId) {
        return breeds.filter((b: Breed) => b.animalTypeId === animalTypeId);
      }
      return breeds;
    } catch (error) {
      console.error('Erro ao obter raças:', error);
      // Se houver erro no banco, tenta buscar da API
      try {
        const breeds = await this.fetchBreeds();
        if (animalTypeId) {
          return breeds.filter((b: Breed) => b.animalTypeId === animalTypeId);
        }
        return breeds;
      } catch (apiError) {
        console.error('Erro ao buscar raças da API:', apiError);
      }
      return [];
    }
  }

  async getAnimalTypes(): Promise<AnimalType[]> {
    try {
      const cachedData = await databaseService.getReferenceData('animalTypes');
      if (cachedData && cachedData.length > 0) {
        return cachedData;
      }
      
      // Se não houver dados em cache, busca da API
      if (__DEV__) {
        console.log('📡 Cache vazio, buscando tipos de animais da API...');
      }
      const animalTypes = await this.fetchAnimalTypes();
      await databaseService.saveReferenceData('animalTypes', animalTypes);
      return animalTypes;
    } catch (error) {
      console.error('Erro ao obter tipos de animais:', error);
      // Se houver erro no banco, tenta buscar da API
      try {
        return await this.fetchAnimalTypes();
      } catch (apiError) {
        console.error('Erro ao buscar tipos de animais da API:', apiError);
      }
      return [];
    }
  }

  async getAgeGroups(animalTypeId?: number): Promise<AgeGroup[]> {
    try {
      const cachedData = await databaseService.getReferenceData('ageGroups');
      if (cachedData && cachedData.length > 0) {
        const ageGroups = cachedData;
        if (animalTypeId) {
          return ageGroups.filter((ag: AgeGroup) => ag.animalTypeId === animalTypeId);
        }
        return ageGroups;
      }
      
      // Se não houver dados em cache, busca da API
      if (__DEV__) {
        console.log('📡 Cache vazio, buscando grupos de idade da API...');
      }
      const ageGroups = await this.fetchAgeGroups();
      await databaseService.saveReferenceData('ageGroups', ageGroups);
      if (animalTypeId) {
        return ageGroups.filter((ag: AgeGroup) => ag.animalTypeId === animalTypeId);
      }
      return ageGroups;
    } catch (error) {
      console.error('Erro ao obter grupos de idade:', error);
      // Se houver erro no banco, tenta buscar da API
      try {
        const ageGroups = await this.fetchAgeGroups();
        if (animalTypeId) {
          return ageGroups.filter((ag: AgeGroup) => ag.animalTypeId === animalTypeId);
        }
        return ageGroups;
      } catch (apiError) {
        console.error('Erro ao buscar grupos de idade da API:', apiError);
      }
      return [];
    }
  }

  async getUnitOfMeasures(): Promise<UnitOfMeasure[]> {
    try {
      const cachedData = await databaseService.getReferenceData('unitOfMeasures');
      if (cachedData && cachedData.length > 0) {
        return cachedData;
      }
      
      // Se não houver dados em cache, busca da API
      if (__DEV__) {
        console.log('📡 Cache vazio, buscando unidades de medida da API...');
      }
      const unitOfMeasures = await this.fetchUnitOfMeasures();
      await databaseService.saveReferenceData('unitOfMeasures', unitOfMeasures);
      return unitOfMeasures;
    } catch (error) {
      console.error('Erro ao obter unidades de medida:', error);
      // Se houver erro no banco, tenta buscar da API
      try {
        return await this.fetchUnitOfMeasures();
      } catch (apiError) {
        console.error('Erro ao buscar unidades de medida da API:', apiError);
      }
      return [];
    }
  }

  /**
   * Limpa todos os dados de referência do cache
   */
  async clearCache(): Promise<void> {
    await databaseService.clearReferenceData();
  }
}

export default new ReferenceService();

