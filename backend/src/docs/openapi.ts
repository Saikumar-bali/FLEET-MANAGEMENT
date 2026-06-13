export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Fleet Management API',
    version: '2.0.0',
    description: `Production-grade REST API for fleet management.

## Authentication
All endpoints except \`/api/v1/health\` and \`/api/v1/auth/login\` require a valid JWT access token.
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
  ],
  servers: [
    { url: '/api/v1', description: 'Same-origin (local dev proxy or deployed)' },
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

      // Trips
      Trip: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tripNumber: { type: 'string' },
          tripType: { type: 'string', enum: ['TRANSFER', 'DELIVERY', 'PICKUP', 'SERVICE', 'INTERNAL'] },
          status: { type: 'string', enum: ['DRAFT', 'SCHEDULED', 'STARTED', 'COMPLETED', 'CANCELLED'] },
          vehicleId: { type: 'string' },
          driverId: { type: 'string', nullable: true },
          assistantDriverId: { type: 'string', nullable: true },
          originName: { type: 'string' },
          originAddress: { type: 'string', nullable: true },
          destinationName: { type: 'string' },
          destinationAddress: { type: 'string', nullable: true },
          plannedStartAt: { type: 'string', format: 'date-time', nullable: true },
          actualStartAt: { type: 'string', format: 'date-time', nullable: true },
          plannedEndAt: { type: 'string', format: 'date-time', nullable: true },
          actualEndAt: { type: 'string', format: 'date-time', nullable: true },
          startOdometer: { type: 'integer', nullable: true },
          endOdometer: { type: 'integer', nullable: true },
          distanceKm: { type: 'integer', nullable: true },
          purpose: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
        },
      },
      TripCreateInput: {
        type: 'object',
        required: ['tripType', 'vehicleId', 'originName', 'destinationName'],
        properties: {
          tripType: { type: 'string', enum: ['TRANSFER', 'DELIVERY', 'PICKUP', 'SERVICE', 'INTERNAL'] },
          vehicleId: { type: 'string' },
          driverId: { type: 'string' },
          assistantDriverId: { type: 'string' },
          originName: { type: 'string', minLength: 2 },
          originAddress: { type: 'string' },
          destinationName: { type: 'string', minLength: 2 },
          destinationAddress: { type: 'string' },
          plannedStartAt: { type: 'string', format: 'date-time' },
          plannedEndAt: { type: 'string', format: 'date-time' },
          purpose: { type: 'string' },
          notes: { type: 'string' },
        },
      },
      TripUpdateInput: {
        type: 'object',
        properties: {
          tripType: { type: 'string', enum: ['TRANSFER', 'DELIVERY', 'PICKUP', 'SERVICE', 'INTERNAL'] },
          vehicleId: { type: 'string' },
          driverId: { type: 'string', nullable: true },
          assistantDriverId: { type: 'string', nullable: true },
          originName: { type: 'string', minLength: 2 },
          originAddress: { type: 'string' },
          destinationName: { type: 'string', minLength: 2 },
          destinationAddress: { type: 'string' },
          plannedStartAt: { type: 'string', format: 'date-time', nullable: true },
          plannedEndAt: { type: 'string', format: 'date-time', nullable: true },
          purpose: { type: 'string' },
          notes: { type: 'string' },
        },
      },
      TripScheduleInput: {
        type: 'object',
        properties: {
          plannedStartAt: { type: 'string', format: 'date-time' },
          plannedEndAt: { type: 'string', format: 'date-time' },
          notes: { type: 'string' },
        },
      },
      TripStartInput: {
        type: 'object',
        properties: {
          actualStartAt: { type: 'string', format: 'date-time' },
          startOdometer: { type: 'integer', minimum: 0 },
          notes: { type: 'string' },
        },
      },
      TripCompleteInput: {
        type: 'object',
        properties: {
          actualEndAt: { type: 'string', format: 'date-time' },
          endOdometer: { type: 'integer', minimum: 0 },
          distanceKm: { type: 'integer', minimum: 0 },
          notes: { type: 'string' },
        },
      },
      TripCancelInput: {
        type: 'object',
        properties: {
          notes: { type: 'string' },
        },
      },
      TripHistoryEntry: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tripId: { type: 'string' },
          action: {
            type: 'string',
            enum: ['CREATED', 'UPDATED', 'SCHEDULED', 'STARTED', 'COMPLETED', 'CANCELLED', 'VEHICLE_CHANGED', 'DRIVER_CHANGED'],
          },
          fromStatus: { type: 'string', nullable: true },
          toStatus: { type: 'string', nullable: true },
          remarks: { type: 'string', nullable: true },
          metadata: { type: 'object', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
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
          '401': { description: 'Invalid email or password' },
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
        responses: { '200': { description: 'Logout successful' } },
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
        responses: {
          '200': { description: 'Array of users with roles' },
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
        responses: { '200': { description: 'User updated' } },
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
        responses: { '200': { description: 'Status updated' } },
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
        responses: { '200': { description: 'Password updated' } },
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
        responses: { '200': { description: 'Vehicle updated' } },
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
        responses: { '200': { description: 'Status updated' } },
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
        responses: { '200': { description: 'Driver details' } },
      },
      patch: {
        tags: ['Drivers'],
        summary: 'Update driver',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Driver updated' } },
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
        responses: { '200': { description: 'Status updated' } },
      },
    },

    // Asset Categories
    '/assets/categories': {
      get: {
        tags: ['Asset Categories'],
        summary: 'List asset categories',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Array of categories with asset counts' } },
      },
      post: {
        tags: ['Asset Categories'],
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
        tags: ['Asset Categories'],
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
        responses: { '200': { description: 'Status updated' } },
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
        responses: { '200': { description: 'Paginated document list' } },
      },
      post: {
        tags: ['Documents'],
        summary: 'Create document',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DocumentCreateInput' } } },
        },
        responses: { '201': { description: 'Document created' } },
      },
    },
    '/documents/{id}': {
      patch: {
        tags: ['Documents'],
        summary: 'Update document',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Document updated' } },
      },
      delete: {
        tags: ['Documents'],
        summary: 'Delete document',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Document deleted' } },
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
          '403': { description: 'Missing trip_update permission' },
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
          '403': { description: 'Missing trip_update permission' },
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
          '403': { description: 'Missing trip_start permission' },
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
          '403': { description: 'Missing trip_end permission' },
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
          '403': { description: 'Missing trip_cancel permission' },
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
          '403': { description: 'Missing trip_view permission' },
        },
      },
    },
  },
};
