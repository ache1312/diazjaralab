import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = join(root, 'src/content-data/publications.generated.json');
const outputPath = join(root, 'src/content-data/publication-network.generated.json');
const offline = process.env.PUBLICATION_GRAPH_OFFLINE === '1';
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));

const fineTopics = [
  {
    id: 'central-control',
    es: 'Control cardiorrespiratorio central',
    en: 'Central cardiorespiratory control',
    pattern: /brainstem|medullar|ventrolateral|\brvlm\b|\bc1 neuron|central chemore|breath|respirat|nmb level|tractus solitarii|\bnts\b/i,
  },
  {
    id: 'carotid-chemoreflex',
    es: 'Cuerpo carotídeo y quimiorreflejo',
    en: 'Carotid body and chemoreflex',
    pattern: /carotid|peripheral chemore|chemoreflex|chemoreceptor|chemosens|peak oxygen uptake/i,
  },
  {
    id: 'neuroglia',
    es: 'Neuroglía y astrocitos',
    en: 'Neuroglia and astrocytes',
    pattern: /astrocy|neuro.?glial|glial cell|microgl|neuroinflamm/i,
  },
  {
    id: 'heart-failure',
    es: 'Insuficiencia cardíaca',
    en: 'Heart failure',
    pattern: /heart failure|cardiac function|cardiac autonomic|cardiac remodeling|volume overload|blood pressure|hypertension|cardiorespiratory dysfunction|cardiorespiratory disorders/i,
  },
  {
    id: 'hypoxia-sleep',
    es: 'Hipoxia y sueño',
    en: 'Hypoxia and sleep',
    pattern: /hypoxia|sleep|circadian|microgravity/i,
  },
  {
    id: 'connexin-purinergic',
    es: 'Conexinas y señalización purinérgica',
    en: 'Connexins and purinergic signalling',
    pattern: /connexin|hemichannel|pannexin|p2x7|purinergic|cannabinoid/i,
  },
  {
    id: 'cell-stress',
    es: 'Estrés celular y neuroprotección',
    en: 'Cell stress and neuroprotection',
    pattern: /oxidative|superoxide|endoplasmic|energy status|cell death|\bros\b|inflammation|cytokine|high glucose|paraquat|erythropoietin|neuroprotect/i,
  },
  {
    id: 'interventions',
    es: 'Intervenciones y adaptación',
    en: 'Interventions and adaptation',
    pattern: /inhibition|inhibit|exercise|diet|administration|chemogenetic|photostimulation|peptide|tannin|physical exertion|training|resilience|adapt|deficiency/i,
  },
];

const themes = [
  {
    id: 'cardiorespiratory-control',
    es: 'Control cardiorrespiratorio y quimiorreflejo',
    en: 'Cardiorespiratory control and chemoreflex',
    fineTopicIds: ['central-control', 'carotid-chemoreflex'],
  },
  {
    id: 'neuroglia-signalling',
    es: 'Neuroglía y señalización celular',
    en: 'Neuroglia and cell signalling',
    fineTopicIds: ['neuroglia', 'connexin-purinergic'],
  },
  {
    id: 'hypoxia-cardiovascular',
    es: 'Hipoxia y enfermedad cardiovascular',
    en: 'Hypoxia and cardiovascular disease',
    fineTopicIds: ['heart-failure', 'hypoxia-sleep'],
  },
  {
    id: 'stress-adaptation',
    es: 'Estrés celular y adaptación',
    en: 'Cell stress and adaptation',
    fineTopicIds: ['cell-stress', 'interventions'],
  },
];

const visibleTopicByFineTopic = new Map(themes.flatMap((theme) =>
  theme.fineTopicIds.map((fineTopicId) => [fineTopicId, theme.id]),
));

const clusterCenters = {
  cellular: { x: 22, y: 37 },
  central: { x: 50, y: 34 },
  carotid: { x: 78, y: 40 },
  neuroglia: { x: 68, y: 70 },
  heart: { x: 37, y: 72 },
};

