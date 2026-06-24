import { openApiSpec } from '../src/docs/openapi';

type CheckStatus = 'PASS' | 'FAIL';
type CheckResult = { name: string; status: CheckStatus; detail?: string };

function pass(results: CheckResult[], name: string, detail?: string) {
  results.push({ name, status: 'PASS', detail });
}

function fail(results: CheckResult[], name: string, detail?: string) {
  results.push({ name, status: 'FAIL', detail });
}

const REQUIRED_TAGS = ['Health', 'Auth', 'Users', 'Roles', 'Permissions', 'Vehicles', 'Drivers', 'Assets', 'Documents', 'Trips', 'Fuel', 'Expenses', 'Finance'];

const REQUIRED_PATHS: Record<string, string[]> = {
  'Health': ['GET /health'],
  'Auth': ['POST /auth/login', 'POST /auth/refresh', 'POST /auth/logout', 'GET /auth/me'],
  'Users': ['GET /users', 'POST /users', 'GET /users/{id}', 'PATCH /users/{id}', 'PATCH /users/{id}/status', 'PATCH /users/{id}/password'],
  'Roles': ['GET /roles', 'POST /roles', 'PATCH /roles/{id}', 'PATCH /roles/{id}/permissions'],
  'Permissions': ['GET /permissions'],
  'Vehicles': ['GET /vehicles', 'POST /vehicles', 'GET /vehicles/{id}', 'PATCH /vehicles/{id}', 'PATCH /vehicles/{id}/status'],
  'Drivers': ['GET /drivers', 'POST /drivers', 'GET /drivers/{id}', 'PATCH /drivers/{id}', 'PATCH /drivers/{id}/status'],
  'Assets': [
    'GET /assets/categories', 'POST /assets/categories', 'PATCH /assets/categories/{id}',
    'GET /assets', 'POST /assets', 'GET /assets/{id}', 'PATCH /assets/{id}', 'PATCH /assets/{id}/status',
    'GET /assets/{id}/assignments', 'GET /assets/{id}/history',
    'POST /assets/{id}/assign', 'POST /assets/{id}/return', 'POST /assets/{id}/transfer',
    'POST /assets/{id}/mark-damaged', 'POST /assets/{id}/mark-lost',
  ],
  'Documents': ['GET /documents', 'POST /documents', 'PATCH /documents/{id}', 'DELETE /documents/{id}'],
  'Trips': [
    'GET /trips', 'POST /trips', 'GET /trips/{id}', 'PATCH /trips/{id}',
    'POST /trips/{id}/schedule', 'POST /trips/{id}/start', 'POST /trips/{id}/complete',
    'POST /trips/{id}/cancel', 'GET /trips/{id}/history',
  ],
  'Fuel': ['GET /fuel', 'POST /fuel', 'GET /fuel/{id}', 'PATCH /fuel/{id}', 'DELETE /fuel/{id}', 'POST /fuel/{id}/submit', 'POST /fuel/{id}/approve', 'POST /fuel/{id}/reject', 'POST /fuel/{id}/cancel'],
  'Expenses': ['GET /expenses', 'POST /expenses', 'GET /expenses/{id}', 'PATCH /expenses/{id}', 'DELETE /expenses/{id}', 'POST /expenses/{id}/submit', 'POST /expenses/{id}/approve', 'POST /expenses/{id}/reject', 'POST /expenses/{id}/cancel'],
  'Finance': [
    'GET /finance/dashboard-summary', 'GET /finance/pnl',
    'GET /finance/accounts', 'POST /finance/accounts', 'GET /finance/accounts/{id}', 'PUT /finance/accounts/{id}', 'DELETE /finance/accounts/{id}',
    'GET /finance/categories', 'POST /finance/categories', 'GET /finance/categories/{id}', 'DELETE /finance/categories/{id}',
    'GET /finance/vendors', 'POST /finance/vendors', 'GET /finance/vendors/{id}', 'PUT /finance/vendors/{id}', 'DELETE /finance/vendors/{id}',
    'GET /finance/customers', 'POST /finance/customers', 'GET /finance/customers/{id}', 'PUT /finance/customers/{id}', 'DELETE /finance/customers/{id}',
    'GET /finance/trip-billings', 'POST /finance/trip-billings', 'GET /finance/trip-billings/{id}', 'PUT /finance/trip-billings/{id}', 'DELETE /finance/trip-billings/{id}',
    'GET /finance/transactions', 'POST /finance/transactions', 'GET /finance/transactions/{id}', 'DELETE /finance/transactions/{id}',
    'GET /finance/payments', 'POST /finance/payments', 'GET /finance/payments/{id}', 'DELETE /finance/payments/{id}',
  ],
};

