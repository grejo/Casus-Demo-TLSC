import React, { useState, useEffect, useRef } from 'react';
import { Activity, Heart, Wind, Droplets, AlertTriangle, Play, User, Pill, FileText, MessageSquare, Clock, Pause, RotateCcw, Square, Stethoscope, Syringe, Thermometer } from 'lucide-react';

// Types
type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'ENDED';
type OutcomeType = 'NONE' | 'RESPIRATORY_DEPRESSION' | 'RECOVERY';
type OxygenDevice = 'none' | 'nasal' | 'simple_mask' | 'venturi' | 'non_rebreather';
type Position = 'supine' | 'semi_fowler' | 'fowler' | 'tripod';

interface VitalSigns {
  hr: number;
  bp: { systolic: number; diastolic: number };
  rr: number;
  spo2: number;
}

interface EventLog {
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
}

interface TreatmentState {
  position: Position;
  oxygenDevice: OxygenDevice;
  oxygenFlow: number;
  ivAccess: boolean;
  monitoring: {
    ecg: boolean;
    spo2: boolean;
    nibp: boolean;
  };
  medications: {
    salbutamol: number;
    ipratropium: number;
    corticosteroids: boolean;
    morphine: number;
  };
  labs: {
    abg: boolean;
    xray: boolean;
  };
}

// Helper function to add noise/jitter to values
const addNoise = (value: number, range: number = 2): number => {
  return value + (Math.random() * range * 2 - range);
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

// ECG Waveform Component (Based on open-source SVG ECG animation)
const ECGWaveform: React.FC<{ heartRate: number; isAlarm: boolean }> = ({ heartRate, isAlarm }) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    // Animate the waveform scrolling
    const interval = setInterval(() => {
      setOffset((prev) => (prev >= 1200 ? 0 : prev + 4));
    }, 30);

    return () => clearInterval(interval);
  }, [heartRate]);

  const waveformColor = isAlarm ? '#ff4444' : '#10b981';

  // Generate repeating ECG PQRST complexes across the full width
  // One heartbeat cycle = ~150 units, viewBox = 1200 units wide
  const generateECGPath = () => {
    const beatWidth = 150; // Width of one complete heartbeat
    const numBeats = 10; // Number of beats to show
    let path = '';

    for (let i = 0; i < numBeats; i++) {
      const x = i * beatWidth;
      // PQRST complex: P wave, QRS complex, T wave
      path += `
        M${x},50
        L${x + 20},50
        L${x + 23},48 L${x + 26},52 L${x + 29},50
        L${x + 40},50
        L${x + 43},47 L${x + 46},53 L${x + 48},45
        L${x + 52},25 L${x + 56},75 L${x + 60},45
        L${x + 64},53 L${x + 67},50
        L${x + 80},50
        L${x + 85},48 L${x + 95},54 L${x + 105},50
        L${x + 150},50
      `;
    }
    return path;
  };

  return (
    <div className="w-full h-24 bg-gray-950 rounded-lg overflow-hidden relative">
      {/* Grid lines for medical monitor aesthetic */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#16FF43" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* ECG Waveform */}
      <svg
        className="relative z-10 w-full h-full"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Glow filter for the ECG line */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Main ECG trace */}
        <path
          d={generateECGPath()}
          fill="none"
          stroke={waveformColor}
          strokeWidth="2"
          filter="url(#glow)"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: `translateX(-${offset}px)`,
            transition: 'none'
          }}
        />

        {/* Duplicate for seamless loop */}
        <path
          d={generateECGPath()}
          fill="none"
          stroke={waveformColor}
          strokeWidth="2"
          filter="url(#glow)"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: `translateX(${1500 - offset}px)`,
            transition: 'none'
          }}
        />
      </svg>

      {/* Scan line effect */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-30"
        style={{
          left: '80%',
          boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
        }}
      />
    </div>
  );
};

// Pulse Oximetry Waveform Component
const SpO2Waveform: React.FC<{ spo2: number; isLow: boolean }> = ({ spo2, isLow }) => {
  const waveformColor = isLow ? '#ff4444' : '#3b82f6';

  return (
    <div className="w-full h-16 bg-gray-950 rounded-lg overflow-hidden relative">
      <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
        <defs>
          <filter id="spO2Glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Plethysmograph waveform */}
        <path
          d="M0,30 Q10,30 20,25 T40,20 Q50,15 60,20 T80,30 Q90,30 100,25 T120,20 Q130,15 140,20 T160,30 Q170,30 180,25 T200,20"
          fill="none"
          stroke={waveformColor}
          strokeWidth="2"
          filter="url(#spO2Glow)"
          className="pleth-wave"
        />
      </svg>
    </div>
  );
};

