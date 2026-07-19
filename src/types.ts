export interface Product {
  id: string;
  name: string;
  code: string;
  category: 'Medicaments' | 'Parapharmacie' | 'Complements' | 'Hygiene & Soins' | 'Autres';
  stock: number;
  minStock: number;
  camv: number; // Consommation Annuelle Moyenne Vendue
  price: number; // in DT (Dinar Tunisien)
  margin: number; // percentage
  expiryDate: string; // YYYY-MM-DD
  grossist: 'Cogepha' | 'Medigros' | 'PCT' | 'Direct Lab';
  isOutOfStock: boolean;
}

export interface SensorReading {
  id: string;
  name: string;
  location: string;
  temperature: number;
  humidity: number;
  minTemp: number;
  maxTemp: number;
  status: 'Normal' | 'Warning' | 'Critical';
  history: Array<{ time: string; temperature: number; humidity: number }>;
}

export interface StaffShift {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Pharmacien Titulaire' | 'Pharmacien Adjoint' | 'Préparateur' | 'Stagiaire';
  schedule: {
    [key: string]: 'Matin' | 'Après-midi' | 'Garde' | 'Repos'; // e.g. "Lundi": "Matin"
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  isAudio?: boolean;
  actionExecuted?: {
    type: 'order' | 'schedule' | 'cold_chain' | 'drive_upload';
    description: string;
    details: any;
  };
}

export interface OrderDraft {
  grossist: string;
  items: Array<{
    product: Product;
    quantity: number;
  }>;
}
