import { Product, SensorReading, StaffShift } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  // Out of stock (68 references in slides, we seed a subset)
  {
    id: 'p1',
    name: 'CLAMOXYL 1g - Boite de 14 comprimés',
    code: '870021462319',
    category: 'Medicaments',
    stock: 0,
    minStock: 25,
    camv: 120,
    price: 18.885,
    margin: 22,
    expiryDate: '2027-11-20',
    grossist: 'Cogepha',
    isOutOfStock: true
  },
  {
    id: 'p2',
    name: 'DOLIPRANE 1000mg - Boite de 8 comprimés',
    code: '3282776003',
    category: 'Medicaments',
    stock: 0,
    minStock: 50,
    camv: 350,
    price: 3.520,
    margin: 18,
    expiryDate: '2028-04-12',
    grossist: 'PCT',
    isOutOfStock: true
  },
  {
    id: 'p3',
    name: 'MAXILASE 3000 U.I. COMP. ENROB. B/24',
    code: '6192408103',
    category: 'Medicaments',
    stock: 0,
    minStock: 30,
    camv: 180,
    price: 7.590,
    margin: 20,
    expiryDate: '2027-09-05',
    grossist: 'Cogepha',
    isOutOfStock: true
  },
  {
    id: 'p4',
    name: 'FIXODENT CREME ADHESIVE NATURAL 47g',
    code: '870021462318',
    category: 'Hygiene & Soins',
    stock: 0,
    minStock: 10,
    camv: 45,
    price: 16.500,
    margin: 25,
    expiryDate: '2026-12-15',
    grossist: 'Medigros',
    isOutOfStock: true
  },
  {
    id: 'p5',
    name: 'LAIT FARINE APRANOR 3EME AGE 400g',
    code: '6192403911',
    category: 'Complements',
    stock: 0,
    minStock: 15,
    camv: 60,
    price: 27.000,
    margin: 15,
    expiryDate: '2027-02-18',
    grossist: 'Medigros',
    isOutOfStock: true
  },
  
  // Close to expiry (112 products in slides, we seed a subset)
  {
    id: 'p6',
    name: 'AUGMENTIN Enfant 100mg/12.5mg - Flacon 60ml',
    code: '4859140172',
    category: 'Medicaments',
    stock: 12,
    minStock: 20,
    camv: 85,
    price: 14.255,
    margin: 22,
    expiryDate: '2026-08-15', // Close to expiry (July 2026 current time)
    grossist: 'PCT',
    isOutOfStock: false
  },
  {
    id: 'p7',
    name: 'PHYSIOGEL Creme Hydratante 150ml',
    code: '3041091670',
    category: 'Hygiene & Soins',
    stock: 8,
    minStock: 12,
    camv: 30,
    price: 43.500,
    margin: 30,
    expiryDate: '2026-09-01', // Close to expiry
    grossist: 'Direct Lab',
    isOutOfStock: false
  },
  {
    id: 'p8',
    name: 'GAVISCON Menthe Suspension Buvable 250ml',
    code: '3282776012',
    category: 'Medicaments',
    stock: 24,
    minStock: 15,
    camv: 110,
    price: 9.850,
    margin: 20,
    expiryDate: '2026-08-30', // Close to expiry
    grossist: 'Cogepha',
    isOutOfStock: false
  },
  {
    id: 'p9',
    name: 'BION 3 Senior - Boite de 30 comprîmés',
    code: '4569140221',
    category: 'Complements',
    stock: 14,
    minStock: 10,
    camv: 40,
    price: 32.400,
    margin: 25,
    expiryDate: '2026-08-20', // Close to expiry
    grossist: 'Medigros',
    isOutOfStock: false
  },

  // Normal stock items
  {
    id: 'p10',
    name: 'EUPHYTOSE - Boite de 120 comprimés',
    code: '3400934376483',
    category: 'Complements',
    stock: 45,
    minStock: 15,
    camv: 90,
    price: 12.800,
    margin: 20,
    expiryDate: '2028-05-18',
    grossist: 'Cogepha',
    isOutOfStock: false
  },
  {
    id: 'p11',
    name: 'PARACETAMOL Arrow 500mg - Boite de 16',
    code: '3400936306358',
    category: 'Medicaments',
    stock: 88,
    minStock: 30,
    camv: 400,
    price: 1.950,
    margin: 15,
    expiryDate: '2029-01-10',
    grossist: 'PCT',
    isOutOfStock: false
  },
  {
    id: 'p12',
    name: 'DUREX Preservatifs Classic Boite de 12',
    code: '5011417572710',
    category: 'Hygiene & Soins',
    stock: 18,
    minStock: 8,
    camv: 50,
    price: 15.600,
    margin: 35,
    expiryDate: '2030-03-24',
    grossist: 'Direct Lab',
    isOutOfStock: false
  }
];

