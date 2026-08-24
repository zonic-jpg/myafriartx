export const ID_TYPES = ["nin", "passport", "drivers_licence", "voters_card"] as const;
export type IdType = (typeof ID_TYPES)[number];
