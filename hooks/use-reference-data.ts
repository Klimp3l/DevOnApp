import { useState, useEffect } from 'react';
import referenceService, {
  Farm,
  Pasture,
  Event,
  EventDetail,
  Breed,
  AnimalType,
  AgeGroup,
  UnitOfMeasure,
} from '@/services/reference.service';

/**
 * Hook para acessar dados de referência em cache (offline)
 */
export function useReferenceData() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [animalTypes, setAnimalTypes] = useState<AnimalType[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [unitOfMeasures, setUnitOfMeasures] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferenceData();
  }, []);

  async function loadReferenceData() {
    try {
      const [
        farmsData,
        eventsData,
        breedsData,
        animalTypesData,
        ageGroupsData,
        unitOfMeasuresData,
      ] = await Promise.all([
        referenceService.getFarms(),
        referenceService.getEvents(),
        referenceService.getBreeds(),
        referenceService.getAnimalTypes(),
        referenceService.getAgeGroups(),
        referenceService.getUnitOfMeasures(),
      ]);

      setFarms(farmsData);
      setEvents(eventsData);
      setBreeds(breedsData);
      setAnimalTypes(animalTypesData);
      setAgeGroups(ageGroupsData);
      setUnitOfMeasures(unitOfMeasuresData);
    } catch (error) {
      console.error('Erro ao carregar dados de referência:', error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Obtém pastos filtrados por fazenda
   */
  async function getPastures(farmId?: number): Promise<Pasture[]> {
    return await referenceService.getPastures(farmId);
  }

  /**
   * Obtém detalhes de eventos filtrados por evento
   */
  async function getEventDetails(eventId?: number): Promise<EventDetail[]> {
    return await referenceService.getEventDetails(eventId);
  }

  /**
   * Obtém raças filtradas por tipo de animal
   */
  function getBreedsByAnimalType(animalTypeId: number): Breed[] {
    return breeds.filter((breed) => breed.animalTypeId === animalTypeId);
  }

  /**
   * Obtém grupos de idade filtrados por tipo de animal
   */
  function getAgeGroupsByAnimalType(animalTypeId: number): AgeGroup[] {
    return ageGroups.filter((ageGroup) => ageGroup.animalTypeId === animalTypeId);
  }

  return {
    farms,
    events,
    breeds,
    animalTypes,
    ageGroups,
    unitOfMeasures,
    loading,
    getPastures,
    getEventDetails,
    getBreedsByAnimalType,
    getAgeGroupsByAnimalType,
    refresh: loadReferenceData,
  };
}

/**
 * Hook específico para fazendas
 */
export function useFarms() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFarms();
  }, []);

  async function loadFarms() {
    try {
      const data = await referenceService.getFarms();
      setFarms(data);
    } catch (error) {
      console.error('Erro ao carregar fazendas:', error);
    } finally {
      setLoading(false);
    }
  }

  return { farms, loading, refresh: loadFarms };
}

/**
 * Hook específico para eventos
 */
export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const data = await referenceService.getEvents();
      setEvents(data);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    } finally {
      setLoading(false);
    }
  }

  return { events, loading, refresh: loadEvents };
}

/**
 * Hook específico para tipos de animais
 */
export function useAnimalTypes() {
  const [animalTypes, setAnimalTypes] = useState<AnimalType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnimalTypes();
  }, []);

  async function loadAnimalTypes() {
    try {
      const data = await referenceService.getAnimalTypes();
      setAnimalTypes(data);
    } catch (error) {
      console.error('Erro ao carregar tipos de animais:', error);
    } finally {
      setLoading(false);
    }
  }

  return { animalTypes, loading, refresh: loadAnimalTypes };
}

/**
 * Hook específico para raças (com filtro opcional por tipo de animal)
 */
export function useBreeds(animalTypeId?: number) {
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBreeds();
  }, [animalTypeId]);

  async function loadBreeds() {
    try {
      const data = await referenceService.getBreeds(animalTypeId);
      setBreeds(data);
    } catch (error) {
      console.error('Erro ao carregar raças:', error);
    } finally {
      setLoading(false);
    }
  }

  return { breeds, loading, refresh: loadBreeds };
}

/**
 * Hook específico para grupos de idade (com filtro opcional por tipo de animal)
 */
export function useAgeGroups(animalTypeId?: number) {
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgeGroups();
  }, [animalTypeId]);

  async function loadAgeGroups() {
    try {
      const data = await referenceService.getAgeGroups(animalTypeId);
      setAgeGroups(data);
    } catch (error) {
      console.error('Erro ao carregar grupos de idade:', error);
    } finally {
      setLoading(false);
    }
  }

  return { ageGroups, loading, refresh: loadAgeGroups };
}

/**
 * Hook específico para pastos (com filtro opcional por fazenda)
 */
export function usePastures(farmId?: number) {
  const [pastures, setPastures] = useState<Pasture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPastures();
  }, [farmId]);

  async function loadPastures() {
    try {
      const data = await referenceService.getPastures(farmId);
      setPastures(data);
    } catch (error) {
      console.error('Erro ao carregar pastos:', error);
    } finally {
      setLoading(false);
    }
  }

  return { pastures, loading, refresh: loadPastures };
}

/**
 * Hook específico para detalhes de eventos (com filtro opcional por evento)
 */
export function useEventDetails(eventId?: number) {
  const [eventDetails, setEventDetails] = useState<EventDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEventDetails();
  }, [eventId]);

  async function loadEventDetails() {
    try {
      const data = await referenceService.getEventDetails(eventId);
      setEventDetails(data);
    } catch (error) {
      console.error('Erro ao carregar detalhes de eventos:', error);
    } finally {
      setLoading(false);
    }
  }

  return { eventDetails, loading, refresh: loadEventDetails };
}

