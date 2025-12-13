// config/supabaseStorage.ts
const SUPABASE_URL = process.env.SUPABASE_URL; // e.g. https://dtqijawvetarwuxzfhlc.supabase.co
const SUPABASE_BUCKET = "gallery";

export const getPublicImageUrl = (path: string) =>
    `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