function App() {
  // Game State
  const [gameState, setGameState] = useState<GameState>('START');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [outcome, setOutcome] = useState<OutcomeType>('NONE');

  // Vital Signs
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    hr: 120,
    bp: { systolic: 96, diastolic: 60 },
    rr: 30,
    spo2: 85
  });

  // Treatment State
  const [treatment, setTreatment] = useState<TreatmentState>({
    position: 'supine',
    oxygenDevice: 'none',
    oxygenFlow: 0,
    ivAccess: false,
    monitoring: {
      ecg: true,
      spo2: true,
      nibp: true
    },
    medications: {
      salbutamol: 0,
      ipratropium: 0,
      corticosteroids: false,
      morphine: 0
    },
    labs: {
      abg: false,
      xray: false
    }
  });

  // UI State
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'medicatie' | 'acties' | 'monitoring' | 'labs'>('acties');
  const [eventLog, setEventLog] = useState<EventLog[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [spokeUp, setSpokeUp] = useState(false);

  // Refs
  const logEndRef = useRef<HTMLDivElement>(null);
  const baselineVitals = useRef({
    hr: 120,
    rr: 30,
    spo2: 85
  });

  // Auto-scroll event log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventLog]);

  // Add event to log
  const addEvent = (message: string, type: EventLog['type'] = 'info') => {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    const timestamp = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    setEventLog(prev => [...prev, { timestamp, message, type }]);
  };

  // Start simulation
  const handleStart = () => {
    setGameState('PLAYING');
    setElapsedTime(0);
    setEventLog([]);
    setSpokeUp(false);
    setOutcome('NONE');
    setStatusMessage('');
    setVitalSigns({
      hr: 120,
      bp: { systolic: 96, diastolic: 60 },
      rr: 30,
      spo2: 85
    });
    setTreatment({
      position: 'supine',
      oxygenDevice: 'none',
      oxygenFlow: 0,
      ivAccess: false,
      monitoring: { ecg: true, spo2: true, nibp: true },
      medications: { salbutamol: 0, ipratropium: 0, corticosteroids: false, morphine: 0 },
      labs: { abg: false, xray: false }
    });
    baselineVitals.current = { hr: 120, rr: 30, spo2: 85 };
    addEvent('Simulatie gestart - Patiënt Jan de Vries aanwezig op SEH', 'info');
    addEvent('ABCDE: A vrij, B benauwd (RR 30), C tachycard (HR 120), D alert', 'warning');
  };

  // Control handlers
  const handlePause = () => {
    setGameState('PAUSED');
    addEvent('Simulatie gepauzeerd', 'info');
  };

  const handleResume = () => {
    setGameState('PLAYING');
    addEvent('Simulatie hervat', 'info');
  };

  const handleRestart = () => {
    if (window.confirm('Weet je zeker dat je opnieuw wilt beginnen? Alle voortgang gaat verloren.')) {
      handleStart();
    }
  };

  const handleStop = () => {
    if (window.confirm('Weet je zeker dat je wilt stoppen?')) {
      setGameState('ENDED');
      addEvent('Simulatie gestopt door gebruiker', 'warning');
    }
  };

  // Position actions
  const handlePositionChange = (newPosition: Position) => {
    const positionNames = {
      supine: 'Plat (Supine)',
      semi_fowler: 'Semi-Fowler (30-45°)',
      fowler: 'Fowler (45-60°)',
      tripod: 'Tripod positie (vooroverleunend)'
    };

    setTreatment(prev => ({ ...prev, position: newPosition }));
    addEvent(`Positie aangepast naar ${positionNames[newPosition]}`, 'success');

    if (newPosition === 'tripod' || newPosition === 'fowler') {
      setStatusMessage('Goede keuze - optimale positie voor ademhaling bij COPD');
    } else if (newPosition === 'semi_fowler') {
      setStatusMessage('Positie helpt, maar tripod of fowler is nog beter');
    }
  };

  // Oxygen actions
  const handleOxygenChange = (device: OxygenDevice, flow: number) => {
    const deviceNames = {
      none: 'Geen zuurstof',
      nasal: 'Neusbril',
      simple_mask: 'Zuurstofmasker',
      venturi: 'Venturi masker',
      non_rebreather: 'Non-rebreather masker'
    };

    setTreatment(prev => ({ ...prev, oxygenDevice: device, oxygenFlow: flow }));

    if (device === 'none') {
      addEvent('Zuurstof gestopt', 'warning');
    } else {
      addEvent(`${deviceNames[device]} toegediend (${flow}L/min)`, 'success');

      if (device === 'venturi' && flow <= 4) {
        setStatusMessage('Uitstekend - Venturi masker met gecontroleerde FiO2 is ideaal voor COPD');
      } else if (device === 'nasal' && flow <= 4) {
        setStatusMessage('Goed - Lage flow zuurstof via neusbril is veilig bij COPD');
      } else if (flow > 6) {
        setStatusMessage('Let op - Hoge flow O2 kan gevaarlijk zijn bij COPD (CO2 retentie)');
        addEvent('WAARSCHUWING: Hoge flow zuurstof bij COPD kan ademdrive onderdrukken', 'warning');
      }
    }
  };

  // Medication actions
  const handleSalbutamol = () => {
    setTreatment(prev => ({
      ...prev,
      medications: { ...prev.medications, salbutamol: prev.medications.salbutamol + 1 }
    }));
    addEvent('Salbutamol 2,5mg vernevelaar toegediend', 'success');
    setStatusMessage('Salbutamol helpt bronchodilatatie - goede keuze');
  };

  const handleIpratropium = () => {
    setTreatment(prev => ({
      ...prev,
      medications: { ...prev.medications, ipratropium: prev.medications.ipratropium + 1 }
    }));
    addEvent('Ipratropium 0,5mg vernevelaar toegediend', 'success');
    setStatusMessage('Ipratropium versterkt bronchodilatatie effect');
  };

  const handleCorticosteroids = () => {
    if (!treatment.ivAccess) {
      addEvent('Eerst IV toegang nodig voor corticosteroïden', 'warning');
      return;
    }
    setTreatment(prev => ({
      ...prev,
      medications: { ...prev.medications, corticosteroids: true }
    }));
    addEvent('Hydrocortison 100mg IV toegediend', 'success');
    setStatusMessage('Corticosteroïden verminderen ontsteking');
  };

  const handleIVAccess = () => {
    setTreatment(prev => ({ ...prev, ivAccess: true }));
    addEvent('IV toegang aangelegd', 'success');
  };

  const handleMorphineGive = () => {
    if (!treatment.ivAccess) {
      addEvent('Eerst IV toegang nodig voor morfine', 'warning');
      return;
    }
    setTreatment(prev => ({
      ...prev,
      medications: { ...prev.medications, morphine: prev.medications.morphine + 10 }
    }));
    setShowDoctorModal(false);
    addEvent('MORFINE 10mg IV toegediend (Arts order)', 'danger');
    setStatusMessage('Arts: "Goed, dat zal de patiënt kalmeren."');

    setTimeout(() => {
      addEvent('Patiënt lijkt slaperig te worden...', 'warning');
    }, 4000);
  };

  const handleSpeakUp = () => {
    setSpokeUp(true);
    setShowDoctorModal(false);
    addEvent('SPEAK UP: "Arts, ik maak me zorgen. Morfine kan ademhaling onderdrukken bij COPD."', 'success');
    setStatusMessage('Arts: "Goed punt. Laten we eerst proberen met positie en zuurstof. Roep me als het niet verbetert."');

    if (treatment.oxygenDevice === 'none') {
      setTimeout(() => {
        addEvent('Arts heeft gecontroleerde O2 voorgeschreven', 'success');
      }, 2000);
    }
  };

  // Lab actions
  const handleABG = () => {
    setTreatment(prev => ({ ...prev, labs: { ...prev.labs, abg: true } }));
    addEvent('Arteriële bloedgas afgenomen', 'success');
    setTimeout(() => {
      addEvent('ABG resultaat: pH 7.32, pCO2 52, pO2 58, HCO3 28 (respiratoire acidose)', 'info');
    }, 3000);
  };

  const handleXRay = () => {
    setTreatment(prev => ({ ...prev, labs: { ...prev.labs, xray: true } }));
    addEvent('Thorax röntgen aangevraagd', 'success');
    setTimeout(() => {
      addEvent('X-thorax: Hyperinflatie, geen infiltraat, geen pneumothorax', 'info');
    }, 5000);
  };

  // Simulation tick (every 1 second)
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const interval = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1;

        // Doctor's order trigger at 60 seconds
        if (prev < 60 && newTime >= 60 && treatment.medications.morphine === 0 && !spokeUp) {
          setTimeout(() => {
            setShowDoctorModal(true);
            addEvent('Arts arriveert: "De patiënt is te benauwd. Geef 10mg Morfine IV, nu!"', 'warning');
          }, 100);
        }

        // End simulation at 15 minutes (900 seconds)
        if (newTime >= 900) {
          setGameState('ENDED');
          if (outcome === 'NONE') {
            setVitalSigns(prev => {
              if (prev.spo2 >= 92 && prev.hr < 100) {
                setOutcome('RECOVERY');
                addEvent('EINDE SIMULATIE: Patiënt stabiel, vitalen genormaliseerd', 'success');
              } else {
                addEvent('EINDE SIMULATIE: Patiënt nog instabiel, verdere behandeling nodig', 'warning');
              }
              return prev;
            });
          }
        }

        return newTime;
      });

      // Update vital signs
      setVitalSigns(prev => {
        let newHR = prev.hr;
        let newRR = prev.rr;
        let newSpO2 = prev.spo2;
        let newBPSys = prev.bp.systolic;
        let newBPDia = prev.bp.diastolic;

        // SCENARIO A: Morphine given (BAD OUTCOME)
        if (treatment.medications.morphine > 0 && outcome === 'NONE') {
          newRR = Math.max(4, prev.rr - 0.25);
          newSpO2 = Math.max(60, prev.spo2 - 0.25);
          newHR = Math.max(40, prev.hr - 0.5);

          if (newRR < 8 && newSpO2 < 75) {
            setOutcome('RESPIRATORY_DEPRESSION');
            setGameState('ENDED');
            addEvent('ALARM: ADEMHALINGSDEPRESSIE - CODE BLAUW', 'danger');
            addEvent('RR < 8, SpO2 < 75% - Patiënt reageert niet meer', 'danger');
            setStatusMessage('KRITIEK: Reanimatieteam opgeroepen. Morfine had niet gegeven mogen worden bij COPD!');
          }
        }
        // SCENARIO B: Good treatment
        else {
          // Position helps
          if (treatment.position === 'tripod' || treatment.position === 'fowler') {
            newSpO2 += 0.04;
          } else if (treatment.position === 'semi_fowler') {
            newSpO2 += 0.02;
          }

          // Oxygen helps significantly
          if (treatment.oxygenDevice !== 'none') {
            const oxygenEffect = {
              nasal: 0.12,
              simple_mask: 0.15,
              venturi: 0.18,
              non_rebreather: 0.25
            }[treatment.oxygenDevice] || 0;

            // Adjust for flow rate
            const flowFactor = Math.min(treatment.oxygenFlow / 4, 1);
            newSpO2 = Math.min(98, newSpO2 + (oxygenEffect * flowFactor));

            // Warn about high flow
            if (treatment.oxygenFlow > 6 && Math.random() < 0.01) {
              addEvent('Let op: Patiënt wordt slaperig bij hoge O2 flow', 'warning');
            }
          }

          // Bronchodilators help
          if (treatment.medications.salbutamol > 0) {
            newRR = Math.max(16, newRR - 0.04);
          }
          if (treatment.medications.ipratropium > 0) {
            newRR = Math.max(16, newRR - 0.03);
          }

          // As SpO2 improves, HR normalizes
          if (newSpO2 > 88) {
            newHR = Math.max(85, newHR - 0.1);
          }

          // Natural deterioration without treatment
          if (treatment.oxygenDevice === 'none' && treatment.position === 'supine') {
            newSpO2 = Math.max(75, newSpO2 - 0.025);
            newHR = Math.min(130, newHR + 0.05);
          }
        }

        // Add noise/jitter for realism
        newHR = clamp(addNoise(newHR, 1.5), 40, 180);
        newRR = clamp(addNoise(newRR, 0.5), 4, 40);
        newSpO2 = clamp(addNoise(newSpO2, 0.3), 60, 100);
        newBPSys = clamp(addNoise(newBPSys, 2), 70, 200);
        newBPDia = clamp(addNoise(newBPDia, 1.5), 40, 120);

        return {
          hr: Math.round(newHR),
          rr: Math.round(newRR),
          spo2: Math.round(newSpO2 * 10) / 10,
          bp: {
            systolic: Math.round(newBPSys),
            diastolic: Math.round(newBPDia)
          }
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, elapsedTime, treatment, spokeUp, outcome]);

  // Start Screen
  if (gameState === 'START') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full text-center">
          <div className="mb-8">
            <Activity className="w-20 h-20 text-blue-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Casus 1: Acute Benauwdheid</h1>
            <h2 className="text-2xl text-gray-700 mb-4">Jan de Vries</h2>
          </div>

          <div className="bg-blue-50 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-lg mb-4 text-gray-900">Context</h3>
            <div className="space-y-2 text-gray-700">
              <p><User className="inline w-5 h-5 mr-2" /><strong>Patiënt:</strong> Jan de Vries, 65 jaar</p>
              <p><AlertTriangle className="inline w-5 h-5 mr-2 text-orange-600" /><strong>Presentatie:</strong> Spoedeisende Hulp</p>
              <p><Wind className="inline w-5 h-5 mr-2 text-red-600" /><strong>Klacht:</strong> Ernstige benauwdheid (COPD exacerbatie)</p>
              <p><FileText className="inline w-5 h-5 mr-2" /><strong>Voorgeschiedenis:</strong> COPD, Hypertensie</p>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 text-left">
            <p className="text-sm text-yellow-800">
              <strong>Leerdoel:</strong> Herken gevaarlijke medicatie orders en oefen "Speak Up" gedrag.
              Maak de juiste keuzes in positie, zuurstoftherapie en medicatie.
            </p>
          </div>

          <button
            onClick={handleStart}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-xl flex items-center justify-center mx-auto transition-all transform hover:scale-105 shadow-lg"
          >
            <Play className="w-6 h-6 mr-2" />
            Start Monitor
          </button>
        </div>
      </div>
    );
  }

  // Main Dashboard
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Doctor Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Arts Order</h2>
            </div>
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
              <p className="text-lg text-gray-800 font-semibold mb-2">
                "De patiënt is te benauwd en angstig. Geef 10mg Morfine IV, nu!"
              </p>
              <p className="text-sm text-gray-600">
                De arts kijkt gespannen en verwacht directe uitvoering.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleMorphineGive}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center"
              >
                <Pill className="w-5 h-5 mr-2" />
                Morfine 10mg IV toedienen (Arts order uitvoeren)
              </button>
              <button
                onClick={handleSpeakUp}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Speak Up: "Arts, ik maak me zorgen over ademdepressie..."
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              Denk na: Wat is veilig voor deze COPD-patiënt?
            </p>
          </div>
        </div>
      )}

      {/* End Game Modal */}
      {gameState === 'ENDED' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simulatie Afgelopen</h2>

            {outcome === 'RESPIRATORY_DEPRESSION' && (
              <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-6">
                <h3 className="text-xl font-bold text-red-900 mb-2">Kritieke Uitkomst: Ademhalingsdepressie</h3>
                <p className="text-red-800 mb-4">
                  De patiënt heeft een ademhalingsdepressie ontwikkeld door morfine. Bij COPD-patiënten
                  met hypoxie en hypercarbie is morfine gevaarlijk omdat het de ademdrive verder onderdrukt.
                </p>
                <p className="font-semibold text-red-900">
                  Leermoment: Altijd "Speak Up" als een order gevaarlijk lijkt. Veiligheid van de patiënt staat voorop.
                </p>
              </div>
            )}

            {outcome === 'RECOVERY' && (
              <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-6">
                <h3 className="text-xl font-bold text-green-900 mb-2">Goede Uitkomst: Patiënt Gestabiliseerd</h3>
                <p className="text-green-800 mb-4">
                  Uitstekend werk! Door de juiste interventies toe te passen, is de patiënt gestabiliseerd.
                </p>
                <p className="font-semibold text-green-900">
                  SpO2: {vitalSigns.spo2}% | HR: {vitalSigns.hr} bpm | RR: {vitalSigns.rr}/min
                </p>
              </div>
            )}

            {outcome === 'NONE' && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-6">
                <h3 className="text-xl font-bold text-yellow-900 mb-2">Simulatie Voltooid</h3>
                <p className="text-yellow-800 mb-4">
                  De simulatie is afgelopen. Bekijk de event log om je acties te evalueren.
                </p>
                <p className="font-semibold text-yellow-900">
                  Huidige vitalen: SpO2: {vitalSigns.spo2}% | HR: {vitalSigns.hr} bpm | RR: {vitalSigns.rr}/min
                </p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={handleStart}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                Opnieuw Proberen
              </button>
              <button
                onClick={() => setGameState('START')}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                Terug naar Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-blue-900 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">SEH Monitor - Jan de Vries (65j)</h1>
            <p className="text-blue-200 text-sm">COPD Exacerbatie - Acute Benauwdheid</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-blue-800 px-4 py-2 rounded-lg">
              <Clock className="w-5 h-5 mr-2" />
              <span className="font-mono text-xl">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>
            <span className="text-sm bg-blue-800 px-3 py-1 rounded-full">
              {gameState === 'PLAYING' ? 'LIVE' : 'GEPAUZEERD'}
            </span>

            {/* Control Buttons */}
            <div className="flex space-x-2">
              {gameState === 'PLAYING' ? (
                <button
                  onClick={handlePause}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded-lg transition-all"
                  title="Pauzeer"
                >
                  <Pause className="w-5 h-5" />
                </button>
              ) : gameState === 'PAUSED' && (
                <button
                  onClick={handleResume}
                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-all"
                  title="Hervatten"
                >
                  <Play className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={handleRestart}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all"
                title="Herstarten"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={handleStop}
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all"
                title="Stoppen"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monitor Panel (Dark) */}
        <div className="lg:col-span-2 bg-gray-900 rounded-xl shadow-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white text-xl font-bold flex items-center">
              <Activity className="w-6 h-6 mr-2 text-green-400" />
              Live Vitale Parameters
            </h2>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-mono">MONITORING</span>
            </div>
          </div>

          {/* ECG Waveform */}
          <div className="mb-6">
            <div className="text-green-400 text-xs font-semibold mb-2 flex items-center">
              <Heart className="w-4 h-4 mr-1" />
              ECG - Lead II
            </div>
            <ECGWaveform
              heartRate={vitalSigns.hr}
              isAlarm={vitalSigns.hr < 50 || vitalSigns.hr > 140}
            />
          </div>

          {/* Vital Signs Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Heart Rate */}
            <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center mb-2">
                <Heart className="w-6 h-6 text-green-400 mr-2 animate-pulse" />
                <span className="text-green-400 font-semibold">HEART RATE</span>
              </div>
              <div className="text-green-400 text-5xl font-bold font-mono">{vitalSigns.hr}</div>
              <div className="text-green-400 text-sm mt-1">bpm</div>
              {vitalSigns.hr > 110 && (
                <div className="mt-2 text-yellow-400 text-xs flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Tachycardie
                </div>
              )}
              {vitalSigns.hr < 50 && (
                <div className="mt-2 text-red-400 text-xs flex items-center animate-pulse">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  BRADYCARDIE
                </div>
              )}
            </div>

            {/* SpO2 */}
            <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center mb-2">
                <Droplets className="w-6 h-6 text-blue-400 mr-2" />
                <span className="text-blue-400 font-semibold">SpO2</span>
              </div>
              <div className="text-blue-400 text-5xl font-bold font-mono">{vitalSigns.spo2}</div>
              <div className="text-blue-400 text-sm mt-1">%</div>
              {vitalSigns.spo2 < 90 && (
                <div className="mt-2 text-red-400 text-xs flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Kritiek Laag
                </div>
              )}
              {vitalSigns.spo2 >= 92 && (
                <div className="mt-2 text-green-400 text-xs">
                  Normaliseren
                </div>
              )}
            </div>

            {/* Blood Pressure */}
            <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-red-500">
              <div className="flex items-center mb-2">
                <Activity className="w-6 h-6 text-red-400 mr-2" />
                <span className="text-red-400 font-semibold">BLOOD PRESSURE</span>
              </div>
              <div className="text-red-400 text-4xl font-bold font-mono">
                {vitalSigns.bp.systolic}/{vitalSigns.bp.diastolic}
              </div>
              <div className="text-red-400 text-sm mt-1">mmHg</div>
            </div>

            {/* Respiratory Rate */}
            <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-yellow-500">
              <div className="flex items-center mb-2">
                <Wind className="w-6 h-6 text-yellow-400 mr-2" />
                <span className="text-yellow-400 font-semibold">RESP. RATE</span>
              </div>
              <div className="text-yellow-400 text-5xl font-bold font-mono">{vitalSigns.rr}</div>
              <div className="text-yellow-400 text-sm mt-1">/min</div>
              {vitalSigns.rr > 24 && (
                <div className="mt-2 text-orange-400 text-xs flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Tachypneu
                </div>
              )}
              {vitalSigns.rr < 10 && (
                <div className="mt-2 text-red-400 text-xs flex items-center animate-pulse">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  BRADYPNEU - GEVAAR
                </div>
              )}
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="mt-4 bg-blue-900 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-blue-200 text-sm">{statusMessage}</p>
            </div>
          )}
        </div>

        {/* Right Panel - Actions & Info */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="flex border-b overflow-x-auto">
              <button
                onClick={() => setActiveTab('acties')}
                className={`flex-1 py-2 px-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'acties'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Acties
              </button>
              <button
                onClick={() => setActiveTab('medicatie')}
                className={`flex-1 py-2 px-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'medicatie'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Medicatie
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`flex-1 py-2 px-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'status'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Status
              </button>
              <button
                onClick={() => setActiveTab('monitoring')}
                className={`flex-1 py-2 px-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'monitoring'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Monitor
              </button>
              <button
                onClick={() => setActiveTab('labs')}
                className={`flex-1 py-2 px-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'labs'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Labs
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              {activeTab === 'acties' && (
                <div className="space-y-4">
                  {/* Position Section */}
                  <div>
                    <h3 className="font-bold text-sm mb-2 flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      Positie
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handlePositionChange('supine')}
                        className={`py-2 px-3 text-xs rounded-lg font-semibold transition-all ${
                          treatment.position === 'supine'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        Plat
                      </button>
                      <button
                        onClick={() => handlePositionChange('semi_fowler')}
                        className={`py-2 px-3 text-xs rounded-lg font-semibold transition-all ${
                          treatment.position === 'semi_fowler'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        Semi-Fowler
                      </button>
                      <button
                        onClick={() => handlePositionChange('fowler')}
                        className={`py-2 px-3 text-xs rounded-lg font-semibold transition-all ${
                          treatment.position === 'fowler'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        Fowler
                      </button>
                      <button
                        onClick={() => handlePositionChange('tripod')}
                        className={`py-2 px-3 text-xs rounded-lg font-semibold transition-all ${
                          treatment.position === 'tripod'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        Tripod
                      </button>
                    </div>
                  </div>

                  {/* Oxygen Section */}
                  <div>
                    <h3 className="font-bold text-sm mb-2 flex items-center">
                      <Wind className="w-4 h-4 mr-1" />
                      Zuurstof Toediening
                    </h3>
                    <div className="space-y-2">
                      <select
                        value={treatment.oxygenDevice}
                        onChange={(e) => handleOxygenChange(e.target.value as OxygenDevice, treatment.oxygenFlow)}
                        className="w-full p-2 text-sm border rounded-lg"
                      >
                        <option value="none">Geen zuurstof</option>
                        <option value="nasal">Neusbril</option>
                        <option value="simple_mask">Simpel masker</option>
                        <option value="venturi">Venturi masker</option>
                        <option value="non_rebreather">Non-rebreather</option>
                      </select>

                      {treatment.oxygenDevice !== 'none' && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold">Flow: {treatment.oxygenFlow}L/min</label>
                          <input
                            type="range"
                            min="1"
                            max="15"
                            value={treatment.oxygenFlow}
                            onChange={(e) => handleOxygenChange(treatment.oxygenDevice, parseInt(e.target.value))}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>1L</span>
                            <span>15L</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* IV Access */}
                  <div>
                    <button
                      onClick={handleIVAccess}
                      disabled={treatment.ivAccess}
                      className={`w-full py-2 px-4 text-sm rounded-lg font-semibold transition-all ${
                        treatment.ivAccess
                          ? 'bg-green-100 text-green-800 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {treatment.ivAccess ? '✓ IV Toegang Aangelegd' : 'IV Toegang Aanleggen'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'medicatie' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm mb-3">Medicatie Toediening</h3>

                  {/* Bronchodilators */}
                  <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                    <div className="font-semibold text-sm flex justify-between items-center mb-2">
                      <span>Salbutamol Vernevelaar</span>
                      {treatment.medications.salbutamol > 0 && (
                        <span className="text-xs bg-blue-200 px-2 py-1 rounded">
                          {treatment.medications.salbutamol}x gegeven
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">2,5mg - Kortwerkende luchtwegverwijder</div>
                    <button
                      onClick={handleSalbutamol}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-lg"
                    >
                      <Syringe className="inline w-3 h-3 mr-1" />
                      Toedienen
                    </button>
                  </div>

                  <div className="bg-purple-50 p-3 rounded border-l-4 border-purple-400">
                    <div className="font-semibold text-sm flex justify-between items-center mb-2">
                      <span>Ipratropium Vernevelaar</span>
                      {treatment.medications.ipratropium > 0 && (
                        <span className="text-xs bg-purple-200 px-2 py-1 rounded">
                          {treatment.medications.ipratropium}x gegeven
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">0,5mg - Anticholinergicum</div>
                    <button
                      onClick={handleIpratropium}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 rounded-lg"
                    >
                      <Syringe className="inline w-3 h-3 mr-1" />
                      Toedienen
                    </button>
                  </div>

                  <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-400">
                    <div className="font-semibold text-sm mb-2">Hydrocortison IV</div>
                    <div className="text-xs text-gray-600 mb-2">100mg - Corticosteroïd (IV vereist)</div>
                    <button
                      onClick={handleCorticosteroids}
                      disabled={treatment.medications.corticosteroids || !treatment.ivAccess}
                      className={`w-full text-xs py-2 rounded-lg ${
                        treatment.medications.corticosteroids
                          ? 'bg-green-100 text-green-800 cursor-not-allowed'
                          : !treatment.ivAccess
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-orange-600 hover:bg-orange-700 text-white'
                      }`}
                    >
                      {treatment.medications.corticosteroids ? '✓ Toegediend' : 'Toedienen'}
                    </button>
                  </div>

                  {treatment.medications.morphine > 0 && (
                    <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
                      <div className="font-semibold text-sm text-red-900">Morfine IV</div>
                      <div className="text-xs text-red-700">{treatment.medications.morphine}mg toegediend</div>
                    </div>
                  )}

                  {spokeUp && (
                    <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                      <div className="text-sm text-green-800">✓ Speak Up gebruikt - Morfine geweigerd</div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'status' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm mb-3">ABCDE Beoordeling</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start">
                      <span className="font-semibold w-20">A (Airway):</span>
                      <span className="text-green-700">Vrij, patiënt spreekt</span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-semibold w-20">B (Breathing):</span>
                      <span className="text-red-700">Ernstig benauwd, verlengd expirium, piepende ademhaling</span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-semibold w-20">C (Circulation):</span>
                      <span className="text-orange-700">Tachycardie, bloeddruk laag-normaal</span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-semibold w-20">D (Disability):</span>
                      <span className="text-green-700">Alert, angstig</span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-semibold w-20">E (Exposure):</span>
                      <span className="text-gray-700">Geen bijzonderheden</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-bold text-sm mb-2">Thuismedicatie</h4>
                    <div className="space-y-1 text-xs">
                      <div>• Salbutamol inhalator 2dd + zo nodig</div>
                      <div>• Tiotropium 1dd</div>
                      <div>• Atorvastatine 20mg 1dd</div>
                      <div>• Lisinopril 10mg 1dd</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'monitoring' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm mb-3 flex items-center">
                    <Stethoscope className="w-4 h-4 mr-1" />
                    Monitoring Status
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">ECG Monitoring</span>
                      <span className="text-green-700 font-semibold text-xs">✓ Actief</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">SpO2 Monitoring</span>
                      <span className="text-green-700 font-semibold text-xs">✓ Actief</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">NIBP Monitoring</span>
                      <span className="text-green-700 font-semibold text-xs">✓ Actief</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                    <div className="text-xs">
                      <div className="font-semibold mb-1">Huidige Behandeling:</div>
                      <div>Positie: {treatment.position === 'supine' ? 'Plat' : treatment.position === 'semi_fowler' ? 'Semi-Fowler' : treatment.position === 'fowler' ? 'Fowler' : 'Tripod'}</div>
                      <div>O2: {treatment.oxygenDevice === 'none' ? 'Geen' : `${treatment.oxygenDevice} ${treatment.oxygenFlow}L/min`}</div>
                      <div>IV: {treatment.ivAccess ? 'Ja' : 'Nee'}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'labs' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm mb-3 flex items-center">
                    <Thermometer className="w-4 h-4 mr-1" />
                    Diagnostiek
                  </h3>

                  <button
                    onClick={handleABG}
                    disabled={treatment.labs.abg}
                    className={`w-full py-2 px-4 text-sm rounded-lg font-semibold transition-all ${
                      treatment.labs.abg
                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {treatment.labs.abg ? '✓ ABG Afgenomen' : 'Arteriële Bloedgas (ABG)'}
                  </button>

                  <button
                    onClick={handleXRay}
                    disabled={treatment.labs.xray}
                    className={`w-full py-2 px-4 text-sm rounded-lg font-semibold transition-all ${
                      treatment.labs.xray
                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {treatment.labs.xray ? '✓ X-Thorax Aangevraagd' : 'Thorax Röntgen'}
                  </button>

                  <div className="mt-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                    <div className="text-xs text-yellow-800">
                      <strong>Tip:</strong> ABG helpt om respiratoire acidose te identificeren. X-thorax kan andere oorzaken van dyspneu uitsluiten.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Event Log */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Event Log
            </h3>
            <div className="h-48 overflow-y-auto space-y-2 text-xs font-mono">
              {eventLog.map((event, index) => (
                <div
                  key={index}
                  className={`p-2 rounded border-l-4 ${
                    event.type === 'danger'
                      ? 'bg-red-50 border-red-500 text-red-900'
                      : event.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-500 text-yellow-900'
                      : event.type === 'success'
                      ? 'bg-green-50 border-green-500 text-green-900'
                      : 'bg-blue-50 border-blue-500 text-blue-900'
                  }`}
                >
                  <span className="font-bold">[{event.timestamp}]</span> {event.message}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Add CSS animations */}
      <style>{`
        @keyframes ecgPulse {
          0% { stroke-dashoffset: 350; }
          100% { stroke-dashoffset: 0; }
        }

        @keyframes scan {
          0% { left: 0%; }
          100% { left: 100%; }
        }

        .pleth-wave {
          animation: plethPulse 1.5s ease-in-out infinite;
        }

        @keyframes plethPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

export default App;
