import * as SQLite from 'expo-sqlite';
import { AnimalType, AgeGroup, Breed, Event, EventDetail, Farm, Pasture } from './reference.service';

// Interface para compatibilidade com código existente
export interface Movement {
  localId: string;
  movementId: number;
  date: string;
  farmId: number;
  farm: Farm;
  pastureId: number;
  pasture: Pasture;
  eventId: number;
  event: Event;
  eventDetailId?: number;
  eventDetail?: EventDetail;
  comment?: string;
  status: string;
  movementDetails: MovementDetail[];
  movementMedias: MovementMedia[];
  synced: number;
}

export interface MovementDetail {
  movementDetailId: number;
  movementId: number;
  animalTypeId: number;
  animalType: AnimalType;
  breedId: number;
  breed: Breed;
  ageGroupId: number;
  ageGroup: AgeGroup;
  gender: "M" | "F";
  quantity: number;
  comment: string;
  movementMedias: MovementMedia[];
}

export interface MovementMedia {
  movementMediaId: number;
  movementId: number;
  movementDetailId?: number;
  fileType: string;
  url: string;
  caption: string;
}

export interface UserData {
  userxId: number;
  name: string;
  email: string;
  username: string;
  data: string;
  lastSync: string;
}

export interface ReferenceData {
  type: string;
  data: string;
  lastSync: string;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private readonly CURRENT_DB_VERSION = 3;

  /**
   * Inicializa o banco de dados e cria as tabelas
   */
  async initialize() {
    // Se já está inicializado, retorna imediatamente
    if (this.isInitialized && this.db) {
      return;
    }

    // Se já está inicializando, aguarda a inicialização em andamento
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Cria a promise de inicialização
    this.initializationPromise = this._doInitialize();
    
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async _doInitialize() {
    try {
      // Abre ou cria o banco de dados
      this.db = await SQLite.openDatabaseAsync('devon_db.db');

      // Verifica a versão do banco e faz migração se necessário
      await this.migrateDatabase();

      // Cria as tabelas
      await this.createTables();

      this.isInitialized = true;

      if (__DEV__) {
        console.log('💾 Banco de dados SQLite inicializado');
      }
    } catch (error) {
      console.error('Erro ao inicializar banco de dados:', error);
      throw error;
    }
  }

  /**
   * Verifica e migra o banco de dados se necessário
   */
  private async migrateDatabase() {
    if (!this.db) throw new Error('Database not initialized');

    // Cria tabela de versão se não existir
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS db_version (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Verifica versão atual
    const versionRow = await this.db.getFirstAsync<any>(
      `SELECT version FROM db_version WHERE id = 1`
    );

    const currentVersion = versionRow?.version || 0;

    if (currentVersion < this.CURRENT_DB_VERSION) {
      if (__DEV__) {
        console.log(`📦 Migrando banco de dados da versão ${currentVersion} para ${this.CURRENT_DB_VERSION}`);
      }

      // Se é uma versão antiga ou primeira instalação, recria tudo
      await this.dropAllTables();

      // Atualiza a versão
      if (currentVersion === 0) {
        await this.db.runAsync(
          `INSERT INTO db_version (id, version, updated_at) VALUES (1, ?, ?)`,
          [this.CURRENT_DB_VERSION, new Date().toISOString()]
        );
      } else {
        await this.db.runAsync(
          `UPDATE db_version SET version = ?, updated_at = ? WHERE id = 1`,
          [this.CURRENT_DB_VERSION, new Date().toISOString()]
        );
      }
    }
  }

  /**
   * Remove todas as tabelas do banco (exceto db_version)
   */
  private async dropAllTables() {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      DROP TABLE IF EXISTS movement_medias;
      DROP TABLE IF EXISTS movement_details;
      DROP TABLE IF EXISTS movements;
      DROP TABLE IF EXISTS user_data;
      DROP TABLE IF EXISTS sync_queue;
      DROP TABLE IF EXISTS reference_data;
    `);

    if (__DEV__) {
      console.log('🗑️ Tabelas antigas removidas');
    }
  }

  /**
   * Cria as tabelas do banco de dados
   */
  private async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    // Tabela de movimentações
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_id TEXT NOT NULL UNIQUE,
        movement_id INTEGER,
        date TEXT NOT NULL,
        farm_id INTEGER NOT NULL,
        farm_name TEXT,
        pasture_id INTEGER NOT NULL,
        pasture_description TEXT,
        event_id INTEGER NOT NULL,
        event_description TEXT,
        event_operation TEXT,
        event_detail_id INTEGER,
        event_detail_description TEXT,
        comment TEXT,
        status TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_movements_local_id ON movements(local_id);
      CREATE INDEX IF NOT EXISTS idx_movements_movement_id ON movements(movement_id);
      CREATE INDEX IF NOT EXISTS idx_movements_synced ON movements(synced);
      CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(date);
    `);

    // Tabela de detalhes de movimentações
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS movement_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movement_detail_id INTEGER NOT NULL,
        movement_id INTEGER NOT NULL,
        animal_type_id INTEGER NOT NULL,
        animal_type_name TEXT,
        breed_id INTEGER NOT NULL,
        breed_name TEXT,
        age_group_id INTEGER NOT NULL,
        age_group_name TEXT,
        gender TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        comment TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (movement_id) REFERENCES movements(movement_id)
      );

      CREATE INDEX IF NOT EXISTS idx_movement_details_movement_id ON movement_details(movement_id);
      CREATE INDEX IF NOT EXISTS idx_movement_details_movement_detail_id ON movement_details(movement_detail_id);
    `);

    // Tabela de mídias de movimentações
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS movement_medias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movement_media_id INTEGER NOT NULL,
        movement_id INTEGER NOT NULL,
        movement_detail_id INTEGER,
        file_type TEXT NOT NULL,
        url TEXT NOT NULL,
        caption TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (movement_id) REFERENCES movements(movement_id),
        FOREIGN KEY (movement_detail_id) REFERENCES movement_details(movement_detail_id)
      );

      CREATE INDEX IF NOT EXISTS idx_movement_medias_movement_id ON movement_medias(movement_id);
      CREATE INDEX IF NOT EXISTS idx_movement_medias_movement_detail_id ON movement_medias(movement_detail_id);
    `);

