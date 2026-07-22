import { appendFileSync } from 'node:fs';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function normalizeHttpsUrl(value, name) {
  const normalized = value.trim().replace(/\/+$/, '');
  const url = new URL(normalized);
  if (url.protocol !== 'https:') {
    throw new Error(`${name} must use https`);
  }
  return url.toString().replace(/\/$/, '');
}

function getDomainName(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  return String(value.name || value.domain || value.alias || '').trim();
}

function isProductionDomain(entry) {
  if (!entry || typeof entry !== 'object') return true;
  if (entry.verified === false) return false;
  if (entry.gitBranch) return false;
  if (entry.customEnvironmentId) return false;
  if (entry.redirect) return false;
  return true;
}

function rankDomain(domain) {
  let score = domain.length;
  if (!domain.endsWith('.vercel.app')) score -= 1000;
  if (!domain.includes('--')) score -= 100;
  return score;
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vercel API ${response.status}: ${body.slice(0, 300)}`);
  }

  return response.json();
}

const token = required('VERCEL_TOKEN');
const teamId = required('VERCEL_ORG_ID');
const projectId = required('VERCEL_PROJECT_ID');
const deploymentUrl = normalizeHttpsUrl(required('VERCEL_DEPLOYMENT_URL'), 'VERCEL_DEPLOYMENT_URL');
const override = process.env.VERCEL_PRODUCTION_URL?.trim();

let productionUrl;

if (override) {
  productionUrl = normalizeHttpsUrl(override, 'VERCEL_PRODUCTION_URL');
  console.log(`Using configured stable production URL: ${productionUrl}`);
} else {
  const encodedProject = encodeURIComponent(projectId);
  const encodedTeam = encodeURIComponent(teamId);
  const [domainsPayload, projectPayload] = await Promise.all([
    fetchJson(`https://api.vercel.com/v9/projects/${encodedProject}/domains?teamId=${encodedTeam}`, token),
    fetchJson(`https://api.vercel.com/v9/projects/${encodedProject}?teamId=${encodedTeam}`, token),
  ]);

  const deploymentHost = new URL(deploymentUrl).hostname;
  const candidates = [];

  for (const entry of Array.isArray(domainsPayload?.domains) ? domainsPayload.domains : []) {
    if (!isProductionDomain(entry)) continue;
    const domain = getDomainName(entry);
    if (domain) candidates.push(domain);
  }

  for (const entry of Array.isArray(projectPayload?.alias) ? projectPayload.alias : []) {
    const domain = getDomainName(entry);
    if (domain) candidates.push(domain);
  }

  const unique = [...new Set(candidates.map((value) => value.toLowerCase()))]
    .filter((domain) => domain && domain !== deploymentHost)
    .filter((domain) => !domain.includes('/'))
    .sort((a, b) => rankDomain(a) - rankDomain(b) || a.localeCompare(b));

  if (unique.length === 0) {
    throw new Error(
      'No stable production domain was found for the Vercel project. Add a Production domain in Vercel or set the matching GitHub environment variable override.',
    );
  }

  productionUrl = `https://${unique[0]}`;
  console.log(`Resolved stable production URL: ${productionUrl}`);
}

const output = required('GITHUB_OUTPUT');
appendFileSync(output, `production_url=${productionUrl}\n`);
appendFileSync(output, `deployment_url=${deploymentUrl}\n`);

console.log(`Immutable deployment URL retained for audit: ${deploymentUrl}`);
