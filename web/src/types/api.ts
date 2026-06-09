export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errors?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
