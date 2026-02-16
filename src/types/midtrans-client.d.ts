declare module 'midtrans-client' {
  class Snap {
    constructor(options: { isProduction?: boolean; serverKey?: string; clientKey?: string });
    createTransaction(parameter: any): Promise<{ token: string; redirect_url: string }>;
    // Tambahin method lain kalau butuh, atau any aja
  }
  class CoreApi {
    // Kalau pakai Core
  }
  export = { Snap, CoreApi };
}