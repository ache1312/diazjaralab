import { catalogAsBibtex } from '@/lib/publications';

export function GET() {
  return new Response(catalogAsBibtex(), {
    headers: {
      'Content-Type': 'application/x-bibtex; charset=utf-8',
      'Content-Disposition': 'attachment; filename="esteban-diaz-jara-publications.bib"',
    },
  });
}
