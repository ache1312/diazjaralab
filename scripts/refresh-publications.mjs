import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const cataloguePath = path.join(root, 'src/content-data/publications.generated.json');
const shouldWrite = process.argv.includes('--write');
const catalogue = JSON.parse(await fs.readFile(cataloguePath, 'utf8'));

const normalizeDoi = (value) => String(value ?? '')
  .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
  .trim()
  .toLocaleLowerCase('en');
const normalizeTitle = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, ' ')
  .trim()
  .toLocaleLowerCase('en');

const fetchAuthorWorks = async (authorId) => {
  const url = new URL('https://api.openalex.org/works');
  url.searchParams.set('filter', `authorships.author.id:${authorId}`);
  url.searchParams.set('per-page', '200');
  url.searchParams.set('mailto', 'esteban.diaz@uautonoma.cl');
  const response = await fetch(url, { headers: { 'User-Agent': 'DiazJaraLab-publication-refresh/1.0' } });
  if (!response.ok) throw new Error(`OpenAlex ${response.status} for ${authorId}`);
  const payload = await response.json();
  return payload.results ?? [];
};

const batches = await Promise.all(catalogue.identity.openalex_author_ids.map(fetchAuthorWorks));
const fetchedById = new Map();
for (const work of batches.flat()) fetchedById.set(work.id, work);
const fetched = [...fetchedById.values()];

const byOpenAlex = new Map(catalogue.works.filter((work) => work.openalex_id).map((work) => [work.openalex_id, work]));
const byDoi = new Map(catalogue.works.filter((work) => work.doi).map((work) => [normalizeDoi(work.doi), work]));
const byTitle = new Map(catalogue.works.map((work) => [normalizeTitle(work.title), work]));
const mergedByOpenAlex = new Map();
const mergedByDoi = new Map();
for (const work of catalogue.works) {
  for (const version of work.merged_versions ?? []) {
    if (version.openalex_id) mergedByOpenAlex.set(version.openalex_id, work);
    if (version.doi) mergedByDoi.set(normalizeDoi(version.doi), work);
  }
}
const matchedTargets = new Set();
let matchedSources = 0;
const candidates = [];

for (const source of fetched) {
  const doi = normalizeDoi(source.doi);
  const mergedParent = mergedByOpenAlex.get(source.id) || (doi && mergedByDoi.get(doi));
  if (mergedParent) {
    matchedTargets.add(mergedParent);
    matchedSources += 1;
    continue;
  }
  const target = byOpenAlex.get(source.id)
    || (doi && byDoi.get(doi))
    || (!doi && byTitle.get(normalizeTitle(source.title)));
  if (!target) {
    candidates.push({
      openalex_id: source.id,
      doi: doi || null,
      title: source.display_name || source.title,
      year: source.publication_year,
      citations: source.cited_by_count ?? 0,
      type: source.type,
      source: source.primary_location?.source?.display_name ?? null,
      note: 'OpenAlex candidate: review against the author’s Google Scholar profile before publication.',
    });
    continue;
  }

  const oaUrlRaw = source.best_oa_location?.pdf_url
    || source.best_oa_location?.landing_page_url
    || source.open_access?.oa_url
    || null;
  const oaUrl = oaUrlRaw?.replace(/^http:/i, 'https:') ?? null;
  target.openalex_id ||= source.id;
  target.openalex_citations = source.cited_by_count ?? target.openalex_citations;
  target.oa_status = source.open_access?.oa_status ?? target.oa_status;
  target.open_access_url = oaUrl ?? target.open_access_url;
  target.matched_author_ids = [...new Set([
    ...target.matched_author_ids,
    ...source.authorships
      .filter((authorship) => catalogue.identity.openalex_author_ids.includes(authorship.author?.id?.split('/').pop()))
      .map((authorship) => authorship.author.id.split('/').pop()),
  ])];
  matchedTargets.add(target);
  matchedSources += 1;
}

catalogue.generated_at = new Date().toISOString().slice(0, 10);
catalogue.counts.openalex_indexed = catalogue.works.filter((work) => work.openalex_id).length;
catalogue.counts.scholar_only = catalogue.works.filter((work) => !work.openalex_id).length;

console.log(`OpenAlex: ${fetched.length} unique works across ${catalogue.identity.openalex_author_ids.length} author identities.`);
console.log(`Matched OpenAlex sources: ${matchedSources}/${fetched.length}; canonical catalogue records: ${matchedTargets.size}/${catalogue.works.length}.`);
if (candidates.length) {
  console.log(`Candidates requiring Scholar/author review: ${candidates.length}`);
  console.log(JSON.stringify(candidates, null, 2));
}

if (shouldWrite) {
  await fs.writeFile(cataloguePath, `${JSON.stringify(catalogue, null, 2)}\n`, 'utf8');
  console.log(`Updated ${path.relative(root, cataloguePath)}. Scholar metrics remain pinned to the curated profile snapshot.`);
} else {
  console.log('Dry run only. Re-run with --write to persist matched OpenAlex metrics.');
}
