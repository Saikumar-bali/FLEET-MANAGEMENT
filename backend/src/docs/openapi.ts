export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Fleet Management API',
    version: '2.0.0',
    description: `Production-grade REST API for fleet management.

## Authentication
All endpoints except health, login, refresh, and logout require a valid JWT access token.
Refresh and logout accept a refresh token in the request body instead of a bearer access token.
Include the token in the \`Authorization\` header: \`Bearer <token>\`.

## Permission Model
Every protected endpoint enforces a specific permission key. Users without the required permission receive a \`403\` response.

## Pagination
List endpoints return:
\`\`\`json
{
  "items": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
\`\`\`
Query parameters: \`?page=1&limit=20&search=&status=\`
`,
    contact: {
      name: 'Fleet Management Team',
    },
  },
  servers: [
    { url: '/api/v1', description: 'Same-origin (local dev proxy or deployed)' },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Roles' },
    { name: 'Permissions' },
    { name: 'Vehicles' },
    { name: 'Drivers' },
    { name: 'Assets' },
    { name: 'Documents' },
    { name: 'Trips' },
    { name: 'Fuel' },
    { name: 'Expenses' },
    { name: 'Maintenance' },
    { name: 'Repairs' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation successful' },
          data: { type: 'object' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'string' } },
        },
      },

      // Auth
      LoginInput: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
          identifier: { type: 'string', description: 'Username or email' },
          password: { type: 'string', minLength: 8 },
        },
      },
      AuthPayload: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
          permissions: { type: 'array', items: { type: 'string' } },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          mobile: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
          role: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              key: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
      UserCreateInput: {
        type: 'object',
        required: ['name', 'email', 'password', 'roleId', 'status'],
        properties: {
          name: { type: 'string', minLength: 2 },
          email: { type: 'string', format: 'email' },
          mobile: { type: 'string' },
          password: { type: 'string', minLength: 8 },
          roleId: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
        },
      },

      // Roles
      Role: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          key: { type: 'string' },
          description: { type: 'string', nullable: true },
          isSystem: { type: 'boolean' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          rolePermissions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                permission: { $ref: '#/components/schemas/Permission' },
              },
            },
          },
        },
      },
      RoleCreateInput: {
        type: 'object',
        required: ['name', 'key'],
        properties: {
          name: { type: 'string', minLength: 2 },
          key: { type: 'string', pattern: '^[a-z0-9_]+$' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
        },
      },
      PermissionAssignInput: {
        type: 'object',
        required: ['permissionKeys'],
        properties: {
          permissionKeys: { type: 'array', items: { type: 'string' } },
        },
      },

      // Permissions
      Permission: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          key: { type: 'string' },
          module: { type: 'string' },
          action: { type: 'string' },
          description: { type: 'string', nullable: true },
        },
      },

      // Vehicle
      Vehicle: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          vehicleNumber: { type: 'string' },
          vehicleType: { type: 'string' },
          brand: { type: 'string', nullable: true },
          model: { type: 'string', nullable: true },
          year: { type: 'integer', nullable: true },
          fuelType: { type: 'string' },
          chassisNumber: { type: 'string', nullable: true },
          engineNumber: { type: 'string', nullable: true },
          rcNumber: { type: 'string', nullable: true },
          insuranceExpiry: { type: 'string', format: 'date-time', nullable: true },
          fitnessExpiry: { type: 'string', format: 'date-time', nullable: true },
          pollutionExpiry: { type: 'string', format: 'date-time', nullable: true },
          permitExpiry: { type: 'string', format: 'date-time', nullable: true },
          currentOdometer: { type: 'integer' },
          status: { type: 'string', enum: ['AVAILABLE', 'ON_TRIP', 'UNDER_MAINTENANCE', 'UNDER_REPAIR', 'INACTIVE', 'SOLD', 'ACCIDENT'] },
          currentDriverId: { type: 'string', nullable: true },
          currentDriver: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              mobile: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
      VehicleCreateInput: {
        type: 'object',
        required: ['vehicleNumber', 'vehicleType', 'fuelType'],
        properties: {
          vehicleNumber: { type: 'string' },
          vehicleType: { type: 'string' },
          brand: { type: 'string' },
          model: { type: 'string' },
          year: { type: 'integer' },
          fuelType: { type: 'string' },
          chassisNumber: { type: 'string' },
          engineNumber: { type: 'string' },
          rcNumber: { type: 'string' },
          insuranceExpiry: { type: 'string', format: 'date-time' },
          fitnessExpiry: { type: 'string', format: 'date-time' },
          pollutionExpiry: { type: 'string', format: 'date-time' },
          permitExpiry: { type: 'string', format: 'date-time' },
          currentOdometer: { type: 'integer', default: 0 },
          status: { type: 'string', enum: ['AVAILABLE', 'ON_TRIP', 'UNDER_MAINTENANCE', 'UNDER_REPAIR', 'INACTIVE', 'SOLD', 'ACCIDENT'] },
          currentDriverId: { type: 'string' },
        },
      },
      VehicleStatusInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['AVAILABLE', 'ON_TRIP', 'UNDER_MAINTENANCE', 'UNDER_REPAIR', 'INACTIVE', 'SOLD', 'ACCIDENT'] },
        },
      },

      // Driver
      Driver: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          mobile: { type: 'string' },
          alternateMobile: { type: 'string', nullable: true },
          licenseNumber: { type: 'string' },
          licenseExpiry: { type: 'string', format: 'date-time', nullable: true },
          address: { type: 'string', nullable: true },
          emergencyContact: { type: 'string', nullable: true },
          experienceYears: { type: 'integer', nullable: true },
          status: { type: 'string', enum: ['AVAILABLE', 'ON_TRIP', 'ON_LEAVE', 'SUSPENDED', 'INACTIVE'] },
        },
      },
      DriverCreateInput: {
        type: 'object',
        required: ['name', 'mobile', 'licenseNumber'],
        properties: {
          name: { type: 'string', minLength: 2 },
          mobile: { type: 'string', minLength: 10 },
          alternateMobile: { type: 'string' },
          licenseNumber: { type: 'string' },
          licenseExpiry: { type: 'string', format: 'date-time' },
          address: { type: 'string' },
          emergencyContact: { type: 'string' },
          experienceYears: { type: 'integer' },
          status: { type: 'string', enum: ['AVAILABLE', 'ON_TRIP', 'ON_LEAVE', 'SUSPENDED', 'INACTIVE'] },
        },
      },
      DriverStatusInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['AVAILABLE', 'ON_TRIP', 'ON_LEAVE', 'SUSPENDED', 'INACTIVE'] },
        },
      },

      // Asset Category
      AssetCategory: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          key: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          _count: {
            type: 'object',
            properties: { assets: { type: 'integer' } },
          },
        },
      },
      AssetCategoryCreateInput: {
        type: 'object',
        required: ['name', 'key'],
        properties: {
          name: { type: 'string', minLength: 2 },
          key: { type: 'string', pattern: '^[a-z0-9_]+$' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
        },
      },

      // Asset
      Asset: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          assetCode: { type: 'string' },
          name: { type: 'string' },
          assetCategoryId: { type: 'string' },
          serialNumber: { type: 'string', nullable: true },
          purchaseDate: { type: 'string', format: 'date-time', nullable: true },
          purchaseAmount: { type: 'number', nullable: true },
          currentStatus: { type: 'string', enum: ['AVAILABLE', 'ASSIGNED', 'DAMAGED', 'LOST', 'UNDER_REPAIR', 'RETIRED'] },
          notes: { type: 'string', nullable: true },
          assetCategory: { $ref: '#/components/schemas/AssetCategory' },
        },
      },
      AssetCreateInput: {
        type: 'object',
        required: ['assetCode', 'name', 'assetCategoryId'],
        properties: {
          assetCode: { type: 'string' },
          name: { type: 'string', minLength: 2 },
          assetCategoryId: { type: 'string' },
          serialNumber: { type: 'string' },
          purchaseDate: { type: 'string', format: 'date-time' },
          purchaseAmount: { type: 'number', minimum: 0 },
          currentStatus: { type: 'string', enum: ['AVAILABLE', 'ASSIGNED', 'DAMAGED', 'LOST', 'UNDER_REPAIR', 'RETIRED'] },
          notes: { type: 'string' },
        },
      },
      AssetStatusInput: {
        type: 'object',
        required: ['currentStatus'],
        properties: {
          currentStatus: { type: 'string', enum: ['AVAILABLE', 'ASSIGNED', 'DAMAGED', 'LOST', 'UNDER_REPAIR', 'RETIRED'] },
          notes: { type: 'string' },
          proofUrl: { type: 'string', format: 'uri' },
        },
      },
      AssetAssignInput: {
        type: 'object',
        required: ['assignedToType', 'assignedToId'],
        properties: {
          assignedToType: { type: 'string', enum: ['VEHICLE', 'DRIVER', 'USER'] },
          assignedToId: { type: 'string' },
          notes: { type: 'string' },
        },
      },
      AssetReturnInput: {
        type: 'object',
        properties: {
          notes: { type: 'string' },
          proofUrl: { type: 'string', format: 'uri' },
        },
      },
      AssetTransferInput: {
        type: 'object',
        required: ['assignedToType', 'assignedToId'],
        properties: {
          assignedToType: { type: 'string', enum: ['VEHICLE', 'DRIVER', 'USER'] },
          assignedToId: { type: 'string' },
          notes: { type: 'string' },
          proofUrl: { type: 'string', format: 'uri' },
        },
      },
      AssetStatusActionInput: {
        type: 'object',
        properties: {
          notes: { type: 'string' },
          proofUrl: { type: 'string', format: 'uri' },
        },
      },
      AssetAssignment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          assetId: { type: 'string' },
          assignedToType: { type: 'string', enum: ['VEHICLE', 'DRIVER', 'USER'] },
          assignedToId: { type: 'string' },
          assignedAt: { type: 'string', format: 'date-time' },
          returnedAt: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'RETURNED', 'TRANSFERRED'] },
          notes: { type: 'string', nullable: true },
        },
      },
      AssetHistoryEntry: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          assetId: { type: 'string' },
          action: { type: 'string' },
          performedBy: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          proofUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // Document
      Document: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          entityType: { type: 'string', enum: ['VEHICLE', 'DRIVER', 'ASSET'] },
          entityId: { type: 'string' },
          documentType: { type: 'string' },
          documentNumber: { type: 'string', nullable: true },
          expiryDate: { type: 'string', format: 'date-time', nullable: true },
          fileUrl: { type: 'string', nullable: true },
          fileName: { type: 'string', nullable: true },
          mimeType: { type: 'string', nullable: true },
          sizeBytes: { type: 'integer', nullable: true },
        },
      },
      DocumentCreateInput: {
        type: 'object',
        required: ['entityType', 'entityId', 'documentType'],
        properties: {
          entityType: { type: 'string', enum: ['VEHICLE', 'DRIVER', 'ASSET'] },
          entityId: { type: 'string' },
          documentType: { type: 'string' },
          documentNumber: { type: 'string' },
          expiryDate: { type: 'string', format: 'date-time' },
          fileUrl: { type: 'string' },
          fileName: { type: 'string' },
          mimeType: { type: 'string' },
          sizeBytes: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    // Health
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns API and database health status. No authentication required.',
        responses: {
          '200': {
            description: 'Healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        timestamp: { type: 'string' },
                        uptime: { type: 'number' },
                        database: { type: 'string', example: 'connected' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // Auth
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        description: 'Authenticate with username or email and password. Returns JWT access token and refresh token.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          '200': { description: 'Login successful' },
          '400': { description: 'Validation error' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        description: 'Returns the authenticated user with their permissions.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Current user data with permissions' },
          '401': { description: 'Authentication required' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh session',
        description: 'Exchange a valid refresh token for a new access token.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } },
        },
        responses: {
          '200': { description: 'Session refreshed' },
          '401': { description: 'Refresh token is invalid or expired' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        description: 'Revoke the refresh token.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } },
        },
        responses: {
          '200': { description: 'Logout successful' },
          '400': { description: 'Validation error' },
        },
      },
    },

    // Roles
    '/roles': {
      get: {
        tags: ['Roles'],
        summary: 'List roles',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Array of roles with permissions' },
          '403': { description: 'Missing role_view permission' },
        },
      },
      post: {
        tags: ['Roles'],
        summary: 'Create role',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RoleCreateInput' } } },
        },
        responses: {
          '201': { description: 'Role created' },
          '403': { description: 'Missing role_create permission' },
        },
      },
    },
    '/roles/{id}': {
      patch: {
        tags: ['Roles'],
        summary: 'Update role',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RoleCreateInput' } } },
        },
        responses: {
          '200': { description: 'Role updated' },
          '403': { description: 'Missing role_update permission' },
          '404': { description: 'Role not found' },
        },
      },
    },
    '/roles/{id}/permissions': {
      patch: {
        tags: ['Roles'],
        summary: 'Assign permissions to role',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PermissionAssignInput' } } },
        },
        responses: {
          '200': { description: 'Permissions assigned' },
          '403': { description: 'Missing permission_assign' },
        },
      },
    },

    // Permissions
    '/permissions': {
      get: {
        tags: ['Permissions'],
        summary: 'List permissions',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Array of all permission definitions' },
          '403': { description: 'Missing permission_view' },
        },
      },
    },

    // Users
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List users',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'Paginated user list' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing user_view permission' },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Create user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UserCreateInput' } } },
        },
        responses: {
          '201': { description: 'User created' },
          '400': { description: 'Validation error or duplicate email/username' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing user_create permission' },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'User details with role' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing user_view permission' },
          '404': { description: 'User not found' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, mobile: { type: 'string' }, roleId: { type: 'string' }, status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] } } } } },
        },
        responses: {
          '200': { description: 'User updated' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing user_update permission' },
          '404': { description: 'User not found' },
        },
      },
    },
    '/users/{id}/status': {
      patch: {
        tags: ['Users'],
        summary: 'Update user status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] } } } } },
        },
        responses: {
          '200': { description: 'Status updated' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing user_delete or user_deactivate permission' },
          '404': { description: 'User not found' },
        },
      },
    },
    '/users/{id}/password': {
      patch: {
        tags: ['Users'],
        summary: 'Update user password',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { password: { type: 'string', minLength: 8 } } } } },
        },
        responses: {
          '200': { description: 'Password updated' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing user_update permission' },
          '404': { description: 'User not found' },
        },
      },
    },

    // Vehicles
    '/vehicles': {
      get: {
        tags: ['Vehicles'],
        summary: 'List vehicles',
        description: 'Paginated list with search and status filter.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['AVAILABLE', 'ON_TRIP', 'UNDER_MAINTENANCE', 'UNDER_REPAIR', 'INACTIVE', 'SOLD', 'ACCIDENT'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'Paginated vehicle list' },
          '403': { description: 'Missing vehicle_view permission' },
        },
      },
      post: {
        tags: ['Vehicles'],
        summary: 'Create vehicle',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VehicleCreateInput' } } },
        },
        responses: {
          '201': { description: 'Vehicle created' },
          '403': { description: 'Missing vehicle_create permission' },
        },
      },
    },
    '/vehicles/{id}': {
      get: {
        tags: ['Vehicles'],
        summary: 'Get vehicle',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Vehicle details with current driver' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing vehicle_view permission' },
          '404': { description: 'Vehicle not found' },
        },
      },
      patch: {
        tags: ['Vehicles'],
        summary: 'Update vehicle',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VehicleCreateInput' } } },
        },
        responses: {
          '200': { description: 'Vehicle updated' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing vehicle_update permission' },
          '404': { description: 'Vehicle not found' },
        },
      },
    },
    '/vehicles/{id}/status': {
      patch: {
        tags: ['Vehicles'],
        summary: 'Update vehicle status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VehicleStatusInput' } } },
        },
        responses: {
          '200': { description: 'Status updated' },
          '400': { description: 'Invalid status transition' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing vehicle_update or vehicle_delete permission' },
          '404': { description: 'Vehicle not found' },
        },
      },
    },

    // Drivers
    '/drivers': {
      get: {
        tags: ['Drivers'],
        summary: 'List drivers',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['AVAILABLE', 'ON_TRIP', 'ON_LEAVE', 'SUSPENDED', 'INACTIVE'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: 'Paginated driver list' } },
      },
      post: {
        tags: ['Drivers'],
        summary: 'Create driver',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DriverCreateInput' } } },
        },
        responses: { '201': { description: 'Driver created' } },
      },
    },
    '/drivers/{id}': {
      get: {
        tags: ['Drivers'],
        summary: 'Get driver',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Driver details' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing driver_view permission' },
          '404': { description: 'Driver not found' },
        },
      },
      patch: {
        tags: ['Drivers'],
        summary: 'Update driver',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Driver updated' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing driver_update permission' },
          '404': { description: 'Driver not found' },
        },
      },
    },
    '/drivers/{id}/status': {
      patch: {
        tags: ['Drivers'],
        summary: 'Update driver status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DriverStatusInput' } } },
        },
        responses: {
          '200': { description: 'Status updated' },
          '400': { description: 'Invalid status transition' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing driver_update or driver_delete permission' },
          '404': { description: 'Driver not found' },
        },
      },
    },

    // Asset Categories
    '/assets/categories': {
      get: {
        tags: ['Assets'],
        summary: 'List asset categories',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Array of categories with asset counts' } },
      },
      post: {
        tags: ['Assets'],
        summary: 'Create asset category',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AssetCategoryCreateInput' } } },
        },
        responses: { '201': { description: 'Category created' } },
      },
    },
    '/assets/categories/{id}': {
      patch: {
        tags: ['Assets'],
        summary: 'Update asset category',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AssetCategoryCreateInput' } } },
        },
        responses: { '200': { description: 'Category updated' } },
      },
    },

    // Assets
    '/assets': {
      get: {
        tags: ['Assets'],
        summary: 'List assets',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['AVAILABLE', 'ASSIGNED', 'DAMAGED', 'LOST', 'UNDER_REPAIR', 'RETIRED'] } },
          { name: 'categoryId', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: 'Paginated asset list' } },
      },
      post: {
        tags: ['Assets'],
        summary: 'Create asset',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AssetCreateInput' } } },
        },
        responses: { '201': { description: 'Asset created' } },
      },
    },
    '/assets/{id}': {
      get: {
        tags: ['Assets'],
        summary: 'Get asset',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Asset details with category' } },
      },
      patch: {
        tags: ['Assets'],
        summary: 'Update asset',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Asset updated' } },
      },
    },
    '/assets/{id}/status': {
      patch: {
        tags: ['Assets'],
        summary: 'Update asset status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AssetStatusInput' } } },
        },
        responses: {
          '200': { description: 'Status updated' },
          '400': { description: 'Invalid status transition' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing asset_update or asset_delete permission' },
          '404': { description: 'Asset not found' },
        },
      },
    },
    '/assets/{id}/assignments': {
      get: {
        tags: ['Assets'],
        summary: 'List asset assignments',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Array of assignment records',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/AssetAssignment' },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing asset_view permission' },
          '404': { description: 'Asset not found' },
        },
      },
    },
    '/assets/{id}/history': {
      get: {
        tags: ['Assets'],
        summary: 'Get asset history',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Array of history entries',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/AssetHistoryEntry' },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing asset_view permission' },
          '404': { description: 'Asset not found' },
        },
      },
    },
    '/assets/{id}/assign': {
      post: {
        tags: ['Assets'],
        summary: 'Assign asset to holder',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AssetAssignInput' } } },
        },
        responses: {
          '200': { description: 'Asset assigned' },
          '400': { description: 'Asset already assigned or invalid holder' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing asset_assign permission' },
          '404': { description: 'Asset not found' },
        },
      },
    },
    '/assets/{id}/return': {
      post: {
        tags: ['Assets'],
        summary: 'Return assigned asset',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AssetReturnInput' } } },
        },
        responses: {
          '200': { description: 'Asset returned' },
          '400': { description: 'Asset is not currently assigned' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing asset_return permission' },
          '404': { description: 'Asset not found' },
        },
      },
    },
    '/assets/{id}/transfer': {
      post: {
        tags: ['Assets'],
        summary: 'Transfer asset to new holder',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AssetTransferInput' } } },
        },
        responses: {
          '200': { description: 'Asset transferred' },
          '400': { description: 'Asset is not currently assigned' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing asset_transfer permission' },
          '404': { description: 'Asset not found' },
        },
      },
    },
    '/assets/{id}/mark-damaged': {
      post: {
        tags: ['Assets'],
        summary: 'Mark asset as damaged',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AssetStatusActionInput' } } },
        },
        responses: {
          '200': { description: 'Asset marked as damaged' },
          '400': { description: 'Invalid status transition' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing asset_mark_damaged permission' },
          '404': { description: 'Asset not found' },
        },
      },
    },
    '/assets/{id}/mark-lost': {
      post: {
        tags: ['Assets'],
        summary: 'Mark asset as lost',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AssetStatusActionInput' } } },
        },
        responses: {
          '200': { description: 'Asset marked as lost' },
          '400': { description: 'Invalid status transition' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing asset_mark_lost permission' },
          '404': { description: 'Asset not found' },
        },
      },
    },

    // Documents
    '/documents': {
      get: {
        tags: ['Documents'],
        summary: 'List documents',
        description: 'Filter by entityType and entityId to get documents for a specific record.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'entityType', in: 'query', schema: { type: 'string', enum: ['VEHICLE', 'DRIVER', 'ASSET'] } },
          { name: 'entityId', in: 'query', schema: { type: 'string' } },
          { name: 'documentType', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Paginated document list' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing asset_view permission' },
        },
      },
      post: {
        tags: ['Documents'],
        summary: 'Create document',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DocumentCreateInput' } } },
        },
        responses: {
          '201': { description: 'Document created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing asset_update permission' },
        },
      },
    },
    '/documents/{id}': {
      patch: {
        tags: ['Documents'],
        summary: 'Update document',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Document updated' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing asset_update permission' },
          '404': { description: 'Document not found' },
        },
      },
      delete: {
        tags: ['Documents'],
        summary: 'Delete document',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Document deleted' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing asset_update permission' },
          '404': { description: 'Document not found' },
        },
      },
    },

    // Trips
    '/trips': {
      get: {
        tags: ['Trips'],
        summary: 'List trips',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'SCHEDULED', 'STARTED', 'COMPLETED', 'CANCELLED'] } },
          { name: 'tripType', in: 'query', schema: { type: 'string', enum: ['TRANSFER', 'DELIVERY', 'PICKUP', 'SERVICE', 'INTERNAL'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'Paginated trip list' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing trip_view permission' },
        },
      },
      post: {
        tags: ['Trips'],
        summary: 'Create trip',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TripCreateInput' } } },
        },
        responses: {
          '201': { description: 'Trip created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing trip_create permission' },
        },
      },
    },
    '/trips/{id}': {
      get: {
        tags: ['Trips'],
        summary: 'Get trip',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Trip details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Trip' } } } },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing trip_view permission' },
          '404': { description: 'Trip not found' },
        },
      },
      patch: {
        tags: ['Trips'],
        summary: 'Update trip',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TripUpdateInput' } } },
        },
        responses: {
          '200': { description: 'Trip updated' },
          '400': { description: 'Validation error or invalid state' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing trip_update permission' },
          '404': { description: 'Trip not found' },
        },
      },
    },
    '/trips/{id}/schedule': {
      post: {
        tags: ['Trips'],
        summary: 'Schedule trip',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TripScheduleInput' } } },
        },
        responses: {
          '200': { description: 'Trip scheduled' },
          '400': { description: 'Invalid state or validation error' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing trip_update permission' },
          '404': { description: 'Trip not found' },
        },
      },
    },
    '/trips/{id}/start': {
      post: {
        tags: ['Trips'],
        summary: 'Start trip',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TripStartInput' } } },
        },
        responses: {
          '200': { description: 'Trip started' },
          '400': { description: 'Vehicle or driver unavailable' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing trip_start permission' },
          '404': { description: 'Trip not found' },
        },
      },
    },
    '/trips/{id}/complete': {
      post: {
        tags: ['Trips'],
        summary: 'Complete trip',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TripCompleteInput' } } },
        },
        responses: {
          '200': { description: 'Trip completed' },
          '400': { description: 'Invalid odometer or state' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing trip_end permission' },
          '404': { description: 'Trip not found' },
        },
      },
    },
    '/trips/{id}/cancel': {
      post: {
        tags: ['Trips'],
        summary: 'Cancel trip',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TripCancelInput' } } },
        },
        responses: {
          '200': { description: 'Trip cancelled' },
          '400': { description: 'Invalid state' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing trip_cancel permission' },
          '404': { description: 'Trip not found' },
        },
      },
    },
    '/trips/{id}/history': {
      get: {
        tags: ['Trips'],
        summary: 'Get trip history',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Trip history entries',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/TripHistoryEntry' },
                },
              },
            },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing trip_view permission' },
          '404': { description: 'Trip not found' },
        },
      },
    },
    '/fuel': {
      get: { tags: ['Fuel'], summary: 'List fuel entries', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Paginated fuel entries' } } },
      post: { tags: ['Fuel'], summary: 'Create fuel entry', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['vehicleId', 'fuelDate', 'fuelType', 'quantityLiters', 'pricePerLiter'], properties: { vehicleId: { type: 'string' }, tripId: { type: 'string' }, driverId: { type: 'string' }, fuelDate: { type: 'string', format: 'date-time' }, odometerReading: { type: 'integer', minimum: 0 }, fuelType: { type: 'string' }, quantityLiters: { type: 'number', exclusiveMinimum: 0 }, pricePerLiter: { type: 'number', exclusiveMinimum: 0 }, totalAmount: { type: 'number', exclusiveMinimum: 0 }, stationName: { type: 'string' }, receiptNumber: { type: 'string' }, notes: { type: 'string' } } } } } }, responses: { '201': { description: 'Fuel entry created' } } },
    },
    '/fuel/{id}': {
      get: { tags: ['Fuel'], summary: 'Get fuel entry', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Fuel entry' } } },
      patch: { tags: ['Fuel'], summary: 'Update fuel entry', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Fuel entry updated' } } },
      delete: { tags: ['Fuel'], summary: 'Cancel fuel entry', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Fuel entry cancelled' } } },
    },
    '/fuel/{id}/submit': { post: { tags: ['Fuel'], summary: 'Submit fuel entry', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Fuel entry submitted' } } } },
    '/fuel/{id}/approve': { post: { tags: ['Fuel'], summary: 'Approve fuel entry', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Fuel entry approved' } } } },
    '/fuel/{id}/reject': { post: { tags: ['Fuel'], summary: 'Reject fuel entry', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Fuel entry rejected' } } } },
    '/fuel/{id}/cancel': { post: { tags: ['Fuel'], summary: 'Cancel fuel entry', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Fuel entry cancelled' } } } },
    '/expenses': {
      get: { tags: ['Expenses'], summary: 'List expenses', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Paginated expenses' } } },
      post: { tags: ['Expenses'], summary: 'Create expense', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['vehicleId', 'category', 'expenseDate', 'amount'], properties: { vehicleId: { type: 'string' }, tripId: { type: 'string' }, driverId: { type: 'string' }, category: { type: 'string' }, expenseDate: { type: 'string', format: 'date-time' }, amount: { type: 'number', exclusiveMinimum: 0 }, vendor: { type: 'string' }, receiptNumber: { type: 'string' }, notes: { type: 'string' } } } } } }, responses: { '201': { description: 'Expense created' } } },
    },
    '/expenses/{id}': {
      get: { tags: ['Expenses'], summary: 'Get expense', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Expense' } } },
      patch: { tags: ['Expenses'], summary: 'Update expense', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Expense updated' } } },
      delete: { tags: ['Expenses'], summary: 'Cancel expense', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Expense cancelled' } } },
    },
    '/expenses/{id}/submit': { post: { tags: ['Expenses'], summary: 'Submit expense', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Expense submitted' } } } },
    '/expenses/{id}/approve': { post: { tags: ['Expenses'], summary: 'Approve expense', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Expense approved' } } } },
    '/expenses/{id}/reject': { post: { tags: ['Expenses'], summary: 'Reject expense', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Expense rejected' } } } },
    '/expenses/{id}/cancel': { post: { tags: ['Expenses'], summary: 'Cancel expense', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Expense cancelled' } } } },
    '/maintenance': {
      get: { tags: ['Maintenance'], summary: 'List maintenance requests', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Paginated maintenance requests' } } },
      post: { tags: ['Maintenance'], summary: 'Create maintenance request', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['vehicleId', 'requestDate', 'category', 'description'], properties: { vehicleId: { type: 'string' }, tripId: { type: 'string' }, driverId: { type: 'string' }, requestDate: { type: 'string', format: 'date-time' }, priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }, category: { type: 'string' }, description: { type: 'string' }, estimatedCost: { type: 'number' }, actualCost: { type: 'number' }, scheduledDate: { type: 'string', format: 'date-time' }, completedDate: { type: 'string', format: 'date-time' }, notes: { type: 'string' } } } } } }, responses: { '201': { description: 'Maintenance request created' } } },
    },
    '/maintenance/{id}': {
      get: { tags: ['Maintenance'], summary: 'Get maintenance request', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Maintenance request' } } },
      patch: { tags: ['Maintenance'], summary: 'Update maintenance request', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Maintenance request updated' } } },
      delete: { tags: ['Maintenance'], summary: 'Cancel maintenance request', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Maintenance request cancelled' } } },
    },
    '/maintenance/{id}/submit': { post: { tags: ['Maintenance'], summary: 'Submit maintenance request', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Maintenance request submitted' } } } },
    '/maintenance/{id}/approve': { post: { tags: ['Maintenance'], summary: 'Approve maintenance request', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Maintenance request approved' } } } },
    '/maintenance/{id}/reject': { post: { tags: ['Maintenance'], summary: 'Reject maintenance request', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Maintenance request rejected' } } } },
    '/maintenance/{id}/cancel': { post: { tags: ['Maintenance'], summary: 'Cancel maintenance request', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Maintenance request cancelled' } } } },
    '/repairs': {
      get: { tags: ['Repairs'], summary: 'List repairs', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Paginated repairs' } } },
      post: { tags: ['Repairs'], summary: 'Create repair', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['vehicleId', 'repairDate', 'category', 'description'], properties: { vehicleId: { type: 'string' }, tripId: { type: 'string' }, driverId: { type: 'string' }, repairDate: { type: 'string', format: 'date-time' }, category: { type: 'string' }, description: { type: 'string' }, estimatedCost: { type: 'number' }, actualCost: { type: 'number' }, provider: { type: 'string' }, invoiceNumber: { type: 'string' }, notes: { type: 'string' } } } } } }, responses: { '201': { description: 'Repair created' } } },
    },
    '/repairs/{id}': {
      get: { tags: ['Repairs'], summary: 'Get repair', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Repair' } } },
      patch: { tags: ['Repairs'], summary: 'Update repair', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Repair updated' } } },
      delete: { tags: ['Repairs'], summary: 'Cancel repair', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Repair cancelled' } } },
    },
    '/repairs/{id}/start': { post: { tags: ['Repairs'], summary: 'Start repair', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Repair started' } } } },
    '/repairs/{id}/complete': { post: { tags: ['Repairs'], summary: 'Complete repair', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Repair completed' } } } },
    '/repairs/{id}/cancel': { post: { tags: ['Repairs'], summary: 'Cancel repair', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Repair cancelled' } } } },
  },
};
