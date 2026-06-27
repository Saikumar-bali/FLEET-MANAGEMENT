export type RequestUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  mobile: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  userDriverId: string | null;
  linkedDriver?: {
    id: string;
    name: string;
    mobile: string;
    licenseNumber: string;
    status: string;
  } | null;
  role: {
    id: string;
    name: string;
    key: string;
    status: 'ACTIVE' | 'INACTIVE';
  };
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
  roleKey: string;
  userDriverId: string | null;
};
