import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { INITIAL_PRODUCTS, INITIAL_SENSORS, INITIAL_STAFF, INITIAL_SUPPLIERS } from './src/data/mockData';

// Load environment variables
dotenv.config();

// In-memory Database state
let products = [...INITIAL_PRODUCTS];
let sensors = [...INITIAL_SENSORS];
let staff = [...INITIAL_STAFF];
let orders: any[] = [
  {
    id: 'ord-101',
    date: '2026-07-16T10:15:00-07:00',
    grossist: 'Cogepha',
    status: 'Livré',
    totalItems: 3,
    totalPrice: 145.500,
    items: [
      { name: 'CLAMOXYL 1g', quantity: 5, price: 18.885 },
      { name: 'DOLIPRANE 1000mg', quantity: 10, price: 3.520 },
      { name: 'MAXILASE 3000 U.I.', quantity: 2, price: 7.590 }
    ]
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Initialize Gemini client safely
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // Products endpoints
  app.get('/api/products', (req, res) => {
    res.json(products);
  });

  app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const updatedProduct = req.body;
    products = products.map((p) => (p.id === id ? { ...p, ...updatedProduct } : p));
    res.json({ success: true, product: products.find((p) => p.id === id) });
  });

  // Sensors endpoints
  app.get('/api/sensors', (req, res) => {
    res.json(sensors);
  });

  app.put('/api/sensors/:id', (req, res) => {
    const { id } = req.params;
    const updatedSensor = req.body;
    sensors = sensors.map((s) => (s.id === id ? { ...s, ...updatedSensor } : s));
    res.json({ success: true, sensor: sensors.find((s) => s.id === id) });
  });

  // Staff endpoints
  app.get('/api/staff', (req, res) => {
    res.json(staff);
  });

  app.put('/api/staff/:id', (req, res) => {
    const { id } = req.params;
    const updatedStaff = req.body;
    staff = staff.map((s) => (s.id === id ? { ...s, ...updatedStaff } : s));
    res.json({ success: true, staff: staff.find((s) => s.id === id) });
  });

  app.get('/api/suppliers', (req, res) => {
    const suppliers = INITIAL_SUPPLIERS.map((supplier) => {
      const supplierProducts = products.filter(product => product.grossist === supplier.grossist);
      const outOfStock = supplierProducts.filter(product => product.isOutOfStock).length;
      const expiringSoon = supplierProducts.filter(product => {
        const expiry = new Date(product.expiryDate);
        const diffMonths = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
        return diffMonths > 0 && diffMonths <= 3;
      }).length;

      return {
        ...supplier,
        productCount: supplierProducts.length,
        outOfStock,
        expiringSoon,
        stockValue: supplierProducts.reduce((total, product) => total + (product.stock * product.price), 0),
        topCategories: Array.from(new Set(supplierProducts.map(product => product.category)))
      };
    });

    res.json(suppliers);
  });

  // Orders endpoints
  app.get('/api/orders', (req, res) => {
    res.json(orders);
  });

  app.post('/api/orders', (req, res) => {
    const { grossist, items, totalPrice } = req.body;
    const newOrder = {
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString(),
      grossist,
      status: 'Envoyé',
      totalItems: items.length,
      totalPrice: totalPrice || items.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0),
      items: items.map((it: any) => ({
        name: it.name,
        quantity: it.quantity,
        price: it.price
      }))
    };

    // Update product stock if items were ordered (simulating delivery preparation)
    items.forEach((item: any) => {
      const prod = products.find(p => p.id === item.productId || p.name === item.name);
      if (prod) {
        prod.stock = (prod.stock || 0) + item.quantity;
        prod.isOutOfStock = prod.stock === 0;
      }
    });

    orders.unshift(newOrder);
    res.json({ success: true, order: newOrder });
  });

  // Gemini AI Chatbot "Hermes" endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history } = req.body;

      if (!ai) {
        return res.status(500).json({
          error: 'Gemini API Key is not configured. Please add GEMINI_API_KEY to your Secrets.'
        });
      }

      // Format current pharmacy context to ground the LLM
      const contextPrompt = `
Vous êtes "Hermes", l'agent intelligent de PharmaSmart, une plateforme de gestion autonome pour les pharmacies.
Vous assistez l'équipe de la pharmacie dans leurs tâches quotidiennes.

Voici l'état actuel en temps réel de l'officine (grounding data) :
1. CHIFFRES CLÉS :
   - Chiffre d'Affaires Mensuel Estimé : 125 983 DT
   - Références actuellement en rupture : ${products.filter(p => p.isOutOfStock).length} produits.
   - Produits proches de la péremption (< 3 mois) : ${products.filter(p => {
     const expiry = new Date(p.expiryDate);
    const diffMonths = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
     return diffMonths > 0 && diffMonths <= 3;
   }).length} produits.

2. STOCK DE PRODUITS ACTUEL :
${products.map(p => `   - [${p.id}] ${p.name} | Code: ${p.code} | Catégorie: ${p.category} | Stock: ${p.stock} (Min: ${p.minStock}) | CAMV: ${p.camv} | Prix: ${p.price} DT | Marge: ${p.margin}% | Grossiste: ${p.grossist} | Expire le: ${p.expiryDate} | En Rupture: ${p.isOutOfStock ? 'Oui' : 'Non'}`).join('\n')}

3. CAPTEURS IoT CHAÎNE DU FROID :
${sensors.map(s => `   - [${s.id}] ${s.name} (${s.location}) | Temp: ${s.temperature}°C (Plage: ${s.minTemp}-${s.maxTemp}°C) | Humidité: ${s.humidity}% | Statut: ${s.status}`).join('\n')}

4. ÉQUIPE DE LA PHARMACIE & PLANNING :
${staff.map(st => `   - [${st.id}] ${st.name} | Rôle: ${st.role} | Email: ${st.email} | Planning: Lundi: ${st.schedule['Lundi'] || 'Repos'}, Mardi: ${st.schedule['Mardi'] || 'Repos'}, Mercredi: ${st.schedule['Mercredi'] || 'Repos'}, Jeudi: ${st.schedule['Jeudi'] || 'Repos'}, Vendredi: ${st.schedule['Vendredi'] || 'Repos'}, Samedi: ${st.schedule['Samedi'] || 'Repos'}, Dimanche: ${st.schedule['Dimanche'] || 'Repos'}`).join('\n')}

VOTRE RÔLE ET INSTRUCTIONS :
1. Répondez de manière professionnelle, claire et conviviale, en français ou en dialecte tunisien (selon l'interlocuteur, par défaut en français professionnel et fluide).
2. Vous pouvez aider l'utilisateur à :
   - Analyser les ruptures de stock.
   - Proposer un bon de commande automatisé.
   - Vérifier les alertes de température (chaîne du froid).
   - Consulter ou optimiser le planning de l'équipe (ex. "qui est de garde ce weekend ?", "il y a un trou de couverture dimanche ?").
3. CAPACITÉ D'ACTION (IMPORTANT) :
   Si l'utilisateur vous demande d'effectuer une action, vous devez formuler votre réponse textuelle normale, PUIS ajouter un bloc JSON spécial à la toute fin de votre réponse, sur une nouvelle ligne, pour déclencher l'action sur l'interface.
   Formats d'actions pris en charge :
   
   - Créer une commande chez un grossiste :
     Si l'utilisateur valide une commande ou demande d'approvisionner des produits, ajoutez ce bloc exactement :
     {"action": "create_order", "grossist": "NomDuGrossiste", "items": [{"productId": "p1", "quantity": 10}, {"productId": "p2", "quantity": 15}]}
     
   - Ajuster ou optimiser le planning d'un membre du personnel :
     Si on vous demande de changer un shift ou de combler un trou :
     {"action": "update_schedule", "staffId": "st3", "day": "Dimanche", "shift": "Matin"}
     
   - Résoudre une alerte de température (simulée ou réelle) :
     Si l'utilisateur demande de stabiliser un frigo ou de marquer l'alarme comme résolue :
     {"action": "resolve_sensor", "sensorId": "s1"}
     
   - Générer un rapport pour Google Drive :
     Si l'utilisateur vous demande de sauvegarder ou d'exporter un rapport (par exemple d'inventaire, de planning ou de chaîne du froid) :
     {"action": "generate_report", "reportType": "inventory | schedule | cold_chain", "title": "PharmaSmart - Rapport ..."}

Soyez extrêmement concis et efficace dans vos réponses. Évitez les formules de politesse trop longues ou robotiques. Soyez l'assistant "Hermes" dynamique de PharmaSmart.
`;

      // Map chat history to Gemini SDK structure
      const contents = [];
      if (history && history.length > 0) {
        for (const h of history) {
          contents.push({
            role: h.role,
            parts: [{ text: h.content }]
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents,
        config: {
          systemInstruction: contextPrompt,
          temperature: 0.7
        }
      });

      const text = response.text || "Désolé, je n'ai pas pu générer de réponse.";
      
      // Parse out the JSON action block if it exists
      let cleanText = text;
      let action = null;

      // Regular expression to look for a JSON block at the end of the response
      const jsonRegex = /\{"action":\s*"[^"]+".*?\}/s;
      const match = text.match(jsonRegex);
      if (match) {
        try {
          action = JSON.parse(match[0]);
          // Strip the JSON block from the text response so it doesn't clutter the speech bubbles
          cleanText = text.replace(jsonRegex, '').trim();
        } catch (e) {
          console.error('Failed to parse action JSON from LLM response:', e);
        }
      }

      res.json({
        text: cleanText,
        action
      });

    } catch (error: any) {
      console.error('Chat API Error:', error);
      res.status(500).json({ error: error.message || 'An error occurred during processing.' });
    }
  });

  // --- Serve Frontend App ---

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to port 3000 and 0.0.0.0 (required by Cloud Run proxy)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PharmaSmart Backend] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
