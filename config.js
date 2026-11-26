// Configuración y datos constantes

export const firebaseConfig = {
  apiKey: "AIzaSyDis2WFXehN98Q3X1gK3-_ekuySBPChHyg",
  authDomain: "feria-proyectos-st.firebaseapp.com",
  projectId: "feria-proyectos-st",
  storageBucket: "feria-proyectos-st.firebasestorage.app",
  messagingSenderId: "973437935970",
  appId: "1:973437935970:web:25cf78ef8678522809cc3b",
  measurementId: "G-EGL2KWN54X"
};

export const APP_ID = "feria-proyectos-st";
export const LOCAL_VOTE_KEY = "st_feria_voted_record_v1";

export const STAR_DESCRIPTIONS = {
  1: "1 estrella — Lo peor / Muy deficiente",
  2: "2 estrellas — Regular / Mejorable",
  3: "3 estrellas — Bueno",
  4: "4 estrellas — Muy bueno",
  5: "5 estrellas — Excelente (Lo mejor)"
};

export const DEMO_PROJECTS = [
  {
    id: "PROY-01",
    title: "EcoSensor: Monitoreo Hídrico Inteligente",
    category: "Ingeniería en Informática",
    team: "Valentina Pérez, Martín Muñoz",
    description: "Sistema con sensores IoT de bajo costo para medir calidad y caudal de agua en comunidades rurales con alertas en tiempo real.",
    votes: 0,
    starsTotal: 0
  },
  {
    id: "PROY-02",
    title: "NutriScan: Asistente Nutricional Inclusivo",
    category: "Nutrición y Dietética",
    team: "Sofía Contreras, Lucas Silva",
    description: "Aplicación móvil accesible que traduce etiquetas nutricionales mediante lectura de voz y alertas personalizadas de alérgenos.",
    votes: 0,
    starsTotal: 0
  },
  {
    id: "PROY-03",
    title: "RehabilitaVR: Terapia Motriz Gamificada",
    category: "Kinesiología",
    team: "Matías Rojas, Antonia Vargas",
    description: "Plataforma interactiva de ejercicios guiados para recuperación post-operatoria de extremidades superiores con seguimiento de progreso.",
    votes: 0,
    starsTotal: 0
  }
];
