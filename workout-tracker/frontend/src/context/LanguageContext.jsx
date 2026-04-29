import React, { createContext, useState, useContext } from 'react';

export const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en'); // 'en' or 'de'

  const dictionary = {
    en: {
      "GOOD MORNING": "GOOD MORNING",
      "HELLO": "HELLO",
      "GOOD EVENING": "GOOD EVENING",
      "WELCOME BACK, ATHLETE. YOUR DAILY TARGET IS SYNCHRONIZED.": "WELCOME BACK, ATHLETE. YOUR DAILY TARGET IS SYNCHRONIZED.",
      "Dashboard": "Dashboard",
      "Workouts": "Workouts",
      "Analytics": "Analytics",
      "Settings": "Settings",
      "About Us": "About Us",
      "Support": "Support",
      "START WORKOUT": "START WORKOUT",
      "SEARCH...": "SEARCH...",
      "Member": "Member",
      "DAILY GOAL": "DAILY GOAL",
      "ACTIVE RECOVERY": "ACTIVE RECOVERY",
      "ELITE TRACK": "ELITE TRACK",
      "Quote of the day: Consistency beats motivation": "Quote of the day: Consistency beats motivation",
      "STAY HYDRATED": "STAY HYDRATED",
      "1.2L more for peak efficiency.": "1.2L more for peak efficiency.",
      "GOAL: 3.5L DAILY": "GOAL: 3.5L DAILY",
      "STEPS": "STEPS",
      "ACTIVE FLOW": "ACTIVE FLOW",
      "CALORIES": "CALORIES",
      "BURN RATE": "BURN RATE",
      "OPTIMAL": "OPTIMAL",
      "TIME": "TIME",
      "TIME IN ZONE": "TIME IN ZONE",
      "MINUTES": "MINUTES",
      "MIN": "MIN",
      "ACHIEVEMENTS": "ACHIEVEMENTS",
      "MEDALS EARNED": "MEDALS EARNED",
      "IMPRESSUM": "IMPRINT",
      "DATENSCHUTZ": "PRIVACY POLICY",
      "PAGE_IMPRINT_TITLE": "IMPRINT",
      "PAGE_IMPRINT_DESC": "Legal information and disclosures.",
      "PAGE_PRIVACY_TITLE": "PRIVACY POLICY",
      "PAGE_PRIVACY_DESC": "We prioritize your data security as much as your personal bests.",
      "SUN": "SUN",
      "MON": "MON",
      "TUE": "TUE",
      "WED": "WED",
      "THU": "THU",
      "FRI": "FRI",
      "SAT": "SAT",
      "COMPLETED": "COMPLETED",
      "LATEST ACHIEVEMENT": "LATEST ACHIEVEMENT",
      "You've maintained a top 5% strength-to-weight ratio worldwide for 12 consecutive weeks.": "You've maintained a top 5% strength-to-weight ratio worldwide for 12 consecutive weeks.",
      "DEADLIFT": "DEADLIFT",
      "SQUAT": "SQUAT",
      "BENCH": "BENCH",
      "NEW PR": "NEW PR"
    },
    de: {
      "GOOD MORNING": "GUTEN MORGEN",
      "HELLO": "HALLO",
      "GOOD EVENING": "GUTEN ABEND",
      "WELCOME BACK, ATHLETE. YOUR DAILY TARGET IS SYNCHRONIZED.": "WILLKOMMEN ZURÜCK, ATHLET. DEIN TAGESZIEL IST SYNCHRONISIERT.",
      "Dashboard": "Dashboard",
      "Workouts": "Workouts",
      "Analytics": "Analysen",
      "Settings": "Einstellungen",
      "About Us": "Über uns",
      "Support": "Support",
      "START WORKOUT": "WORKOUT STARTEN",
      "SEARCH...": "SUCHE...",
      "Member": "Mitglied",
      "DAILY GOAL": "TAGESZIEL",
      "ACTIVE RECOVERY": "AKTIVE ERHOLUNG",
      "ELITE TRACK": "ELITE-PFAD",
      "Quote of the day: Consistency beats motivation": "Zitat des Tages: Beständigkeit schlägt Motivation",
      "STAY HYDRATED": "BLEIB HYDRIERT",
      "1.2L more for peak efficiency.": "Noch 1.2L für maximale Effizienz.",
      "GOAL: 3.5L DAILY": "ZIEL: 3.5L TÄGLICH",
      "STEPS": "SCHRITTE",
      "ACTIVE FLOW": "AKTIVER FLUSS",
      "CALORIES": "KALORIEN",
      "BURN RATE": "VERBRENNUNGSRATE",
      "OPTIMAL": "OPTIMAL",
      "TIME": "ZEIT",
      "TIME IN ZONE": "ZEIT IN ZONE",
      "MINUTES": "MINUTEN",
      "MIN": "MIN",
      "ACHIEVEMENTS": "ERFOLGE",
      "MEDALS EARNED": "MEDAILLEN VERDIENT",
      "IMPRESSUM": "IMPRESSUM",
      "DATENSCHUTZ": "DATENSCHUTZ",
      "PAGE_IMPRINT_TITLE": "IMPRESSUM",
      "PAGE_IMPRINT_DESC": "Rechtliche Angaben und Hinweise.",
      "PAGE_PRIVACY_TITLE": "DATENSCHUTZ",
      "PAGE_PRIVACY_DESC": "Wir behandeln deine Daten mit höchster Sorgfalt.",
      "SUN": "SO",
      "MON": "MO",
      "TUE": "DI",
      "WED": "MI",
      "THU": "DO",
      "FRI": "FR",
      "SAT": "SA",
      "COMPLETED": "ABGESCHLOSSEN",
      "LATEST ACHIEVEMENT": "NEUESTER ERFOLG",
      "You've maintained a top 5% strength-to-weight ratio worldwide for 12 consecutive weeks.": "Du hast für 12 aufeinanderfolgende Wochen ein weltweites Top-5% Kraft-Gewichts-Verhältnis beibehalten.",
      "DEADLIFT": "KREUZHEBEN",
      "SQUAT": "KNIEBEUGEN",
      "BENCH": "BANKDRÜCKEN",
      "NEW PR": "NEUER PR"
    }
  };

  const t = (key) => dictionary[lang][key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
