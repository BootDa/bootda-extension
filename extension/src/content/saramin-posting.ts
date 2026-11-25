import { parseSaraminPostingUrl, type Posting } from '../domain/posting';

const bodySelector = '.jv_detail .user_content, #job_detail';

function clean(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function postingKey(url: string): string | null {
  try {
    return parseSaraminPostingUrl(url).key;
  } catch {
    return null;
  }
}

type JobMetadata = {
  '@type'?: string | string[];
  '@graph'?: JobMetadata[];
  url?: string;
  identifier?: { value?: string | number };
  hiringOrganization?: { name?: string };
  title?: string;
  validThrough?: string;
  description?: string;
};

function metadata(doc: Document, key: string): JobMetadata | undefined {
  const candidates: JobMetadata[] = [];
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(script.textContent ?? '');
      for (const entry of [parsed].flat()) {
        if (entry && typeof entry === 'object') {
          candidates.push(entry);
          if (Array.isArray(entry['@graph'])) candidates.push(...entry['@graph']);
        }
      }
    } catch {
      // Other structured data on the page may still be usable.
    }
  }
  return candidates.find(job => {
    if (!job || ![job['@type']].flat().includes('JobPosting')) return false;
    if (job.url) return postingKey(job.url) === key;
    const id = String(job.identifier?.value ?? '');
    return /^\d+$/.test(id) && key === 'saramin:' + id;
  });
}

function elementText(element: Element | null): string {
  return clean((element as HTMLElement | null)?.innerText ?? element?.textContent);
}

export function saraminHeader(doc: Document, key: string): Element | null {
  const headers = [...doc.querySelectorAll('.jv_header')];
  return headers.find(header => key === 'saramin:' + saraminDetailId(header))
    ?? headers.find(header => saraminDetailId(header) === null)
    ?? null;
}

export function saraminDetailId(header: Element): string | null {
  return header.getAttribute('data-rec_idx') ?? header.getAttribute('data-rec-idx');
}

export type SaraminCapture = {
  posting: Pick<Posting, 'key' | 'source' | 'company' | 'title' | 'deadline' | 'url'>;
  text: string;
};

export function readSaraminPosting(doc: Document, pageUrl: string): SaraminCapture | null {
  const key = postingKey(pageUrl);
  if (!key) return null;
  const header = saraminHeader(doc, key);
  if (!header) return null;
  const scope = header.closest('.wrap_jv_cont') ?? doc;

  const job = metadata(doc, key);
  const company = elementText(header.querySelector('.company .name, .company .company_name, .company a, a.company')) ||
    clean(job?.hiringOrganization?.name);
  const title = elementText(header.querySelector('.tit_job')) || clean(job?.title);
  if (!company || !title) return null;

  const deadline = scope.querySelector('.jv_howto .info_period dt.end + dd');
  const frame = scope.querySelector<HTMLIFrameElement>('.jv_detail iframe.iframe_content');
  const body = frame?.contentDocument?.querySelector('.user_content, #job_detail')
    ?? scope.querySelector(bodySelector);
  const description = doc.createElement('template');
  if (typeof job?.description === 'string') description.innerHTML = job.description;
  description.content.querySelectorAll('script, style, template').forEach(node => node.remove());
  return {
    posting: {
      ...parseSaraminPostingUrl(pageUrl),
      source: 'saramin',
      company,
      title,
      deadline: elementText(deadline) || clean(job?.validThrough) || null,
    },
    text: elementText(body) || clean(description.content.textContent),
  };
}