    // Tabela de dados do usuário
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userx_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        username TEXT NOT NULL,
        data TEXT NOT NULL,
        last_sync TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_user_data_userx_id ON user_data(userx_id);
    `);

    // Tabela de fila de sincronização
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sync_queue_type ON sync_queue(type);
    `);

    // Tabela de dados de referência
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS reference_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL UNIQUE,
        data TEXT NOT NULL,
        last_sync TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_reference_data_type ON reference_data(type);
    `);
  }

  /**
   * Garante que o banco está inicializado
   * Se a inicialização estiver em andamento, aguarda sua conclusão
   */
  private async ensureInitialized() {
    // Se já está inicializado, retorna imediatamente
    if (this.db && this.isInitialized) {
      return;
    }

    // Se há uma inicialização em andamento, aguarda
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    // Se não está inicializado e não há inicialização em andamento, tenta inicializar
    await this.initialize();
  }

  // ==================== MOVEMENTS ====================

  async saveMovement(movement: Movement): Promise<number> {
    await this.ensureInitialized();

    const now = new Date().toISOString();
    const localId = movement.localId;

    // Inicia uma transação
    await this.db!.execAsync('BEGIN TRANSACTION');

    try {
      // Insere o movimento principal
      const movementResult = await this.db!.runAsync(
        `INSERT INTO movements (
          local_id, movement_id, date, farm_id, farm_name, pasture_id, pasture_description,
          event_id, event_description, event_operation, event_detail_id, event_detail_description,
          comment, status, synced, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          localId,
          movement.movementId || null,
          movement.date,
          movement.farmId,
          movement.farm.name,
          movement.pastureId,
          movement.pasture.description,
          movement.eventId,
          movement.event.description,
          movement.event.operation,
          movement.eventDetailId || null,
          movement.eventDetail?.description || null,
          movement.comment || null,
          movement.status,
          0, // synced
          now,
          now,
        ]
      );

      // Insere os detalhes do movimento
      if (movement.movementDetails && movement.movementDetails.length > 0) {
        for (const detail of movement.movementDetails) {
          await this.db!.runAsync(
            `INSERT INTO movement_details (
              movement_detail_id, movement_id, animal_type_id, animal_type_name,
              breed_id, breed_name, age_group_id, age_group_name,
              gender, quantity, comment, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              detail.movementDetailId,
              movement.movementId,
              detail.animalTypeId,
              detail.animalType.name,
              detail.breedId,
              detail.breed.name,
              detail.ageGroupId,
              detail.ageGroup.name,
              detail.gender,
              detail.quantity,
              detail.comment || null,
              now,
              now,
            ]
          );

          // Insere as mídias do detalhe (se houver)
          if (detail.movementMedias && detail.movementMedias.length > 0) {
            for (const media of detail.movementMedias) {
              await this.db!.runAsync(
                `INSERT INTO movement_medias (
                  movement_media_id, movement_id, movement_detail_id,
                  file_type, url, caption, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  media.movementMediaId,
                  movement.movementId,
                  detail.movementDetailId,
                  media.fileType,
                  media.url,
                  media.caption || null,
                  now,
                  now,
                ]
              );
            }
          }
        }
      }

      // Insere as mídias gerais do movimento (se houver)
      if (movement.movementMedias && movement.movementMedias.length > 0) {
        for (const media of movement.movementMedias) {
          await this.db!.runAsync(
            `INSERT INTO movement_medias (
              movement_media_id, movement_id, movement_detail_id,
              file_type, url, caption, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              media.movementMediaId,
              movement.movementId,
              media.movementDetailId || null,
              media.fileType,
              media.url,
              media.caption || null,
              now,
              now,
            ]
          );
        }
      }

      // Confirma a transação
      await this.db!.execAsync('COMMIT');

      return movementResult.lastInsertRowId;
    } catch (error) {
      // Reverte a transação em caso de erro
      await this.db!.execAsync('ROLLBACK');
      throw error;
    }
  }

  async getMovements(): Promise<Movement[]> {
    await this.ensureInitialized();

    const rows = await this.db!.getAllAsync<any>(
      `SELECT * FROM movements ORDER BY date DESC, created_at DESC`
    );

    const movements: Movement[] = [];

    for (const row of rows) {
      const movement = await this.rowToMovement(row);
      movements.push(movement);
    }

    return movements;
  }

  async getMovementsByFarm(farmId: number): Promise<Movement[]> {
    await this.ensureInitialized();

    const rows = await this.db!.getAllAsync<any>(
      `SELECT * FROM movements WHERE farm_id = ? ORDER BY date DESC, created_at DESC`,
      [farmId]
    );

    const movements: Movement[] = [];

    for (const row of rows) {
      const movement = await this.rowToMovement(row);
      movements.push(movement);
    }

    return movements;
  }

  async getPendingMovements(): Promise<Movement[]> {
    await this.ensureInitialized();

    const rows = await this.db!.getAllAsync<any>(
      `SELECT * FROM movements WHERE synced = 0 ORDER BY created_at ASC`
    );

    const movements: Movement[] = [];

    for (const row of rows) {
      const movement = await this.rowToMovement(row);
      movements.push(movement);
    }

    return movements;
  }

  async getMovementById(movementId: number): Promise<Movement | null> {
    await this.ensureInitialized();

    const row = await this.db!.getFirstAsync<any>(
      `SELECT * FROM movements WHERE movement_id = ?`,
      [movementId]
    );

    if (!row) {
      return null;
    }

    return await this.rowToMovement(row);
  }

  async markMovementAsSynced(localId: string, movementId: number): Promise<void> {
    await this.ensureInitialized();

    await this.db!.runAsync(
      `UPDATE movements SET synced = 1, movement_id = ?, updated_at = ? WHERE local_id = ?`,
      [movementId, new Date().toISOString(), localId]
    );
  }

  async deleteMovement(movementId: number): Promise<void> {
    await this.ensureInitialized();

    await this.db!.execAsync('BEGIN TRANSACTION');

    try {
      // Deleta as mídias
      await this.db!.runAsync(
        `DELETE FROM movement_medias WHERE movement_id = ?`,
        [movementId]
      );

      // Deleta os detalhes
      await this.db!.runAsync(
        `DELETE FROM movement_details WHERE movement_id = ?`,
        [movementId]
      );

      // Deleta o movimento
      await this.db!.runAsync(
        `DELETE FROM movements WHERE movement_id = ?`,
        [movementId]
      );

      await this.db!.execAsync('COMMIT');
    } catch (error) {
      await this.db!.execAsync('ROLLBACK');
      throw error;
    }
  }

  // ==================== USER DATA ====================

  async saveUserData(userData: UserData): Promise<void> {
    await this.ensureInitialized();

    const existing = await this.db!.getFirstAsync<any>(
      `SELECT id FROM user_data WHERE userx_id = ?`,
      [userData.userxId]
    );

    const now = new Date().toISOString();

    if (existing) {
      // Atualiza o existente
      await this.db!.runAsync(
        `UPDATE user_data SET 
          name = ?, email = ?, username = ?, data = ?, 
          last_sync = ?, updated_at = ?
        WHERE userx_id = ?`,
        [
          userData.name,
          userData.email,
          userData.username,
          userData.data,
          userData.lastSync,
          now,
          userData.userxId,
        ]
      );
    } else {
      // Cria um novo
      await this.db!.runAsync(
        `INSERT INTO user_data (
          userx_id, name, email, username, data, last_sync, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.userxId,
          userData.name,
          userData.email,
          userData.username,
          userData.data,
          userData.lastSync,
          now,
          now,
        ]
      );
    }
  }

  async getUserData(userxId: number): Promise<UserData | null> {
    await this.ensureInitialized();

    const row = await this.db!.getFirstAsync<any>(
      `SELECT * FROM user_data WHERE userx_id = ?`,
      [userxId]
    );

    if (!row) {
      return null;
    }

    return {
      userxId: row.userx_id,
      name: row.name,
      email: row.email,
      username: row.username,
      data: row.data,
      lastSync: row.last_sync,
    };
  }

  async clearUserData(userxId: number): Promise<void> {
    await this.ensureInitialized();

    await this.db!.runAsync(`DELETE FROM user_data WHERE userx_id = ?`, [userxId]);
  }

  // ==================== SYNC QUEUE ====================

  async addToSyncQueue(type: string, payload: any): Promise<void> {
    await this.ensureInitialized();

    const now = new Date().toISOString();

    await this.db!.runAsync(
      `INSERT INTO sync_queue (type, payload, attempts, created_at, updated_at)
       VALUES (?, ?, 0, ?, ?)`,
      [type, JSON.stringify(payload), now, now]
    );
  }

  async getSyncQueue(): Promise<
    Array<{ id: string; type: string; payload: any; attempts: number }>
  > {
    await this.ensureInitialized();

    const rows = await this.db!.getAllAsync<any>(
      `SELECT * FROM sync_queue ORDER BY created_at ASC`
    );

    return rows.map((row) => ({
      id: row.id.toString(),
      type: row.type,
      payload: JSON.parse(row.payload),
      attempts: row.attempts,
    }));
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    await this.ensureInitialized();

    await this.db!.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [parseInt(id)]);
  }

  async incrementSyncAttempts(id: string): Promise<void> {
    await this.ensureInitialized();

    const now = new Date().toISOString();

    await this.db!.runAsync(
      `UPDATE sync_queue SET attempts = attempts + 1, updated_at = ? WHERE id = ?`,
      [now, parseInt(id)]
    );
  }

  // ==================== REFERENCE DATA ====================

  async saveReferenceData(type: string, data: any): Promise<void> {
    await this.ensureInitialized();

    const existing = await this.db!.getFirstAsync<any>(
      `SELECT id FROM reference_data WHERE type = ?`,
      [type]
    );

    const now = new Date().toISOString();

    if (existing) {
      // Atualiza o existente
      await this.db!.runAsync(
        `UPDATE reference_data SET data = ?, last_sync = ?, updated_at = ? WHERE type = ?`,
        [JSON.stringify(data), now, now, type]
      );
    } else {
      // Cria um novo
      await this.db!.runAsync(
        `INSERT INTO reference_data (type, data, last_sync, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [type, JSON.stringify(data), now, now, now]
      );
    }
  }

  async getReferenceData(type: string): Promise<any | null> {
    await this.ensureInitialized();

    const row = await this.db!.getFirstAsync<any>(
      `SELECT data FROM reference_data WHERE type = ?`,
      [type]
    );

    if (!row) {
      return null;
    }

    try {
      return JSON.parse(row.data);
    } catch (error) {
      console.error(`Erro ao fazer parse de ${type}:`, error);
      return null;
    }
  }

  async clearReferenceData(): Promise<void> {
    await this.ensureInitialized();

    await this.db!.runAsync(`DELETE FROM reference_data`);
  }

  // ==================== UTILITY ====================

  async clearMovements(): Promise<void> {
    await this.ensureInitialized();

    await this.db!.execAsync('BEGIN TRANSACTION');

    try {
      // Deleta todas as mídias
      await this.db!.runAsync('DELETE FROM movement_medias');
      
      // Deleta todos os detalhes
      await this.db!.runAsync('DELETE FROM movement_details');
      
      // Deleta todas as movimentações
      await this.db!.runAsync('DELETE FROM movements');

      await this.db!.execAsync('COMMIT');

      if (__DEV__) {
        console.log('🗑️ Todas as movimentações foram limpas');
      }
    } catch (error) {
      await this.db!.execAsync('ROLLBACK');
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    await this.ensureInitialized();

    await this.db!.execAsync(`
      DELETE FROM movements;
      DELETE FROM movement_details;
      DELETE FROM movement_medias;
      DELETE FROM user_data;
      DELETE FROM sync_queue;
      DELETE FROM reference_data;
    `);

    if (__DEV__) {
      console.log('🗑️ Todos os dados foram limpos');
    }
  }

  async getStats(): Promise<{ totalMovements: number; pendingSync: number }> {
    await this.ensureInitialized();

    const totalResult = await this.db!.getFirstAsync<any>(
      `SELECT COUNT(*) as count FROM movements`
    );

    const pendingResult = await this.db!.getFirstAsync<any>(
      `SELECT COUNT(*) as count FROM movements WHERE synced = 0`
    );

    return {
      totalMovements: totalResult?.count || 0,
      pendingSync: pendingResult?.count || 0,
    };
  }

  async getStatsByFarm(farmId: number): Promise<{ totalMovements: number; pendingSync: number }> {
    await this.ensureInitialized();

    const totalResult = await this.db!.getFirstAsync<any>(
      `SELECT COUNT(*) as count FROM movements WHERE farm_id = ?`,
      [farmId]
    );

    const pendingResult = await this.db!.getFirstAsync<any>(
      `SELECT COUNT(*) as count FROM movements WHERE farm_id = ? AND synced = 0`,
      [farmId]
    );

    return {
      totalMovements: totalResult?.count || 0,
      pendingSync: pendingResult?.count || 0,
    };
  }

  // ==================== HELPER METHODS ====================

  private async rowToMovement(row: any): Promise<Movement> {
    // Busca os detalhes do movimento
    const detailRows = await this.db!.getAllAsync<any>(
      `SELECT * FROM movement_details WHERE movement_id = ?`,
      [row.movement_id]
    );

    const movementDetails: MovementDetail[] = [];

    for (const detailRow of detailRows) {
      // Busca as mídias do detalhe
      const mediaRows = await this.db!.getAllAsync<any>(
        `SELECT * FROM movement_medias WHERE movement_detail_id = ?`,
        [detailRow.movement_detail_id]
      );

      const movementMedias: MovementMedia[] = mediaRows.map((mediaRow) => ({
        movementMediaId: mediaRow.movement_media_id,
        movementId: mediaRow.movement_id,
        movementDetailId: mediaRow.movement_detail_id,
        fileType: mediaRow.file_type,
        url: mediaRow.url,
        caption: mediaRow.caption,
      }));

      movementDetails.push({
        movementDetailId: detailRow.movement_detail_id,
        movementId: detailRow.movement_id,
        animalTypeId: detailRow.animal_type_id,
        animalType: {
          animalTypeId: detailRow.animal_type_id,
          name: detailRow.animal_type_name,
          status: 'active',
        } as AnimalType,
        breedId: detailRow.breed_id,
        breed: {
          breedId: detailRow.breed_id,
          name: detailRow.breed_name,
          animalTypeId: detailRow.animal_type_id,
          status: 'active',
        } as Breed,
        ageGroupId: detailRow.age_group_id,
        ageGroup: {
          ageGroupId: detailRow.age_group_id,
          name: detailRow.age_group_name,
          animalTypeId: detailRow.animal_type_id,
          status: 'active',
        } as AgeGroup,
        gender: detailRow.gender as "M" | "F",
        quantity: detailRow.quantity,
        comment: detailRow.comment,
        movementMedias,
      });
    }

    // Busca as mídias gerais do movimento (sem movement_detail_id)
    const generalMediaRows = await this.db!.getAllAsync<any>(
      `SELECT * FROM movement_medias WHERE movement_id = ? AND movement_detail_id IS NULL`,
      [row.movement_id]
    );

    const movementMedias: MovementMedia[] = generalMediaRows.map((mediaRow) => ({
      movementMediaId: mediaRow.movement_media_id,
      movementId: mediaRow.movement_id,
      movementDetailId: mediaRow.movement_detail_id,
      fileType: mediaRow.file_type,
      url: mediaRow.url,
      caption: mediaRow.caption,
    }));

    return {
      localId: row.local_id,
      movementId: row.movement_id,
      date: row.date,
      farmId: row.farm_id,
      farm: {
        farmId: row.farm_id,
        name: row.farm_name,
        status: 'active',
      } as Farm,
      pastureId: row.pasture_id,
      pasture: {
        pastureId: row.pasture_id,
        description: row.pasture_description,
        farmId: row.farm_id,
        capacity: 0,
        capacityDescription: '',
        areaSize: 0,
        status: 'active',
      } as Pasture,
      eventId: row.event_id,
      event: {
        eventId: row.event_id,
        description: row.event_description,
        operation: row.event_operation,
        status: 'active',
      } as Event,
      eventDetailId: row.event_detail_id,
      eventDetail: {
        eventDetailId: row.event_detail_id,
        description: row.event_detail_description,
        eventId: row.event_id,
        status: 'active',
      } as EventDetail,
      comment: row.comment,
      status: row.status,
      movementDetails,
      movementMedias,
      synced: row.synced,
    };
  }

  /**
   * Fecha o banco de dados (útil para testes)
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

export default new DatabaseService();
