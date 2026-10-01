/** The Worker URL. Override with VITE_API_BASE in apps/mobile/.env for a self hosted backend. */
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) || 'https://huli-api.olin-lagon.workers.dev';