const stopwords = new Set([
  'about', 'after', 'associated', 'between', 'during', 'following', 'from', 'into',
  'through', 'underlying', 'with', 'without', 'that', 'this', 'their', 'role',
  'the', 'and', 'for', 'are', 'was', 'were', 'its', 'in', 'of', 'to', 'by', 'a', 'an',
]);

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase()
  .replace(/[\u2010-\u2015-]/g, ' ')
  .replace(/[^\p{Letter}\p{Number}+]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const compactId = (value) => String(value ?? '').split('/').pop();
const round = (value, places = 3) => Number(value.toFixed(places));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const pairKey = (a, b) => [a, b].sort().join('::');

function publicationId(work, index) {
  const openAlexId = compactId(work.openalex_id)?.toLowerCase();
  return openAlexId ? `pub-${openAlexId}` : `pub-scholar-${index + 1}`;
}

function preferredUrl(work) {
  if (work.doi) return `https://doi.org/${work.doi}`;
  return work.openalex_id ?? work.scholar_detail_url;
}

function titleTokens(title) {
  return normalize(title).split(' ').filter((token) => token.length > 3 && !stopwords.has(token));
}

function fineTopicIdsFor(work) {
  const text = `${work.title} ${work.journal_or_source}`;
  const matches = fineTopics.filter((topic) => topic.pattern.test(text)).map((topic) => topic.id);
  if (matches.length) return matches;
  return ['central-control'];
}

function topicIdsFor(fineTopicIds) {
  return [...new Set(fineTopicIds.map((fineTopicId) => visibleTopicByFineTopic.get(fineTopicId)).filter(Boolean))];
}

function clusterFor(work, topicIds) {
  const title = normalize(work.title);
  if (/connexin|hemichannel|pannexin|energy status|tannin|endoplasmic|p2x7|paraquat/.test(title)) return 'cellular';
  if (topicIds.includes('neuroglia')) return 'neuroglia';
  if (topicIds.includes('carotid-chemoreflex')) return 'carotid';
  if (/brainstem|medullar|\brvlm\b|\bc1 neuron|central chemore|tractus solitarii|\bnts\b/.test(title)) return 'central';
  return 'heart';
}

function hash(value) {
  return [...String(value)].reduce((total, character) => ((total * 33) ^ character.codePointAt(0)) >>> 0, 5381);
}

function positionFor(index, total, cluster, id) {
  const center = clusterCenters[cluster] ?? { x: 50, y: 50 };
  const angle = index * 2.399963229728653 + (hash(id) % 19) * 0.11;
  const radius = 6.5 + ((index % 7) * 2.05) + Math.min(4, total * 0.28);
  return {
    x: round(clamp(center.x + Math.cos(angle) * radius, 7, 93)),
    y: round(clamp(center.y + Math.sin(angle) * radius, 9, 91)),
  };
}

function relaxLayout(nodes) {
  const virtualWidth = 354;
  const virtualHeight = 576;
  const minimumDistance = 62;
  const anchors = new Map(nodes.map((node) => [node.id, { x: node.x, y: node.y }]));

  for (let iteration = 0; iteration < 900; iteration += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = ((b.x - a.x) / 100) * virtualWidth;
        let dy = ((b.y - a.y) / 100) * virtualHeight;
        let distance = Math.hypot(dx, dy);
        if (distance >= minimumDistance) continue;
        if (distance < .01) {
          const angle = ((hash(`${a.id}:${b.id}`) % 360) * Math.PI) / 180;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }
        const overlap = (minimumDistance - distance) / 2;
        const aMobility = a.kind === 'theme' ? .28 : 1;
        const bMobility = b.kind === 'theme' ? .28 : 1;
        const mobility = aMobility + bMobility;
        const pushX = (dx / distance) * overlap;
        const pushY = (dy / distance) * overlap;
        a.x -= (pushX * (aMobility / mobility) / virtualWidth) * 100;
        a.y -= (pushY * (aMobility / mobility) / virtualHeight) * 100;
        b.x += (pushX * (bMobility / mobility) / virtualWidth) * 100;
        b.y += (pushY * (bMobility / mobility) / virtualHeight) * 100;
      }
    }

    if (iteration < 650) {
      for (const node of nodes) {
        const anchor = anchors.get(node.id);
        const strength = node.kind === 'theme' ? .004 : .0018;
        node.x += (anchor.x - node.x) * strength;
        node.y += (anchor.y - node.y) * strength;
      }
    }
    for (const node of nodes) {
      node.x = clamp(node.x, 6.2, 93.8);
      node.y = clamp(node.y, 4, 96);
    }
  }

  for (const node of nodes) {
    node.x = round(node.x);
    node.y = round(node.y);
  }
}

function jaccard(aValues, bValues) {
  const a = new Set(aValues);
  const b = new Set(bValues);
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  let shared = 0;
  for (const value of a) if (b.has(value)) shared += 1;
  return shared / union.size;
}

