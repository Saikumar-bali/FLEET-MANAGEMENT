export type RequestUser = {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
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
};