function normalizePath(path: string): string {
  return path.replace(/^\//, '');
}

function methodPath(method: string, path: string): string {
  return `${method.toUpperCase()} /${normalizePath(path)}`;
}

function hasBearerAuth(operation: Record<string, unknown>): boolean {
  const security = operation.security;
  return Array.isArray(security) && security.some((requirement) => (
    typeof requirement === 'object'
    && requirement !== null
    && Object.prototype.hasOwnProperty.call(requirement, 'bearerAuth')
  ));
}

function main() {
  const results: CheckResult[] = [];
  const paths = openApiSpec.paths as Record<string, Record<string, Record<string, unknown>>>;
  const specAny = openApiSpec as Record<string, unknown>;
  const tags = (specAny.tags ?? []) as Array<{ name: string }>;

  const tagNames = tags.map((t) => t.name);
  for (const tag of REQUIRED_TAGS) {
    if (tagNames.includes(tag)) {
      pass(results, `Tag: ${tag}`);
    } else {
      fail(results, `Tag: ${tag}`, 'Missing from OpenAPI tags');
    }
  }

  for (const [tag, requiredEndpoints] of Object.entries(REQUIRED_PATHS)) {
    for (const endpoint of requiredEndpoints) {
      const spaceIdx = endpoint.indexOf(' ');
      const method = endpoint.substring(0, spaceIdx);
      const path = endpoint.substring(spaceIdx + 1);
      const pathObj = paths[path];

      if (!pathObj) {
        fail(results, `${endpoint}`, `Path ${path} not found in OpenAPI`);
        continue;
      }

      const operation = pathObj[method.toLowerCase()];
      if (!operation) {
        fail(results, `${endpoint}`, `Method ${method} not found on ${path}`);
        continue;
      }

      const usesBearerAuth = ![
        'GET /health',
        'POST /auth/login',
        'POST /auth/refresh',
        'POST /auth/logout',
      ].includes(endpoint);
      if (!usesBearerAuth) {
        pass(results, `${endpoint}`, 'Does not require bearerAuth');
      } else if (hasBearerAuth(operation)) {
        pass(results, `${endpoint}`, 'bearerAuth present');
      } else {
        fail(results, `${endpoint}`, 'bearerAuth missing on protected route');
      }
    }
  }

  const loginPath = paths['/auth/login'];
  let loginSchemaVerified = false;
  if (loginPath?.post) {
    const reqBody = (loginPath.post as Record<string, unknown>).requestBody as Record<string, unknown> | undefined;
    if (reqBody) {
      const content = (reqBody as Record<string, Record<string, unknown>>).content;
      if (content?.['application/json']) {
        const schema = (content['application/json'] as Record<string, unknown>).schema as Record<string, unknown> | undefined;
        if (schema && '$ref' in schema) {
          const ref = schema.$ref as string;
          const schemaName = ref.split('/').pop();
          const specComp = (specAny.components ?? {}) as Record<string, unknown>;
          const schemas = (specComp.schemas ?? {}) as Record<string, Record<string, unknown>>;
          if (schemas[schemaName!]) {
            const loginSchema = schemas[schemaName!];
            const props = (loginSchema.properties ?? {}) as Record<string, unknown>;
            if (props.identifier && props.password) {
              pass(results, 'Auth login uses identifier/password');
              loginSchemaVerified = true;
            } else if (props.email) {
              fail(results, 'Auth login uses identifier/password', 'Uses email instead of identifier');
              loginSchemaVerified = true;
            } else {
              fail(results, 'Auth login uses identifier/password', 'Missing identifier or password field');
              loginSchemaVerified = true;
            }
          }
        }
      }
    }
  }
  if (!loginSchemaVerified) {
    fail(results, 'Auth login uses identifier/password', 'Login request schema could not be resolved');
  }

  const tripHistoryPath = paths['/trips/{id}/history'];
  if (tripHistoryPath?.get) {
    if (hasBearerAuth(tripHistoryPath.get)) {
      pass(results, 'Trip history has bearerAuth');
    } else {
      fail(results, 'Trip history has bearerAuth', 'Missing');
    }
  } else {
    fail(results, 'Trip history endpoint', 'Missing');
  }

  console.log('\nAPI Docs Coverage Test Summary');
  console.log('─'.repeat(70));
  for (const r of results) {
    const detailText = r.detail ? ` - ${r.detail}` : '';
    const icon = r.status === 'PASS' ? 'PASS' : 'FAIL';
    console.log(`${icon} ${r.name}${detailText}`);
  }
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log('─'.repeat(70));
  console.log(`Summary: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
