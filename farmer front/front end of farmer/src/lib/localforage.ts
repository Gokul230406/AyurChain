import localforage from 'localforage';

// Configure LocalForage for offline storage
localforage.config({
  name: 'HerbChain',
  storeName: 'herbs_data',
  description: 'Offline storage for HerbChain herb records'
});

export interface HerbRecord {
  id: string;
  herbName: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timestamp: string;
  photo: string; // base64 encoded image
  farmerId: string;
  farmerName: string;
  quantity: number;
  unit: string;
  quality: string;
  notes?: string;
  synced: boolean;
  backendHash?: string;
  backendCid?: string;
  status?: 'pending' | 'certified' | 'rejected' | 'unknown';
  rejectedReason?: string;
}

class LocalForageService {
  // Herb records operations
  async saveHerbRecord(record: HerbRecord): Promise<void> {
    const records = await this.getAllHerbRecords();
    records.push(record);
    await localforage.setItem('herbRecords', records);
  }

  async getAllHerbRecords(): Promise<HerbRecord[]> {
    const records = await localforage.getItem<HerbRecord[]>('herbRecords');
    return records || [];
  }

  async getUnsyncedRecords(): Promise<HerbRecord[]> {
    const records = await this.getAllHerbRecords();
    return records.filter(record => !record.synced);
  }

  async markRecordAsSynced(recordId: string): Promise<void> {
    const records = await this.getAllHerbRecords();
    const updatedRecords = records.map(record => 
      record.id === recordId ? { ...record, synced: true } : record
    );
    await localforage.setItem('herbRecords', updatedRecords);
  }

  async updateRecord(recordId: string, patch: Partial<HerbRecord>): Promise<void> {
    const records = await this.getAllHerbRecords();
    const updatedRecords = records.map(record => 
      record.id === recordId ? { ...record, ...patch } : record
    );
    await localforage.setItem('herbRecords', updatedRecords);
  }


  // Clear all data
  async clearAll(): Promise<void> {
    await localforage.clear();
  }
}

export const localForageService = new LocalForageService();