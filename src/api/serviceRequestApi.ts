// Minimal stubs to satisfy legacy imports after service-request removal
export interface ServiceRequest { _id: string }
export interface ServiceRequestCreateData {}
export interface ServiceRequestUpdateData {}
export interface FCSRUpdateData {}
export interface ServiceRequestQueryParams {}
export interface ServiceRequestSearchParams {}
export interface ServiceRequestStats {}
export interface ServiceRequestResponse { serviceRequests: ServiceRequest[]; pagination: any }
export interface ServiceRequestSearchResponse { serviceRequests: ServiceRequest[] }

export async function createServiceRequestApi(_: ServiceRequestCreateData): Promise<ServiceRequest> { throw new Error('Service requests disabled'); }
export async function getServiceRequestsApi(_: ServiceRequestQueryParams = {} as any): Promise<ServiceRequestResponse> { return { serviceRequests: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 } }; }
export async function getServiceRequestByIdApi(_: string): Promise<ServiceRequest> { throw new Error('Service requests disabled'); }
export async function updateServiceRequestApi(_: string, __: ServiceRequestUpdateData): Promise<ServiceRequest> { throw new Error('Service requests disabled'); }
export async function updateFCSRFieldsApi(_: string, __: FCSRUpdateData): Promise<ServiceRequest> { throw new Error('Service requests disabled'); }
export async function checkICSRPDFExistsApi(_: string): Promise<{ pdfUrl: string | null; exists: boolean }> { return { pdfUrl: null, exists: false }; }
export async function updateICSRURLApi(_: string, __: string): Promise<ServiceRequest> { throw new Error('Service requests disabled'); }
export async function checkFCSRPDFExistsApi(_: string): Promise<{ pdfUrl: string | null; exists: boolean }> { return { pdfUrl: null, exists: false }; }
export async function updateFCSRURLApi(_: string, __: string): Promise<ServiceRequest> { throw new Error('Service requests disabled'); }
export async function deleteServiceRequestApi(_: string): Promise<{ message: string }> { return { message: 'disabled' }; }
export async function searchServiceRequestsApi(_: ServiceRequestSearchParams): Promise<ServiceRequestSearchResponse> { return { serviceRequests: [] }; }
export async function getServiceRequestStatsApi(): Promise<ServiceRequestStats> { return {} as any }



