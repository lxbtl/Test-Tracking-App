// Motivationssprüche rund um Training und Disziplin.
// Bewusst ohne Zuschreibung, da viele bekannte Zitate falsch zugeordnet kursieren.
export const QUOTES = [
  "Disziplin ist, das zu tun, was getan werden muss, auch wenn du keine Lust hast.",
  "Motivation bringt dich zum Start. Gewohnheit bringt dich ans Ziel.",
  "Jede Wiederholung zählt, auch die, die keiner sieht.",
  "Du musst nicht extrem sein, nur beständig.",
  "Der schwerste Satz ist der Weg zum Training. Der Rest ist Arbeit.",
  "Fortschritt schlägt Perfektion.",
  "Stark wird man nicht an guten Tagen, sondern an den Tagen, an denen man trotzdem trainiert.",
  "Dein Körper kann fast alles. Überzeuge deinen Kopf.",
  "Kleine Schritte jeden Tag ergeben große Ergebnisse.",
  "Schmerz vergeht, Stolz bleibt.",
  "Ausreden verbrennen keine Kalorien.",
  "Heute tun, wofür du dir morgen dankbar bist.",
  "Erfolg ist die Summe kleiner Anstrengungen, die man Tag für Tag wiederholt.",
  "Wer aufhört, besser zu werden, hört auf, gut zu sein.",
  "Training ist kein Wunsch, sondern eine Entscheidung.",
  "Beständigkeit ist das stärkste Gewicht im Studio.",
  "Du wirst nie bereuen, trainiert zu haben, nur, es ausgelassen zu haben.",
  "Ruhe ist Teil des Trainings. Aufgeben nicht.",
  "Nicht zählen, wie oft du fällst, sondern wie oft du aufstehst.",
  "Der Unterschied zwischen Wollen und Erreichen heißt Disziplin.",
  "Mach es nicht für die anderen, mach es für dein zukünftiges Ich.",
  "Langsam ist auch schnell, solange du nicht stehen bleibst.",
  "Ziele setzen ist leicht. Dranbleiben ist die Kunst.",
  "Jeder Profi war einmal Anfänger.",
  "Konzentriere dich auf den nächsten Satz, nicht auf den ganzen Berg.",
  "Gute Form vor schwerem Gewicht.",
  "Was dich heute fordert, macht dich morgen stärker.",
  "Wer Disziplin säht, erntet Freiheit.",
  "Nicht perfekt, aber jeden Tag ein bisschen besser.",
  "Die beste Trainingszeit war gestern. Die zweitbeste ist jetzt.",
];

export function quoteOfDay(dateIso: string) {
  const d = new Date(dateIso + "T00:00:00Z");
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}
