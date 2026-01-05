# Casus Demo TLSC - Jan de Vries

Een real-time medische simulatie applicatie voor verpleegkunde training, gericht op "Speak Up" gedrag en veilige medicatie toediening.

## Scenario

**Patiënt:** Jan de Vries, 65 jaar
**Diagnose:** COPD exacerbatie met acute dyspneu
**Setting:** Spoedeisende Hulp
**Leerdoel:** Herkennen van gevaarlijke medicatie orders en effectief gebruikmaken van "Speak Up" cultuur

## Features

- **Real-time monitoring** - Vitale parameters updaten elke 2 seconden
- **Realistische vitalen** - Jitter/noise simulatie voor authentieke monitor weergave
- **Interactieve beslissingen** - Keuzes beïnvloeden de uitkomst van de patiënt
- **Twee scenario paden:**
  - **Scenario A (Kritiek):** Morfine toediening → Ademhalingsdepressie
  - **Scenario B (Succesvol):** Speak Up + Juiste interventies → Patiënt stabiliseert
- **Event logging** - Volledige tijdlijn van acties en gebeurtenissen
- **15 minuten simulatie** - Real-time scenario verloop

## Tech Stack

- React 18 (TypeScript)
- Tailwind CSS
- Vite
- Lucide React (Icons)

## Installatie

```bash
# Installeer dependencies
npm install

# Start development server
npm run dev

# Build voor productie
npm run build
```

## Gebruik

1. Start de applicatie met `npm run dev`
2. Open browser op `http://localhost:5173`
3. Klik op "Start Monitor" om de simulatie te beginnen
4. Observeer de vitale parameters en reageer op gebeurtenissen
5. Maak keuzes in het "Acties" tabblad
6. Let op de arts order na ~60 seconden

## Gameplay

### Vitale Parameters

- **HR (Heart Rate):** Baseline ~120 bpm (tachycardie door benauwdheid)
- **SpO2:** Start op 85% (kritiek laag - normaal >95%)
- **BP (Blood Pressure):** ~96/60 mmHg (laag-normaal)
- **RR (Respiratory Rate):** ~30/min (tachypneu - normaal 12-20)

### Beschikbare Interventies

1. **Positie aanpassen (Semi-Fowler)** - Verbetert ademhaling licht
2. **Zuurstof toedienen** - Essentieel voor SpO2 verbetering
3. **Morfine weigeren + Speak Up** - Veilige keuze, voorkomt ademhalingsdepressie
4. **Morfine toedienen** - Gevaarlijke keuze, leidt tot slechte uitkomst

### Kritiek Moment

Na 60 seconden arriveert de arts met een urgente order:

> "De patiënt is te benauwd en angstig. Geef 10mg Morfine IV, nu!"

**Jouw beslissing:**
- ❌ **Morfine toedienen** → Ademhalingsdepressie → CODE BLAUW
- ✅ **Speak Up** → Arts herziet plan → Patiënt stabiliseert met O2 en positie

## Medische Achtergrond

### Waarom is Morfine gevaarlijk bij COPD?

Bij COPD-patiënten met acute exacerbatie en hypoxie:
- Morfine onderdrukt het ademcentrum in de hersenstam
- Verlaagt de ademfrequentie → minder CO2 uitwisseling
- Bij COPD-patiënten is de ademdrive al aangetast
- Kan leiden tot respiratoire acidose en bewustzijnsdaling

### Juiste Aanpak

1. **Positie:** Semi-Fowler (30-45° hoofdeinde omhoog)
2. **Zuurstof:** Controlled oxygen therapy (streef SpO2 88-92% bij COPD)
3. **Bronchodilatoren:** Salbutamol/Ipratropium vernevelen
4. **Monitoring:** Observeer ademfrequentie en saturatie
5. **Escalatie:** Arts informeren als geen verbetering

## Learning Outcomes

Na het voltooien van deze simulatie begrijp je:
- Het belang van "Speak Up" cultuur in de zorg
- Waarom standaard pijnstilling (morfine) niet altijd veilig is
- ABCDE methodiek toepassen bij acute benauwdheid
- Prioriteren van interventies bij COPD exacerbatie
- Herkennen van respiratoire depressie

## Technische Details

### Simulatie Engine

De simulatie draait op een 2-seconden tick interval:

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    // Update elapsed time
    // Check triggers (doctor modal @ 60s)
    // Update vital signs based on:
    //   - Baseline deterioration
    //   - Applied interventions
    //   - Medication effects
    // Add noise for realism
  }, 2000);

  return () => clearInterval(interval);
}, [dependencies]);
```

### Vital Signs Trends

**Without intervention:**
- SpO2: ↓ 0.03%/tick (gradual hypoxia)
- HR: ↑ 0.05 bpm/tick (compensatory tachycardia)

**With position adjustment:**
- SpO2: ↑ 0.05%/tick (small improvement)

**With oxygen:**
- SpO2: ↑ 0.3%/tick (strong improvement toward 92%)
- HR: ↓ 0.2 bpm/tick (normalized as oxygenation improves)
- RR: ↓ 0.1/min/tick (reduced work of breathing)

**With morphine (danger):**
- RR: ↓ 0.5/min/tick (respiratory depression)
- SpO2: ↓ 0.5%/tick (rapid desaturation)
- HR: ↓ 1 bpm/tick (bradycardia)

## Credits

Ontwikkeld voor TLSC (Teaching and Learning Support Center) ter ondersteuning van verpleegkunde onderwijs.

## License

Educational use only.
