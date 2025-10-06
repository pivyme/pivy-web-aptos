import { backendClient, ApiResponse } from './client';

export const cctpService = {
  // Future CCTP methods will be added here:
  // initiateCCTPTransfer: async (token: string, data: CCTPTransferRequest): Promise<ApiResponse<CCTPTransferResponse>> => {
  //   backendClient.setAuthToken(token);
  //   return backendClient.post<CCTPTransferResponse>('/cctp/transfer', data);
  // },

  // getCCTPTransferStatus: async (token: string, transferId: string): Promise<ApiResponse<CCTPTransferStatus>> => {
  //   backendClient.setAuthToken(token);
  //   return backendClient.get<CCTPTransferStatus>(`/cctp/transfer/${transferId}/status`);
  // },

  // getCCTPSupportedChains: async (): Promise<ApiResponse<CCTPChain[]>> => {
  //   return backendClient.get<CCTPChain[]>('/cctp/supported-chains');
  // },
}; 