export const INITIAL_SENSORS: SensorReading[] = [
  {
    id: 's1',
    name: 'Réfrigérateur Principal (Vaccins)',
    location: 'Zone Froide A',
    temperature: 4.2,
    humidity: 48,
    minTemp: 2.0,
    maxTemp: 8.0,
    status: 'Normal',
    history: [
      { time: '09:00', temperature: 4.1, humidity: 47 },
      { time: '10:00', temperature: 4.3, humidity: 48 },
      { time: '11:00', temperature: 4.5, humidity: 49 },
      { time: '12:00', temperature: 4.2, humidity: 48 },
      { time: '13:00', temperature: 4.0, humidity: 46 },
      { time: '14:00', temperature: 4.2, humidity: 48 },
      { time: '15:00', temperature: 4.2, humidity: 48 }
    ]
  },
  {
    id: 's2',
    name: 'Box Stockage (Insuline)',
    location: 'Zone Froide B',
    temperature: 5.1,
    humidity: 51,
    minTemp: 2.0,
    maxTemp: 8.0,
    status: 'Normal',
    history: [
      { time: '09:00', temperature: 5.0, humidity: 50 },
      { time: '10:00', temperature: 5.2, humidity: 52 },
      { time: '11:00', temperature: 5.5, humidity: 51 },
      { time: '12:00', temperature: 5.4, humidity: 50 },
      { time: '13:00', temperature: 5.1, humidity: 49 },
      { time: '14:00', temperature: 5.0, humidity: 50 },
      { time: '15:00', temperature: 5.1, humidity: 51 }
    ]
  },
  {
    id: 's3',
    name: 'Réserve Générale',
    location: 'Stock Central',
    temperature: 21.8,
    humidity: 55,
    minTemp: 15.0,
    maxTemp: 25.0,
    status: 'Normal',
    history: [
      { time: '09:00', temperature: 20.5, humidity: 54 },
      { time: '10:00', temperature: 21.0, humidity: 54 },
      { time: '11:00', temperature: 21.5, humidity: 55 },
      { time: '12:00', temperature: 22.0, humidity: 56 },
      { time: '13:00', temperature: 22.4, humidity: 55 },
      { time: '14:00', temperature: 22.1, humidity: 54 },
      { time: '15:00', temperature: 21.8, humidity: 55 }
    ]
  },
  {
    id: 's4',
    name: 'Laboratoire de Préparation',
    location: 'Labo Officine',
    temperature: 22.5,
    humidity: 58,
    minTemp: 15.0,
    maxTemp: 25.0,
    status: 'Normal',
    history: [
      { time: '09:00', temperature: 21.8, humidity: 57 },
      { time: '10:00', temperature: 22.1, humidity: 57 },
      { time: '11:00', temperature: 22.4, humidity: 58 },
      { time: '12:00', temperature: 22.8, humidity: 59 },
      { time: '13:00', temperature: 23.0, humidity: 60 },
      { time: '14:00', temperature: 22.7, humidity: 59 },
      { time: '15:00', temperature: 22.5, humidity: 58 }
    ]
  }
];

export const INITIAL_STAFF: StaffShift[] = [
  {
    id: 'st1',
    name: 'Nidhal Gharbi',
    email: 'nidhalgharbi@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    role: 'Pharmacien Titulaire',
    schedule: {
      'Lundi': 'Matin',
      'Mardi': 'Matin',
      'Mercredi': 'Après-midi',
      'Jeudi': 'Après-midi',
      'Vendredi': 'Matin',
      'Samedi': 'Matin',
      'Dimanche': 'Repos'
    }
  },
  {
    id: 'st2',
    name: 'Akrem Issaoui',
    email: 'akrem.issaoui1@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    role: 'Pharmacien Adjoint',
    schedule: {
      'Lundi': 'Après-midi',
      'Mardi': 'Après-midi',
      'Mercredi': 'Matin',
      'Jeudi': 'Matin',
      'Vendredi': 'Après-midi',
       Samedi: 'Après-midi',
      'Dimanche': 'Repos'
    }
  },
  {
    id: 'st3',
    name: 'Saber Sakli',
    email: 'mhamdiazer13@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    role: 'Préparateur',
    schedule: {
      'Lundi': 'Matin',
      'Mardi': 'Après-midi',
      'Mercredi': 'Repos',
      'Jeudi': 'Matin',
      'Vendredi': 'Matin',
      'Samedi': 'Garde',
      'Dimanche': 'Garde' // Saber takes Saturday and Sunday Guard shifts
    }
  },
  {
    id: 'st4',
    name: 'Mohamed Raddaoui',
    email: 'Mohamed.RADDAOUI@esprit.tn',
    avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=200',
    role: 'Stagiaire',
    schedule: {
      'Lundi': 'Matin',
      'Mardi': 'Matin',
      'Mercredi': 'Matin',
      'Jeudi': 'Matin',
      'Vendredi': 'Après-midi',
      'Samedi': 'Repos',
      'Dimanche': 'Repos'
    }
  }
];
