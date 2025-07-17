export const formatAuditDetails = (details: object): string => {
  return JSON.stringify(details, null, 2);
};