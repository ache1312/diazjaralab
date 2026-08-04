export type Locale = 'es' | 'en';

export type PageKey =
  | 'home'
  | 'research'
  | 'techniques'
  | 'team'
  | 'publications'
  | 'philosophy'
  | 'outreach'
  | 'contact';

export const pagePaths: Record<Locale, Record<PageKey, string>> = {
  es: {
    home: '/',
    research: '/investigacion/',
    techniques: '/tecnicas/',
    team: '/equipo/',
    publications: '/publicaciones/',
    philosophy: '/filosofia/',
    outreach: '/divulgacion/',
    contact: '/contacto/',
  },
  en: {
    home: '/en/',
    research: '/en/research/',
    techniques: '/en/techniques/',
    team: '/en/team/',
    publications: '/en/publications/',
    philosophy: '/en/philosophy/',
    outreach: '/en/outreach/',
    contact: '/en/contact/',
  },
};

export const navLabels: Record<Locale, Record<PageKey | 'laboratory', string>> = {
  es: {
    home: 'Inicio',
    research: 'Investigación',
    techniques: 'Técnicas',
    team: 'Equipo',
    publications: 'Publicaciones',
    philosophy: 'Cómo trabajamos',
    outreach: 'Divulgación',
    contact: 'Contacto',
    laboratory: 'Laboratorio',
  },
  en: {
    home: 'Home',
    research: 'Research',
    techniques: 'Techniques',
    team: 'Team',
    publications: 'Publications',
    philosophy: 'Lab practices',
    outreach: 'Outreach',
    contact: 'Contact',
    laboratory: 'Lab',
  },
};

export const pathFor = (locale: Locale, page: PageKey) => pagePaths[locale][page];

export const oppositeLocale = (locale: Locale): Locale => (locale === 'es' ? 'en' : 'es');
