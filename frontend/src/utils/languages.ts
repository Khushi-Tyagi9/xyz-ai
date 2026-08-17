export interface LanguageOption {
  name: string;
  bcp47: string;
}

export const LANGUAGES: LanguageOption[] = [
  { name: "English", bcp47: "en-US" },
  { name: "Hindi", bcp47: "hi-IN" },
  { name: "Tamil", bcp47: "ta-IN" },
  { name: "Telugu", bcp47: "te-IN" },
  { name: "Marathi", bcp47: "mr-IN" },
  { name: "Bengali", bcp47: "bn-IN" },
  { name: "Gujarati", bcp47: "gu-IN" },
  { name: "Punjabi", bcp47: "pa-IN" },
  { name: "Kannada", bcp47: "kn-IN" },
  { name: "Malayalam", bcp47: "ml-IN" },
  { name: "Urdu", bcp47: "ur-IN" },
];

export function bcp47For(languageName: string): string {
  return LANGUAGES.find((l) => l.name === languageName)?.bcp47 ?? "en-US";
}