function weightedJaccard(aValues, bValues, frequencies, total) {
  const a = new Set(aValues);
  const b = new Set(bValues);
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  let shared = 0;
  let denominator = 0;
  for (const value of union) {
    const idf = Math.log((total + 1) / ((frequencies.get(value) ?? 0) + 1)) + 1;
    denominator += idf;
    if (a.has(value) && b.has(value)) shared += idf;
  }
  return denominator ? shared / denominator : 0;
}

function coupling(aReferences, bReferences) {
  if (!aReferences.length || !bReferences.length) return 0;
  const b = new Set(bReferences);
  const shared = aReferences.filter((reference) => b.has(reference)).length;
  return shared / Math.sqrt(aReferences.length * bReferences.length);
}

function cleanAuthors(authors) {
  return authors
    .map(normalize)
    .filter((author) => author && !(/esteban.*diaz|diaz.*jara|esteban f diaz/.test(author)));
}

function shortTitle(title) {
  const words = String(title).split(/\s+/);
  return words.length > 8 ? `${words.slice(0, 8).join(' ')}…` : title;
}

async function fetchOpenAlexWork(work) {
  if (offline || !work.openalex_id) return null;
  const id = compactId(work.openalex_id);
  const response = await fetch(`https://api.openalex.org/works/${encodeURIComponent(id)}?select=id,referenced_works,topics,keywords`, {
    headers: { 'User-Agent': 'diaz-jara-lab-publication-network/1.0 (mailto:esteban.diaz@uautonoma.cl)' },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function selectFeatured(papers) {
  const patterns = [
    /carotid bodies mediate glial/i,
    /inhibition of nts astrocytes/i,
    /medullary astrocytes mediate/i,
    /photostimulation of rvlm c1/i,
    /connexin 43 hemichannels and pannexin/i,
  ];
  const ids = new Set();
  for (const pattern of patterns) {
    const match = papers.find((paper) => pattern.test(paper.title));
    if (match) ids.add(match.id);
  }
  return ids;
}

class DisjointSet {
  constructor(values) {
    this.parent = new Map(values.map((value) => [value, value]));
  }
  find(value) {
    const parent = this.parent.get(value);
    if (parent !== value) this.parent.set(value, this.find(parent));
    return this.parent.get(value);
  }
  join(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return false;
    this.parent.set(rootB, rootA);
    return true;
  }
}

async function main() {
  const sortedWorks = [...source.works].sort((a, b) =>
    b.display_year_recommended - a.display_year_recommended ||
    b.scholar_citations - a.scholar_citations ||
    a.title.localeCompare(b.title),
  );
  const primaryWorks = sortedWorks.filter((work) => work.display_type === 'journal-article' || work.display_type === 'review');
  let previous = null;
  try {
    previous = JSON.parse(readFileSync(outputPath, 'utf8'));
  } catch {}
  const cachedReferences = new Map((previous?.nodes ?? [])
    .filter((node) => node.kind === 'paper')
    .map((node) => [node.openAlexId, node.referencedWorks ?? []]));

  const papers = [];
  for (const work of primaryWorks) {
    const catalogueIndex = sortedWorks.indexOf(work);
    const id = compactId(work.openalex_id) ?? `scholar-${catalogueIndex + 1}`;
    let openAlex = null;
    try {
      openAlex = await fetchOpenAlexWork(work);
    } catch (error) {
      console.warn(`OpenAlex lookup failed for ${id}: ${error.message}`);
    }
    const fineTopicIds = fineTopicIdsFor(work);
    const topicIds = topicIdsFor(fineTopicIds);
    const cluster = clusterFor(work, fineTopicIds);
    papers.push({
      id,
      kind: 'paper',
      listId: publicationId(work, catalogueIndex),
      title: work.title,
      shortTitle: shortTitle(work.title),
      year: work.display_year_recommended,
      journal: work.journal_or_source,
      authors: work.authors,
      citedByCount: work.scholar_citations,
      doi: work.doi,
      url: preferredUrl(work),
      scholarUrl: work.scholar_detail_url,
      openAlexId: work.openalex_id,
      topicIds,
      fineTopicIds,
      cluster,
      titleTokens: titleTokens(work.title),
      normalizedAuthors: cleanAuthors(work.authors),
      referencedWorks: openAlex?.referenced_works ?? cachedReferences.get(work.openalex_id) ?? [],
    });
  }

  const featuredIds = selectFeatured(papers);
  const clusterCounts = new Map();
  for (const paper of papers) {
    const index = clusterCounts.get(paper.cluster) ?? 0;
    const total = papers.filter((candidate) => candidate.cluster === paper.cluster).length;
    clusterCounts.set(paper.cluster, index + 1);
    Object.assign(paper, positionFor(index, total, paper.cluster, paper.id), {
      featured: featuredIds.has(paper.id),
    });
  }

  const authorFrequencies = new Map();
  const tokenFrequencies = new Map();
  for (const paper of papers) {
    for (const author of new Set(paper.normalizedAuthors)) authorFrequencies.set(author, (authorFrequencies.get(author) ?? 0) + 1);
    for (const token of new Set(paper.titleTokens)) tokenFrequencies.set(token, (tokenFrequencies.get(token) ?? 0) + 1);
  }

  const candidates = [];
  for (let i = 0; i < papers.length; i += 1) {
    for (let j = i + 1; j < papers.length; j += 1) {
      const a = papers[i];
      const b = papers[j];
      const sharedTopics = a.fineTopicIds.filter((topic) => b.fineTopicIds.includes(topic));
      const sharedAuthors = a.normalizedAuthors.filter((author) => b.normalizedAuthors.includes(author));
      const sharedTokens = a.titleTokens.filter((token) => b.titleTokens.includes(token));
      const sharedReferences = a.referencedWorks.filter((reference) => new Set(b.referencedWorks).has(reference)).length;
      const score =
        0.42 * jaccard(a.fineTopicIds, b.fineTopicIds) +
        0.28 * coupling(a.referencedWorks, b.referencedWorks) +
        0.16 * weightedJaccard(a.normalizedAuthors, b.normalizedAuthors, authorFrequencies, papers.length) +
        0.09 * weightedJaccard(a.titleTokens, b.titleTokens, tokenFrequencies, papers.length) +
        0.05 * Math.exp(-Math.abs(a.year - b.year) / 4);
      candidates.push({
        source: a.id,
        target: b.id,
        kind: 'paper-similarity',
        score: round(score, 5),
        weight: clamp(Math.round(score * 24), 1, 10),
        reasons: {
          sharedTopics,
          sharedAuthors: [...new Set(sharedAuthors)].slice(0, 4),
          sharedTokens: [...new Set(sharedTokens)].slice(0, 4),
          sharedReferences,
        },
      });
    }
  }
  candidates.sort((a, b) => b.score - a.score || pairKey(a.source, a.target).localeCompare(pairKey(b.source, b.target)));

  const selected = new Map();
  for (const paper of papers) {
    const top = candidates.filter((edge) => edge.source === paper.id || edge.target === paper.id).slice(0, 4);
    for (const edge of top) selected.set(pairKey(edge.source, edge.target), edge);
  }
  const forest = new DisjointSet(papers.map((paper) => paper.id));
  for (const edge of candidates) {
    if (forest.join(edge.source, edge.target)) selected.set(pairKey(edge.source, edge.target), edge);
  }

  const themeNodes = themes.map((theme, index) => {
    const angle = (Math.PI * 2 * index) / themes.length - Math.PI / 2;
    return {
      id: `theme-${theme.id}`,
      kind: 'theme',
      title: { es: theme.es, en: theme.en },
      topicId: theme.id,
      x: round(50 + Math.cos(angle) * 39),
      y: round(50 + Math.sin(angle) * 38),
    };
  });
  relaxLayout([...papers, ...themeNodes]);
  const edges = [...selected.values()];
  for (const paper of papers) {
    for (const topicId of paper.topicIds) {
      edges.push({
        source: paper.id,
        target: `theme-${topicId}`,
        kind: 'paper-theme',
        score: 1,
        weight: 4,
        reasons: { sharedTopics: [topicId], sharedAuthors: [], sharedTokens: [], sharedReferences: 0 },
      });
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    methodology: {
      paperScope: 'journal-article and review records in the verified local catalogue',
      runtimeNetworkRequests: false,
      similarity: 'eight fine-grained topic signals grouped into four visible research axes, OpenAlex bibliographic coupling, co-authorship excluding Esteban Diaz-Jara, title-token overlap, and publication proximity',
      layout: 'deterministic clustered golden-angle placement',
    },
    stats: {
      papers: papers.length,
      themes: themeNodes.length,
      similarityEdges: selected.size,
      themeEdges: edges.filter((edge) => edge.kind === 'paper-theme').length,
      referencesAvailable: papers.filter((paper) => paper.referencedWorks.length > 0).length,
      minimumNodeSeparationPx: 62,
    },
    nodes: [...papers, ...themeNodes],
    edges,
  };

  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
  console.log(JSON.stringify(output.stats));
}

await main();
