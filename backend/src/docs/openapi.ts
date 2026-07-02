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
    { name: 'Vehicle Compliance' },
    { name: 'Compliance Documents' },
    { name: 'Compliance History' },
    { name: 'Finance' },
    { name: 'Finance Accounts' },
    { name: 'Finance Categories' },
    { name: 'Finance Vendors' },
    { name: 'Finance Customers' },
    { name: 'Finance Trip Billing' },
    { name: 'Finance Transactions' },
    { name: 'Finance Payments' },
    { name: 'Access Control' },
    { name: 'Profile Links' },
    { name: 'Driver Portal' },
    { name: 'Driver Submissions' },
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
          documentNumber: { type: 'string', nullable: true },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          originalFileName: { type: 'string' },
          storedFileName: { type: 'string' },
          mimeType: { type: 'string' },
          fileSizeBytes: { type: 'integer' },
          fileExtension: { type: 'string', nullable: true },
          storageProvider: { type: 'string' },
          storageKey: { type: 'string' },
          documentType: { type: 'string' },
          documentCategory: { type: 'string' },
          linkedEntityType: { type: 'string', nullable: true },
          linkedEntityId: { type: 'string', nullable: true },
          vehicleId: { type: 'string', nullable: true },
          driverId: { type: 'string', nullable: true },
          tripId: { type: 'string', nullable: true },
          customerId: { type: 'string', nullable: true },
          vendorId: { type: 'string', nullable: true },
          fuelEntryId: { type: 'string', nullable: true },
          issueDate: { type: 'string', format: 'date-time', nullable: true },
          expiryDate: { type: 'string', format: 'date-time', nullable: true },
          documentStatus: { type: 'string', enum: ['ACTIVE', 'ARCHIVED', 'DELETED'] },
          verificationStatus: { type: 'string', enum: ['PENDING', 'VERIFIED', 'REJECTED'] },
          tags: { type: 'array', items: { type: 'string' } },
          uploadedById: { type: 'string' },
          verifiedById: { type: 'string', nullable: true },
          verifiedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      DocumentUploadInput: {
        type: 'object',
        required: ['title', 'documentType', 'documentCategory'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          documentType: { type: 'string' },
          documentCategory: { type: 'string' },
          linkedEntityType: { type: 'string' },
          linkedEntityId: { type: 'string' },
          vehicleId: { type: 'string' },
          driverId: { type: 'string' },
          tripId: { type: 'string' },
          customerId: { type: 'string' },
          vendorId: { type: 'string' },
          issueDate: { type: 'string', format: 'date-time' },
          expiryDate: { type: 'string', format: 'date-time' },
          tags: { type: 'string' },
          fuelEntryId: { type: 'string', description: 'Optional fuel entry ID to link this document to a fuel entry' },
        },
      },
      DocumentUpdateInput: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          documentType: { type: 'string' },
          documentCategory: { type: 'string' },
          linkedEntityType: { type: 'string' },
          linkedEntityId: { type: 'string' },
          vehicleId: { type: 'string' },
          driverId: { type: 'string' },
          tripId: { type: 'string' },
          issueDate: { type: 'string', format: 'date-time' },
          expiryDate: { type: 'string', format: 'date-time' },
          tags: { type: 'string' },
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
        description: 'Filter by category, type, status, entity, and more.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'documentType', in: 'query', schema: { type: 'string' } },
          { name: 'documentCategory', in: 'query', schema: { type: 'string', enum: ['VEHICLE', 'DRIVER', 'TRIP', 'COMPLIANCE', 'FINANCE', 'MAINTENANCE', 'REPAIR', 'VENDOR', 'CUSTOMER', 'GENERAL'] } },
          { name: 'linkedEntityType', in: 'query', schema: { type: 'string' } },
          { name: 'vehicleId', in: 'query', schema: { type: 'string' } },
          { name: 'driverId', in: 'query', schema: { type: 'string' } },
          { name: 'tripId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] } },
          { name: 'verificationStatus', in: 'query', schema: { type: 'string', enum: ['PENDING', 'VERIFIED', 'REJECTED'] } },
          { name: 'expiringBefore', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'Paginated document list' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing documents_view permission' },
        },
      },
    },
    '/documents/upload': {
      post: {
        tags: ['Documents'],
        summary: 'Upload a document',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'title', 'documentType', 'documentCategory'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'PDF, JPEG, PNG, or WebP file (max 10MB)' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  documentType: { type: 'string' },
                  documentCategory: { type: 'string' },
                  linkedEntityType: { type: 'string' },
                  linkedEntityId: { type: 'string' },
                  vehicleId: { type: 'string' },
                  driverId: { type: 'string' },
                  tripId: { type: 'string' },
                  customerId: { type: 'string' },
                  vendorId: { type: 'string' },
                  issueDate: { type: 'string', format: 'date-time' },
                  expiryDate: { type: 'string', format: 'date-time' },
                  tags: { type: 'string', description: 'Comma-separated tags or JSON array' },
                  fuelEntryId: { type: 'string', description: 'Optional fuel entry ID to link this document to a fuel entry' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Document uploaded' },
          '400': { description: 'Validation error or invalid file type' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing documents_upload permission' },
        },
      },
    },
    '/documents/{id}': {
      get: {
        tags: ['Documents'],
        summary: 'Get document details',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Document details' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing documents_view permission' },
          '404': { description: 'Document not found' },
        },
      },
      put: {
        tags: ['Documents'],
        summary: 'Update document metadata',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DocumentUpdateInput' } } },
        },
        responses: {
          '200': { description: 'Document updated' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing documents_update permission' },
          '404': { description: 'Document not found' },
        },
      },
      delete: {
        tags: ['Documents'],
        summary: 'Soft delete document',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Document deleted' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing documents_delete permission' },
          '404': { description: 'Document not found' },
        },
      },
    },
    '/documents/{id}/view': {
      get: {
        tags: ['Documents'],
        summary: 'View document',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Document content or signed URL' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing documents_download permission' },
          '404': { description: 'Document not found' },
        },
      },
    },
    '/documents/{id}/download': {
      get: {
        tags: ['Documents'],
        summary: 'Download document',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Document download URL or content' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing documents_download permission' },
          '404': { description: 'Document not found' },
        },
      },
    },
    '/documents/{id}/verify': {
      post: {
        tags: ['Documents'],
        summary: 'Verify or reject document',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['verificationStatus'],
                properties: {
                  verificationStatus: { type: 'string', enum: ['VERIFIED', 'REJECTED'] },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Document verified' },
          '400': { description: 'Invalid status' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing documents_verify permission' },
          '404': { description: 'Document not found' },
        },
      },
    },
    '/documents/{id}/archive': {
      post: {
        tags: ['Documents'],
        summary: 'Archive document',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Document archived' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Missing documents_archive permission' },
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
      post: { tags: ['Fuel'], summary: 'Create fuel entry', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['vehicleId', 'fuelDate', 'fuelType', 'entryMode'], properties: { vehicleId: { type: 'string' }, tripId: { type: 'string' }, driverId: { type: 'string' }, fuelDate: { type: 'string', format: 'date-time' }, odometerReading: { type: 'integer', minimum: 0 }, fuelType: { type: 'string' }, entryMode: { type: 'string', enum: ['QUICK_AMOUNT', 'FULL_DETAILS', 'RECEIPT_ASSISTED'], description: 'QUICK_AMOUNT: only totalAmount required. FULL_DETAILS: quantityLiters and pricePerLiter required, totalAmount auto-calculated. RECEIPT_ASSISTED: OCR-extracted values.' }, quantityLiters: { type: 'number', exclusiveMinimum: 0, nullable: true, description: 'Required when entryMode is FULL_DETAILS. Omitted or null for QUICK_AMOUNT.' }, pricePerLiter: { type: 'number', exclusiveMinimum: 0, nullable: true, description: 'Required when entryMode is FULL_DETAILS. Omitted or null for QUICK_AMOUNT.' }, totalAmount: { type: 'number', exclusiveMinimum: 0, description: 'Required when entryMode is QUICK_AMOUNT. Auto-calculated when entryMode is FULL_DETAILS.' }, paymentMode: { type: 'string', enum: ['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'CREDIT', 'OTHER'], description: 'Payment method used for the fuel purchase.' }, stationName: { type: 'string' }, receiptNumber: { type: 'string' }, notes: { type: 'string' } } } } } }, responses: { '201': { description: 'Fuel entry created' }, '400': { description: 'Validation error (e.g. totalAmount=0 for QUICK_AMOUNT)' } } },
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
    '/fuel/extract-receipt': {
      post: {
        tags: ['Fuel'],
        summary: 'Extract data from fuel receipt',
        description: 'OCR extraction of fuel receipt data from a stored document. Accepts the storage key and MIME type of the receipt image/PDF.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['storageKey', 'mimeType'],
                properties: {
                  storageKey: { type: 'string', description: 'Storage key of the uploaded receipt document' },
                  mimeType: { type: 'string', description: 'MIME type of the receipt file (e.g. application/pdf, image/jpeg)' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Extraction results with parsed fields' },
          '400': { description: 'Invalid storage key or extraction failed' },
        },
      },
    },
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
    '/compliance/dashboard': { get: { tags: ['Vehicle Compliance'], summary: 'Compliance dashboard counts', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Dashboard summary' } } } },
    '/compliance/alerts/expiring': { get: { tags: ['Vehicle Compliance'], summary: 'List documents expiring soon', security: [{ bearerAuth: [] }], parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 30 } }], responses: { '200': { description: 'Expiring documents' } } } },
    '/compliance/alerts/expired': { get: { tags: ['Vehicle Compliance'], summary: 'List expired documents', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Expired documents' } } } },
    '/vehicle/{vehicleId}/compliance/registration': {
      get: { tags: ['Vehicle Compliance'], summary: 'Get vehicle registration', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Registration detail' } } },
      put: { tags: ['Vehicle Compliance'], summary: 'Upsert vehicle registration', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Registration detail upserted' } } },
    },
    '/vehicle/{vehicleId}/compliance/insurance': {
      get: { tags: ['Vehicle Compliance'], summary: 'List insurance records', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Insurance records' } } },
      post: { tags: ['Vehicle Compliance'], summary: 'Create insurance record', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'Insurance created' } } },
    },
    '/vehicle/{vehicleId}/compliance/insurance/{id}': {
      get: { tags: ['Vehicle Compliance'], summary: 'Get insurance record', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Insurance record' } } },
      put: { tags: ['Vehicle Compliance'], summary: 'Update insurance record', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Insurance updated' } } },
    },
    '/vehicle/{vehicleId}/compliance/permits': {
      get: { tags: ['Vehicle Compliance'], summary: 'List permits', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Permit records' } } },
      post: { tags: ['Vehicle Compliance'], summary: 'Create permit', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'Permit created' } } },
    },
    '/vehicle/{vehicleId}/compliance/permits/{id}': {
      get: { tags: ['Vehicle Compliance'], summary: 'Get permit', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Permit record' } } },
      put: { tags: ['Vehicle Compliance'], summary: 'Update permit', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Permit updated' } } },
    },
    '/vehicle/{vehicleId}/compliance/fitness': {
      get: { tags: ['Vehicle Compliance'], summary: 'List fitness records', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Fitness records' } } },
      post: { tags: ['Vehicle Compliance'], summary: 'Create fitness record', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'Fitness created' } } },
    },
    '/vehicle/{vehicleId}/compliance/fitness/{id}': {
      get: { tags: ['Vehicle Compliance'], summary: 'Get fitness record', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Fitness record' } } },
      put: { tags: ['Vehicle Compliance'], summary: 'Update fitness record', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Fitness updated' } } },
    },
    '/vehicle/{vehicleId}/compliance/puc': {
      get: { tags: ['Vehicle Compliance'], summary: 'List PUC records', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'PUC records' } } },
      post: { tags: ['Vehicle Compliance'], summary: 'Create PUC record', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'PUC created' } } },
    },
    '/vehicle/{vehicleId}/compliance/puc/{id}': {
      get: { tags: ['Vehicle Compliance'], summary: 'Get PUC record', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'PUC record' } } },
      put: { tags: ['Vehicle Compliance'], summary: 'Update PUC record', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'PUC updated' } } },
    },
    '/vehicle/{vehicleId}/compliance/road-tax': {
      get: { tags: ['Vehicle Compliance'], summary: 'List road tax records', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Road tax records' } } },
      post: { tags: ['Vehicle Compliance'], summary: 'Create road tax record', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'Road tax created' } } },
    },
    '/vehicle/{vehicleId}/compliance/road-tax/{id}': {
      get: { tags: ['Vehicle Compliance'], summary: 'Get road tax record', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Road tax record' } } },
      put: { tags: ['Vehicle Compliance'], summary: 'Update road tax record', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Road tax updated' } } },
    },
    '/vehicle/{vehicleId}/compliance/fastag': {
      get: { tags: ['Vehicle Compliance'], summary: 'Get FASTag details', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'FASTag details' } } },
      put: { tags: ['Vehicle Compliance'], summary: 'Upsert FASTag details', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'FASTag upserted' } } },
    },
    '/vehicle/{vehicleId}/compliance/gps-device': {
      get: { tags: ['Vehicle Compliance'], summary: 'Get GPS device details', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'GPS device details' } } },
      put: { tags: ['Vehicle Compliance'], summary: 'Upsert GPS device details', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'GPS device upserted' } } },
    },
    '/compliance/documents': {
      get: { tags: ['Compliance Documents'], summary: 'List compliance documents', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'query', schema: { type: 'string' } }, { name: 'complianceType', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'expiringWithinDays', in: 'query', schema: { type: 'integer' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { '200': { description: 'Paginated compliance documents' } } },
    },
    '/compliance/documents/{id}': {
      get: { tags: ['Compliance Documents'], summary: 'Get compliance document', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Compliance document' } } },
      put: { tags: ['Compliance Documents'], summary: 'Update compliance document', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Compliance document updated' } } },
    },
    '/vehicle/{vehicleId}/compliance/documents': {
      post: { tags: ['Compliance Documents'], summary: 'Create compliance document', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'Compliance document created' } } },
    },
    '/compliance/documents/{id}/verify': {
      put: { tags: ['Compliance Documents'], summary: 'Verify or reject compliance document', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Document verified or rejected' } } },
    },
    '/compliance/documents/{id}/renew': {
      put: { tags: ['Compliance Documents'], summary: 'Renew compliance document validity', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['validFrom', 'validTo'], properties: { validFrom: { type: 'string', format: 'date-time' }, validTo: { type: 'string', format: 'date-time' }, documentNumber: { type: 'string' }, notes: { type: 'string' } } } } } }, responses: { '200': { description: 'Document renewed' } } },
    },
    '/vehicle/{vehicleId}/compliance/history': {
      get: { tags: ['Compliance History'], summary: 'List compliance history for vehicle', security: [{ bearerAuth: [] }], parameters: [{ name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'complianceType', in: 'query', schema: { type: 'string' } }, { name: 'action', in: 'query', schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { '200': { description: 'Paginated compliance history' } } },
    },
    '/finance/dashboard-summary': {
      get: { tags: ['Finance'], summary: 'Get finance dashboard summary', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Dashboard summary with income, expenses, pending/overdue payments' } } },
    },
    '/finance/pnl': {
      get: { tags: ['Finance'], summary: 'Get P&L report', security: [{ bearerAuth: [] }], parameters: [{ name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'vehicleId', in: 'query', schema: { type: 'string' } }, { name: 'driverId', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'P&L summary with category breakdown' } } },
    },
    '/finance/accounts': {
      get: { tags: ['Finance Accounts'], summary: 'List finance accounts', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'type', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Paginated finance accounts' } } },
      post: { tags: ['Finance Accounts'], summary: 'Create finance account', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'type'], properties: { name: { type: 'string' }, type: { type: 'string', enum: ['CASH', 'BANK', 'WALLET', 'CREDIT', 'OTHER'] }, accountNumberMasked: { type: 'string' }, bankName: { type: 'string' }, openingBalance: { type: 'number' } } } } } }, responses: { '201': { description: 'Account created' } } },
    },
    '/finance/accounts/{id}': {
      get: { tags: ['Finance Accounts'], summary: 'Get finance account', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Finance account' } } },
      put: { tags: ['Finance Accounts'], summary: 'Update finance account', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Account updated' } } },
      delete: { tags: ['Finance Accounts'], summary: 'Delete finance account', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Account deleted' } } },
    },
    '/finance/categories': {
      get: { tags: ['Finance Categories'], summary: 'List finance categories', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }, { name: 'type', in: 'query', schema: { type: 'string' } }, { name: 'module', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Paginated finance categories' } } },
      post: { tags: ['Finance Categories'], summary: 'Create finance category', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'type', 'module'], properties: { name: { type: 'string' }, type: { type: 'string', enum: ['INCOME', 'EXPENSE'] }, module: { type: 'string', enum: ['TRIP', 'FUEL', 'EXPENSE', 'MAINTENANCE', 'REPAIR', 'COMPLIANCE', 'DRIVER', 'GENERAL'] } } } } } }, responses: { '201': { description: 'Category created' } } },
    },
    '/finance/categories/{id}': {
      get: { tags: ['Finance Categories'], summary: 'Get finance category', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Finance category' } } },
      delete: { tags: ['Finance Categories'], summary: 'Delete finance category', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Category deleted' } } },
    },
    '/finance/vendors': {
      get: { tags: ['Finance Vendors'], summary: 'List vendors', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }, { name: 'search', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Paginated vendors' } } },
      post: { tags: ['Finance Vendors'], summary: 'Create vendor', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'vendorType'], properties: { name: { type: 'string' }, vendorType: { type: 'string', enum: ['FUEL_STATION', 'WORKSHOP', 'INSURANCE', 'PERMIT_AGENT', 'RTO_AGENT', 'GPS_VENDOR', 'GENERAL'] }, phone: { type: 'string' }, email: { type: 'string' }, gstin: { type: 'string' }, address: { type: 'string' } } } } } }, responses: { '201': { description: 'Vendor created' } } },
    },
    '/finance/vendors/{id}': {
      get: { tags: ['Finance Vendors'], summary: 'Get vendor', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Vendor' } } },
      put: { tags: ['Finance Vendors'], summary: 'Update vendor', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Vendor updated' } } },
      delete: { tags: ['Finance Vendors'], summary: 'Delete vendor', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Vendor deleted' } } },
    },
    '/finance/customers': {
      get: { tags: ['Finance Customers'], summary: 'List customers', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }, { name: 'search', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Paginated customers' } } },
      post: { tags: ['Finance Customers'], summary: 'Create customer', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' }, gstin: { type: 'string' }, billingAddress: { type: 'string' }, shippingAddress: { type: 'string' } } } } } }, responses: { '201': { description: 'Customer created' } } },
    },
    '/finance/customers/{id}': {
      get: { tags: ['Finance Customers'], summary: 'Get customer', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Customer' } } },
      put: { tags: ['Finance Customers'], summary: 'Update customer', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Customer updated' } } },
      delete: { tags: ['Finance Customers'], summary: 'Delete customer', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Customer deleted' } } },
    },
    '/finance/trip-billings': {
      get: { tags: ['Finance Trip Billing'], summary: 'List trip billings', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }, { name: 'paymentStatus', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Paginated trip billings' } } },
      post: { tags: ['Finance Trip Billing'], summary: 'Create trip billing', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['tripId', 'invoiceDate'], properties: { tripId: { type: 'string' }, customerId: { type: 'string' }, invoiceNumber: { type: 'string' }, invoiceDate: { type: 'string', format: 'date-time' }, billingAmount: { type: 'number' }, taxAmount: { type: 'number' }, discountAmount: { type: 'number' }, dueDate: { type: 'string', format: 'date-time' }, notes: { type: 'string' } } } } } }, responses: { '201': { description: 'Trip billing created' } } },
    },
    '/finance/trip-billings/{id}': {
      get: { tags: ['Finance Trip Billing'], summary: 'Get trip billing', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Trip billing' } } },
      put: { tags: ['Finance Trip Billing'], summary: 'Update trip billing', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Trip billing updated' } } },
      delete: { tags: ['Finance Trip Billing'], summary: 'Delete trip billing', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Trip billing deleted' } } },
    },
    '/finance/transactions': {
      get: { tags: ['Finance Transactions'], summary: 'List finance transactions', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }, { name: 'transactionType', in: 'query', schema: { type: 'string' } }, { name: 'paymentStatus', in: 'query', schema: { type: 'string' } }, { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } }], responses: { '200': { description: 'Paginated transactions' } } },
      post: { tags: ['Finance Transactions'], summary: 'Create finance transaction', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['transactionType', 'sourceModule', 'amount', 'transactionDate', 'paymentMode'], properties: { transactionType: { type: 'string', enum: ['INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT'] }, sourceModule: { type: 'string', enum: ['TRIP', 'FUEL', 'EXPENSE', 'MAINTENANCE', 'REPAIR', 'COMPLIANCE', 'DRIVER', 'MANUAL'] }, vehicleId: { type: 'string' }, tripId: { type: 'string' }, driverId: { type: 'string' }, vendorId: { type: 'string' }, customerId: { type: 'string' }, accountId: { type: 'string' }, categoryId: { type: 'string' }, amount: { type: 'number' }, taxAmount: { type: 'number' }, transactionDate: { type: 'string', format: 'date-time' }, paymentMode: { type: 'string', enum: ['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'CREDIT', 'OTHER'] }, referenceNumber: { type: 'string' }, description: { type: 'string' } } } } } }, responses: { '201': { description: 'Transaction created' } } },
    },
    '/finance/transactions/{id}': {
      get: { tags: ['Finance Transactions'], summary: 'Get finance transaction', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Transaction' } } },
      delete: { tags: ['Finance Transactions'], summary: 'Delete finance transaction', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Transaction deleted' } } },
    },
    '/finance/payments': {
      get: { tags: ['Finance Payments'], summary: 'List payments', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { '200': { description: 'Paginated payments' } } },
      post: { tags: ['Finance Payments'], summary: 'Create payment', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount', 'paymentDate', 'paymentMode'], properties: { transactionId: { type: 'string' }, tripBillingId: { type: 'string' }, accountId: { type: 'string' }, vendorId: { type: 'string' }, customerId: { type: 'string' }, amount: { type: 'number' }, paymentDate: { type: 'string', format: 'date-time' }, paymentMode: { type: 'string', enum: ['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'CREDIT', 'OTHER'] }, referenceNumber: { type: 'string' }, notes: { type: 'string' } } } } } }, responses: { '201': { description: 'Payment created' } } },
    },
    '/finance/payments/{id}': {
      get: { tags: ['Finance Payments'], summary: 'Get payment', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Payment' } } },
      delete: { tags: ['Finance Payments'], summary: 'Delete payment', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Payment deleted' } } },
    },
    // ─── Access Control ───
    '/auth/effective-permissions': {
      get: { tags: ['Auth'], summary: 'Get effective permissions for current user', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Effective permissions breakdown (role, allowed, denied, effective)' } } },
    },
    '/access/me/effective-permissions': {
      get: { tags: ['Access Control'], summary: 'Get my effective permissions (self)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Effective permissions for current user' } } },
    },
    '/access/me/data-scopes': {
      get: { tags: ['Access Control'], summary: 'Get my data scopes (self)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Data scopes for current user' } } },
    },
    '/access/me/activity': {
      get: { tags: ['Access Control'], summary: 'Get my activity (self)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Activity logs for current user' } } },
    },
    '/access/me/summary': {
      get: { tags: ['Access Control'], summary: 'Get my full access summary (self)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Full access summary including user, role, permissions, scopes, activity' } } },
    },
    '/access/users/summary': {
      get: { tags: ['Access Control'], summary: 'Get access summary for all users', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Array of user access summaries with counts' } } },
    },
    '/access/users/{id}/effective-permissions': {
      get: { tags: ['Access Control'], summary: 'Get effective permissions for a user', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Effective permissions breakdown' } } },
    },
    '/access/users/{id}/permission-overrides': {
      get: { tags: ['Access Control'], summary: 'List permission overrides for a user', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'List of permission overrides' } } },
      put: { tags: ['Access Control'], summary: 'Set permission override (ALLOW/DENY)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['effect'], properties: { permissionKey: { type: 'string', description: 'Permission key (preferred)' }, permissionId: { type: 'string', description: 'Permission ID (backward compat)' }, effect: { type: 'string', enum: ['ALLOW', 'DENY'] }, reason: { type: 'string' }, expiresAt: { type: 'string', format: 'date-time' } } } } } }, responses: { '200': { description: 'Permission override set' } } },
    },
    '/access/users/{id}/permission-overrides/{permissionId}': {
      delete: { tags: ['Access Control'], summary: 'Remove permission override', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'permissionId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Permission override removed' } } },
    },
    '/access/users/{id}/data-scopes': {
      get: { tags: ['Access Control'], summary: 'List data scopes for a user', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'List of data scopes' } } },
      put: { tags: ['Access Control'], summary: 'Grant data scope to user', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['scopeType', 'accessLevel'], properties: { scopeType: { type: 'string', enum: ['OWN', 'USER', 'DRIVER', 'VEHICLE', 'TRIP', 'ASSET', 'CUSTOMER', 'VENDOR', 'BRANCH', 'DEPARTMENT', 'FINANCE', 'GLOBAL'] }, scopeId: { type: 'string', description: 'Required for non-GLOBAL/OWN scopes' }, accessLevel: { type: 'string', enum: ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE'] }, reason: { type: 'string' }, expiresAt: { type: 'string', format: 'date-time' } } } } } }, responses: { '200': { description: 'Data scope granted' } } },
    },
    '/access/users/{id}/data-scopes/{scopeId}': {
      delete: { tags: ['Access Control'], summary: 'Remove data scope', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'scopeId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Data scope removed' } } },
    },
    '/access/users/{id}/activity': {
      get: { tags: ['Access Control'], summary: 'Get user activity timeline', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Activity logs for the specified user' } } },
    },
    // ─── Access Control Aliases (under /users) ───
    '/users/{id}/effective-permissions': {
      get: { tags: ['Access Control'], summary: 'Get effective permissions for a user (alias)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Effective permissions breakdown' } } },
    },
    '/users/{id}/permission-overrides': {
      get: { tags: ['Access Control'], summary: 'List permission overrides for a user (alias)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'List of permission overrides' } } },
      put: { tags: ['Access Control'], summary: 'Set permission override (alias)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['effect'], properties: { permissionKey: { type: 'string' }, permissionId: { type: 'string' }, effect: { type: 'string', enum: ['ALLOW', 'DENY'] }, reason: { type: 'string' }, expiresAt: { type: 'string', format: 'date-time' } } } } } }, responses: { '200': { description: 'Permission override set' } } },
    },
    '/users/{id}/permission-overrides/{permissionId}': {
      delete: { tags: ['Access Control'], summary: 'Remove permission override (alias)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'permissionId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Permission override removed' } } },
    },
    '/users/{id}/data-scopes': {
      get: { tags: ['Access Control'], summary: 'List data scopes for a user (alias)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'List of data scopes' } } },
      put: { tags: ['Access Control'], summary: 'Grant data scope to user (alias)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['scopeType', 'accessLevel'], properties: { scopeType: { type: 'string', enum: ['OWN', 'USER', 'DRIVER', 'VEHICLE', 'TRIP', 'ASSET', 'CUSTOMER', 'VENDOR', 'BRANCH', 'DEPARTMENT', 'FINANCE', 'GLOBAL'] }, scopeId: { type: 'string' }, accessLevel: { type: 'string', enum: ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE'] }, reason: { type: 'string' }, expiresAt: { type: 'string', format: 'date-time' } } } } } }, responses: { '200': { description: 'Data scope granted' } } },
    },
    '/users/{id}/data-scopes/{scopeId}': {
      delete: { tags: ['Access Control'], summary: 'Remove data scope (alias)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'scopeId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Data scope removed' } } },
    },
    '/users/{id}/activity': {
      get: { tags: ['Access Control'], summary: 'Get user activity timeline (alias)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Activity logs for the specified user' } } },
    },

    // ─── Profile Links ───
    '/user-profile-links': {
      get: { tags: ['Profile Links'], summary: 'List all profile links (admin)', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }, { name: 'profileType', in: 'query', schema: { type: 'string', enum: ['DRIVER', 'MECHANIC', 'EMPLOYEE', 'FINANCE', 'COLLECTOR', 'VENDOR_CONTACT', 'CUSTOMER_CONTACT'] } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'REVOKED'] } }, { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }], responses: { '200': { description: 'List of profile links' } } },
      post: { tags: ['Profile Links'], summary: 'Create a profile link (admin, requires profile_link_create + scope validation)', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['userId', 'profileType', 'profileId'], properties: { userId: { type: 'string' }, profileType: { type: 'string', enum: ['DRIVER', 'MECHANIC', 'EMPLOYEE', 'FINANCE', 'COLLECTOR', 'VENDOR_CONTACT', 'CUSTOMER_CONTACT'] }, profileId: { type: 'string' }, isPrimary: { type: 'boolean' }, metadata: { type: 'object' } } } } } }, responses: { '201': { description: 'Profile link created' }, '403': { description: 'Insufficient scope or permission. For DRIVER links: requires DRIVER UPDATE/MANAGE scope on target driver, super_admin, or GLOBAL/MANAGE scope. Non-DRIVER types restricted to super_admin.' } } },
    },
    '/user-profile-links/{id}': {
      get: { tags: ['Profile Links'], summary: 'Get profile link by ID', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Profile link details' } } },
      patch: { tags: ['Profile Links'], summary: 'Update profile link', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { isPrimary: { type: 'boolean' }, status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'REVOKED'] }, metadata: { type: 'object' } } } } } }, responses: { '200': { description: 'Profile link updated' } } },
      delete: { tags: ['Profile Links'], summary: 'Delete profile link', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Profile link deleted' } } },
    },
    '/user-profile-links/{id}/revoke': {
      patch: { tags: ['Profile Links'], summary: 'Revoke profile link', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Profile link revoked' } } },
    },
    '/user-profile-links/user/{userId}': {
      get: { tags: ['Profile Links'], summary: 'Get profile links for a user', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'profileType', in: 'query', schema: { type: 'string', enum: ['DRIVER', 'MECHANIC', 'EMPLOYEE', 'FINANCE', 'COLLECTOR', 'VENDOR_CONTACT', 'CUSTOMER_CONTACT'] } }], responses: { '200': { description: 'List of profile links for user' } } },
    },
    '/me/profile-links': {
      get: { tags: ['Profile Links'], summary: 'Get current user profile links (read-only)', security: [{ bearerAuth: [] }], parameters: [{ name: 'profileType', in: 'query', schema: { type: 'string', enum: ['DRIVER', 'MECHANIC', 'EMPLOYEE', 'FINANCE', 'COLLECTOR', 'VENDOR_CONTACT', 'CUSTOMER_CONTACT'] } }], responses: { '200': { description: 'Current user profile links' } } },
    },
    '/users/{userId}/profile-links': {
      get: { tags: ['Profile Links'], summary: 'Get profile links for a user (admin, requires profile_link_view)', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'profileType', in: 'query', schema: { type: 'string', enum: ['DRIVER', 'MECHANIC', 'EMPLOYEE', 'FINANCE', 'COLLECTOR', 'VENDOR_CONTACT', 'CUSTOMER_CONTACT'] } }], responses: { '200': { description: 'List of profile links for user' } } },
      post: { tags: ['Profile Links'], summary: 'Create profile link for user (admin, requires profile_link_create + DRIVER scope)', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['profileType', 'profileId'], properties: { profileType: { type: 'string', enum: ['DRIVER', 'MECHANIC', 'EMPLOYEE', 'FINANCE', 'COLLECTOR', 'VENDOR_CONTACT', 'CUSTOMER_CONTACT'] }, profileId: { type: 'string' }, isPrimary: { type: 'boolean' }, metadata: { type: 'object' } } } } } }, responses: { '201': { description: 'Profile link created' }, '403': { description: 'Insufficient scope or permission' } } },
    },

    // ─── Driver Portal (data scoped by active UserProfileLink, read-only) ───
    '/me/driver-profile': {
      get: { tags: ['Driver Portal'], summary: 'Get linked driver profile (requires active DRIVER UserProfileLink)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Driver profile for active linked driver' }, '404': { description: 'No linked driver profile or link revoked' } } },
    },
    '/me/driver-trips': {
      get: { tags: ['Driver Portal'], summary: 'Get trips for linked driver (requires active DRIVER UserProfileLink)', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }], responses: { '200': { description: 'Paginated trips for linked driver' } } },
    },
    '/me/driver-vehicles': {
      get: { tags: ['Driver Portal'], summary: 'Get vehicles for linked driver (requires active DRIVER UserProfileLink)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Vehicles associated with linked driver' } } },
    },
    '/me/driver-documents': {
      get: { tags: ['Driver Portal'], summary: 'Get documents for linked driver (requires active DRIVER UserProfileLink)', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }], responses: { '200': { description: 'Paginated documents for linked driver' } } },
    },
    '/me/driver-fuel': {
      get: { tags: ['Driver Portal'], summary: 'Get fuel entries for linked driver (requires active DRIVER UserProfileLink)', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }], responses: { '200': { description: 'Paginated fuel entries for linked driver' } } },
    },
    '/me/driver-expenses': {
      get: { tags: ['Driver Portal'], summary: 'Get expenses for linked driver (requires active DRIVER UserProfileLink)', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }], responses: { '200': { description: 'Paginated expenses for linked driver' } } },
    },

    // ─── Driver Submission Review (admin/manager review workflow) ───
    '/driver-submissions': {
      get: { tags: ['Driver Submissions'], summary: 'List all driver submissions (requires driver_submission_view)', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }, { name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'driverId', in: 'query', schema: { type: 'string' } }, { name: 'vehicleId', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Aggregated submissions by type' } } },
    },
    '/driver-submissions/fuel': {
      get: { tags: ['Driver Submissions'], summary: 'List fuel submissions (requires driver_submission_view)', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES'] } }], responses: { '200': { description: 'Paginated fuel submissions' } } },
    },
    '/driver-submissions/fuel/{id}/approve': {
      patch: { tags: ['Driver Submissions'], summary: 'Approve fuel submission (requires driver_fuel_approve)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Fuel submission approved' }, '403': { description: 'Insufficient permission or out of scope' } } },
    },
    '/driver-submissions/fuel/{id}/reject': {
      patch: { tags: ['Driver Submissions'], summary: 'Reject fuel submission (requires driver_submission_review)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Fuel submission rejected' } } },
    },
    '/driver-submissions/fuel/{id}/request-changes': {
      patch: { tags: ['Driver Submissions'], summary: 'Request changes on fuel submission (requires driver_submission_review)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Changes requested' } } },
    },
    '/driver-submissions/expenses': {
      get: { tags: ['Driver Submissions'], summary: 'List expense submissions (requires driver_submission_view)', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Paginated expense submissions' } } },
    },
    '/driver-submissions/expenses/{id}/approve': {
      patch: { tags: ['Driver Submissions'], summary: 'Approve expense submission (requires driver_expense_approve)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Expense submission approved' } } },
    },
    '/driver-submissions/expenses/{id}/reject': {
      patch: { tags: ['Driver Submissions'], summary: 'Reject expense submission (requires driver_submission_review)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Expense submission rejected' } } },
    },
    '/driver-submissions/expenses/{id}/request-changes': {
      patch: { tags: ['Driver Submissions'], summary: 'Request changes on expense (requires driver_submission_review)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Changes requested' } } },
    },
    '/driver-submissions/documents': {
      get: { tags: ['Driver Submissions'], summary: 'List document submissions (requires driver_submission_view)', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Paginated document submissions' } } },
    },
    '/driver-submissions/documents/{id}/verify': {
      patch: { tags: ['Driver Submissions'], summary: 'Verify document (requires driver_document_verify)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Document verified' } } },
    },
    '/driver-submissions/documents/{id}/reject': {
      patch: { tags: ['Driver Submissions'], summary: 'Reject document (requires driver_submission_review)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Document rejected' } } },
    },
    '/driver-submissions/documents/{id}/request-changes': {
      patch: { tags: ['Driver Submissions'], summary: 'Request changes on document (requires driver_submission_review)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Changes requested' } } },
    },
    '/driver-submissions/issues': {
      get: { tags: ['Driver Submissions'], summary: 'List vehicle issue submissions (requires driver_submission_view)', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Paginated issue submissions' } } },
    },
    '/driver-submissions/issues/{id}/acknowledge': {
      patch: { tags: ['Driver Submissions'], summary: 'Acknowledge vehicle issue (requires driver_issue_review)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Issue acknowledged' } } },
    },
    '/driver-submissions/issues/{id}/resolve': {
      patch: { tags: ['Driver Submissions'], summary: 'Resolve vehicle issue (requires driver_issue_review)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Issue resolved' } } },
    },
    '/driver-submissions/issues/{id}/reject': {
      patch: { tags: ['Driver Submissions'], summary: 'Reject vehicle issue (requires driver_submission_review)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Issue rejected' } } },
    },
    '/driver-submissions/inspections': {
      get: { tags: ['Driver Submissions'], summary: 'List inspection submissions (requires driver_submission_view)', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Paginated inspection submissions' } } },
    },
    '/driver-submissions/inspections/{id}/review': {
      patch: { tags: ['Driver Submissions'], summary: 'Review inspection (requires driver_inspection_review)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Inspection reviewed' } } },
    },
    '/driver-submissions/inspections/{id}/reject': {
      patch: { tags: ['Driver Submissions'], summary: 'Reject inspection (requires driver_submission_review)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Inspection rejected' } } },
    },
    '/driver-submissions/inspections/{id}/request-changes': {
      patch: { tags: ['Driver Submissions'], summary: 'Request changes on inspection (requires driver_submission_review)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Changes requested' } } },
    },
  },
};
