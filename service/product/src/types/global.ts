export interface ApiResponse<T> {
    statusCode: number;
    success: boolean;
    message: string;
    data: T;
    details?: string;
    errors?: any;
}

export interface Meta {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
}
export interface ApiResponseWithMeta<T> extends ApiResponse<T> {
    meta: Meta;
}
