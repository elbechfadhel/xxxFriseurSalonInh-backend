export function normalizeToSlotStartUTC(input: string | Date): Date {
    const d = new Date(input);
    // Use UTC parts so DST / local tz don’t matter
    const Y = d.getUTCFullYear();
    const M = d.getUTCMonth();
    const D = d.getUTCDate();
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const normMin = m < 30 ? 0 : 30;
    return new Date(Date.UTC(Y, M, D, h, normMin, 0, 0));
}
